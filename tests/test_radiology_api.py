from decimal import Decimal
import json

from django.contrib.auth import get_user_model
from django.contrib.auth.models import Group
from django.core.exceptions import ValidationError
from django.utils import timezone
import pytest

from apps.clinical.models.patient import Patient
from apps.medical_records.models.medical_record_entry import MedicalRecordEntry
from apps.medical_records.models.prescription_item import PrescriptionItem
from apps.pharmacy.models.product import Product
from apps.radiology.models import (
    ImagingEquipment,
    ImagingFile,
    ImagingProtocol,
    ImagingReport,
    ImagingSeries,
    ImagingStudy,
    PacsIntegrationEvent,
)
from apps.tenants.models.tenant import Tenant


def _response_data(response):
    if hasattr(response, "data"):
        return response.data
    return json.loads(response.content)


def _items(response):
    payload = _response_data(response)
    if isinstance(payload, dict) and isinstance(payload.get("results"), list):
        return payload["results"]
    if isinstance(payload, list):
        return payload
    return []


def _tenant():
    return Tenant.objects.create(
        identifier="tn-radiology",
        name="Tenant Radiologia",
        domain="tenant-radiology.local",
        active=True,
    )


def _patient(tenant, name="Paciente Radiologia"):
    return Patient.objects.create(
        tenant=tenant,
        name=name,
        gender="Feminino",
        address_street="Rua Imagem",
    )


def _prescription_item(tenant, patient):
    record = MedicalRecordEntry.objects.create(
        tenant=tenant,
        patient=patient,
        symptoms="Dor torácica",
        diagnosis="Investigar pneumonia",
        prescription="Radiografia de tórax",
    )
    product = Product.objects.create(
        tenant=tenant,
        name="Radiografia de tórax",
        type=Product.ProductType.MEDICAMENTO,
    )
    return PrescriptionItem.objects.create(
        record=record,
        medication=product,
        dosage_value=Decimal("1.00"),
        dosage_unit="MG",
        dose_count=1,
        notes="Exame de imagem solicitado",
    )


def _authenticate_admin(tenant, api_client):
    user_model = get_user_model()
    user = user_model.objects.create_user(
        username="admin-radiology",
        email="admin-radiology@example.com",
        password="testpass123",
        tenant=tenant,
    )
    group, _ = Group.objects.get_or_create(name="Administrador")
    user.groups.add(group)
    api_client.defaults["HTTP_HOST"] = tenant.domain
    api_client.force_authenticate(user=user)
    return user


@pytest.mark.django_db
def test_radiology_models_manage_imaging_workflow_and_pacs_metadata():
    tenant = _tenant()
    patient = _patient(tenant)
    prescription_item = _prescription_item(tenant, patient)
    equipment = ImagingEquipment.objects.create(
        tenant=tenant,
        code="CT-01",
        name="Tomógrafo 64 canais",
        modality="CT",
        ae_title="SUBSTRATO_CT",
        location="Sala TC",
    )
    protocol = ImagingProtocol.objects.create(
        tenant=tenant,
        code="TC-TORAX",
        name="TC do tórax",
        modality="CT",
        body_region="CHEST",
        contrast_required=True,
        default_report_template="Técnica, achados e conclusão.",
    )
    study = ImagingStudy.objects.create(
        patient=patient,
        medical_record=prescription_item.record,
        prescription_item=prescription_item,
        protocol=protocol,
        equipment=equipment,
        accession_number="ACC-001",
        study_instance_uid="1.2.840.001",
        status="ACQUIRED",
        priority="URGENT",
        clinical_indication="Dor torácica e dispneia",
    )
    series = ImagingSeries.objects.create(
        study=study,
        series_instance_uid="1.2.840.001.1",
        series_number=1,
        description="Axial tórax",
        image_count=120,
        storage_uri="pacs://study/ACC-001/series/1",
    )
    image_file = ImagingFile.objects.create(
        study=study,
        series=series,
        file_type="DICOM",
        sop_instance_uid="1.2.840.001.1.1",
        pacs_object_uri="pacs://study/ACC-001/series/1/image/1",
        image_number=1,
    )
    report = ImagingReport.objects.create(
        study=study,
        status="FINAL",
        findings="Opacidade no lobo inferior direito.",
        impression="Achados compatíveis com processo infeccioso.",
    )
    event = PacsIntegrationEvent.objects.create(
        study=study,
        equipment=equipment,
        event_type="STORE",
        status="ACKNOWLEDGED",
        payload={"objects": 120},
    )

    study.refresh_from_db()
    assert study.tenant == tenant
    assert study.modality == "CT"
    assert study.body_region == "CHEST"
    assert study.image_count == 120
    assert study.images_available is True
    assert study.status == "REPORTED"
    assert study.completed_at is not None
    assert series.tenant == tenant
    assert image_file.tenant == tenant
    assert report.tenant == tenant
    assert report.signed_at is not None
    assert event.tenant == tenant
    assert event.accession_number == "ACC-001"
    assert event.study_instance_uid == "1.2.840.001"

    other_patient = _patient(tenant, name="Outro Paciente")
    with pytest.raises(ValidationError):
        ImagingStudy.objects.create(
            patient=other_patient,
            prescription_item=prescription_item,
            accession_number="ACC-INVALID",
            modality="XRAY",
            body_region="CHEST",
        )

    with pytest.raises(ValidationError):
        ImagingStudy.objects.create(
            patient=patient,
            equipment=equipment,
            accession_number="ACC-INVALID-2",
            modality="MRI",
            body_region="CHEST",
        )


@pytest.mark.django_db
def test_radiology_api_exposes_imaging_workflow(api_client):
    tenant = _tenant()
    patient = _patient(tenant)
    prescription_item = _prescription_item(tenant, patient)
    _authenticate_admin(tenant, api_client)

    equipment_response = api_client.post(
        "/api/v1/radiology/equipment/",
        {
            "code": "US-01",
            "name": "Ultrassom Sala 1",
            "modality": "ULTRASOUND",
            "ae_title": "SUBSTRATO_US",
            "location": "Sala de Ecografia",
        },
        format="json",
    )
    assert equipment_response.status_code == 201
    equipment_id = _response_data(equipment_response)["id"]

    protocol_response = api_client.post(
        "/api/v1/radiology/protocol/",
        {
            "code": "US-ABD",
            "name": "Ultrassom abdominal",
            "modality": "ULTRASOUND",
            "body_region": "ABDOMEN",
            "preparation": "Jejum conforme protocolo.",
        },
        format="json",
    )
    assert protocol_response.status_code == 201
    protocol_id = _response_data(protocol_response)["id"]

    study_response = api_client.post(
        "/api/v1/radiology/study/",
        {
            "patient": patient.id,
            "medical_record": prescription_item.record_id,
            "prescription_item": prescription_item.id,
            "protocol": protocol_id,
            "equipment": equipment_id,
            "accession_number": "US-ACC-001",
            "study_instance_uid": "1.2.840.US.001",
            "status": "ACQUIRED",
            "priority": "ROUTINE",
            "clinical_indication": "Dor abdominal",
            "requested_at": timezone.now().isoformat(),
        },
        format="json",
    )
    assert study_response.status_code == 201
    study_payload = _response_data(study_response)
    assert study_payload["patient_name"] == patient.name
    assert study_payload["modality"] == "ULTRASOUND"
    study_id = study_payload["id"]

    series_response = api_client.post(
        "/api/v1/radiology/series/",
        {
            "study": study_id,
            "series_instance_uid": "1.2.840.US.001.1",
            "series_number": 1,
            "description": "Abdómen completo",
            "image_count": 12,
        },
        format="json",
    )
    assert series_response.status_code == 201
    series_payload = _response_data(series_response)

    file_response = api_client.post(
        "/api/v1/radiology/file/",
        {
            "study": study_id,
            "series": series_payload["id"],
            "file_type": "DICOM",
            "sop_instance_uid": "1.2.840.US.001.1.1",
            "pacs_object_uri": "pacs://US-ACC-001/1",
            "image_number": 1,
        },
        format="json",
    )
    assert file_response.status_code == 201

    report_response = api_client.post(
        "/api/v1/radiology/report/",
        {
            "study": study_id,
            "status": "FINAL",
            "findings": "Fígado sem lesões focais.",
            "impression": "Exame sem alterações significativas.",
        },
        format="json",
    )
    assert report_response.status_code == 201
    assert _response_data(report_response)["signed_at"] is not None

    pacs_response = api_client.post(
        "/api/v1/radiology/pacs_event/",
        {
            "study": study_id,
            "equipment": equipment_id,
            "event_type": "WORKLIST_CREATE",
            "status": "ACKNOWLEDGED",
            "payload": {"accession": "US-ACC-001"},
            "response": {"ack": True},
        },
        format="json",
    )
    assert pacs_response.status_code == 201
    pacs_payload = _response_data(pacs_response)
    assert pacs_payload["accession_number"] == "US-ACC-001"

    list_response = api_client.get("/api/v1/radiology/study/")
    assert list_response.status_code == 200
    assert len(_items(list_response)) == 1
