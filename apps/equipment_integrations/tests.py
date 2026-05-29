"""Testes de integrações com equipamentos (worklist, roteamento, mapeamento)."""

import base64
from decimal import Decimal

import pytest
from rest_framework.test import APIClient

from apps.clinical.models.lab_exam import LabExam
from apps.clinical.models.lab_exam_field import LabExamField
from apps.clinical.models.lab_request import LabRequest
from apps.clinical.models.lab_request_item import LabRequestItem
from apps.clinical.models.medical_exam import MedicalExam
from apps.clinical.models.patient import Patient
from apps.clinical.models.result import Result
from apps.clinical.models.result_item import ResultItem
from apps.clinical.models.sample import Sample
from apps.equipment_integrations.models import (
    IntegrationAnalyteMapping,
    IntegrationCredential,
    IntegrationEquipment,
    IntegrationOrder,
    IntegrationRouting,
)
from apps.radiology.models import ImagingEquipment, ImagingStudy, PacsIntegrationEvent
from apps.specialty_diagnostics.models import (
    SpecialtyDiagnosticEquipment,
    SpecialtyDiagnosticIntegrationEvent,
    SpecialtyDiagnosticMeasurement,
    SpecialtyDiagnosticOrder,
)
from apps.tenants.models.tenant import Tenant
from core.constants.laboratory.method import Method
from core.constants.laboratory.result_type import ResultType
from core.constants.laboratory.sector import Sector
from core.constants.laboratory.units import DefaultUnit
from core.constants.medical_exam.medical_exam_method import MedicalExamMethod
from core.constants.medical_exam.medical_exam_sector import MedicalExamSector


def _tenant():
    return Tenant.objects.create(identifier="tn-int", name="Tenant Int")


def _patient(tenant):
    return Patient.objects.create(
        tenant=tenant,
        name="Paciente Int",
        gender="Masculino",
        address_street="Rua Z",
    )


def _exam(tenant):
    sample = Sample.objects.create(
        tenant=tenant,
        name="Sangue total",
        bottle_type=Sample.BottleType.EDTA_TUBE,
    )
    return LabExam.objects.create(
        tenant=tenant,
        name="Hemograma",
        price=Decimal("30.00"),
        method=Method.ENZIMATICO,
        sector=Sector.HEMATOLOGIA,
        sample_type=sample,
    )


@pytest.mark.django_db
def test_request_item_creates_integration_order_by_sector():
    tenant = _tenant()
    patient = _patient(tenant)
    exam = _exam(tenant)

    equipment = IntegrationEquipment.objects.create(
        tenant=tenant,
        name="Analyzer Hematologia",
        modality=IntegrationEquipment.Modalidade.HEMOGRAMA,
        protocol=IntegrationEquipment.Protocolo.HTTP_JSON,
    )
    equipment.refresh_from_db()
    assert equipment.custom_id
    IntegrationRouting.objects.create(
        tenant=tenant,
        equipment=equipment,
        exam_type=IntegrationRouting.ExamType.LABORATORIO,
        sector=Sector.HEMATOLOGIA,
        active=True,
    )

    req = LabRequest.objects.create(tenant=tenant, patient=patient)
    item = LabRequestItem.objects.create(tenant=tenant, request=req, exam=exam)

    order = IntegrationOrder.objects.get(equipment=equipment, request=req, deleted=False)
    assert order.status == IntegrationOrder.Status.PENDING
    assert order.items.filter(request_item=item, deleted=False).exists()


@pytest.mark.django_db
def test_http_inbox_applies_result_by_mapping():
    tenant = _tenant()
    patient = _patient(tenant)
    exam = _exam(tenant)

    campo = LabExamField.objects.create(
        tenant=tenant,
        exam=exam,
        name="Hemoglobina",
        type=ResultType.NUMERICO,
        unit=DefaultUnit.G_DL,
    )

    equipment = IntegrationEquipment.objects.create(
        tenant=tenant,
        name="Analyzer Hematologia",
        modality=IntegrationEquipment.Modalidade.HEMOGRAMA,
        protocol=IntegrationEquipment.Protocolo.HTTP_JSON,
    )
    IntegrationRouting.objects.create(
        tenant=tenant,
        equipment=equipment,
        exam_type=IntegrationRouting.ExamType.LABORATORIO,
        sector=Sector.HEMATOLOGIA,
        active=True,
    )

    IntegrationAnalyteMapping.objects.create(
        tenant=tenant,
        equipment=equipment,
        code="HB",
        exam_field=campo,
        active=True,
    )

    cred, key = IntegrationCredential.generate(equipment=equipment, label="key")
    assert IntegrationCredential.validate_key(key).id == cred.id

    req = LabRequest.objects.create(tenant=tenant, patient=patient)
    LabRequestItem.objects.create(tenant=tenant, request=req, exam=exam)

    order = IntegrationOrder.objects.get(equipment=equipment, request=req, deleted=False)

    client = APIClient()

    # Worklist
    worklist = client.get(
        f"/api/v1/equipment_integrations/equipment/{equipment.custom_id}/worklist/",
        HTTP_X_INTEGRATION_KEY=key,
    )
    assert worklist.status_code == 200
    assert worklist.data["count"] >= 1

    # Inbox
    resp = client.post(
        f"/api/v1/equipment_integrations/equipment/{equipment.custom_id}/results/",
        data={
            "message_id": "msg-1",
            "accession": order.custom_id,
            "results": [{"code": "HB", "value": "13.2"}],
        },
        format="json",
        HTTP_X_INTEGRATION_KEY=key,
    )
    assert resp.status_code == 200
    assert resp.data["order_status"] in {IntegrationOrder.Status.IN_PROGRESS, IntegrationOrder.Status.DONE}

    result = Result.objects.get(request=req)
    item = ResultItem.objects.get(result=result, exam_field=campo)
    assert item.result_value == Decimal("13.20")


@pytest.mark.django_db
def test_medical_exam_item_creates_worklist_order_for_tcp_ecg_equipment():
    tenant = _tenant()
    patient = _patient(tenant)
    medical_exam = MedicalExam.objects.create(
        tenant=tenant,
        name="Eletrocardiograma",
        price=Decimal("25.00"),
        method=MedicalExamMethod.ELETROCARDIOGRAMA,
        sector=MedicalExamSector.CARDIOLOGIA,
    )
    equipment = IntegrationEquipment.objects.create(
        tenant=tenant,
        name="ECG TCP Sala 1",
        modality=IntegrationEquipment.Modalidade.ECG,
        protocol=IntegrationEquipment.Protocolo.TCP_JSON,
        connection_mode=IntegrationEquipment.ConnectionMode.TCP_SERVER,
        tcp_host="127.0.0.1",
        tcp_port=9101,
        supported_exam_types=["MED", "ECG"],
    )
    IntegrationRouting.objects.create(
        tenant=tenant,
        equipment=equipment,
        exam_type=IntegrationRouting.ExamType.MEDICO,
        sector=MedicalExamSector.CARDIOLOGIA,
        active=True,
    )

    req = LabRequest.objects.create(tenant=tenant, patient=patient, type=LabRequest.Type.MEDICAL_EXAM)
    item = LabRequestItem.objects.create(tenant=tenant, request=req, medical_exam=medical_exam)

    order = IntegrationOrder.objects.get(equipment=equipment, request=req, deleted=False)
    assert order.items.filter(request_item=item, deleted=False).exists()


@pytest.mark.django_db
def test_equipment_inbox_consumes_radiology_imaging_payload():
    tenant = _tenant()
    patient = _patient(tenant)
    imaging_equipment = ImagingEquipment.objects.create(
        tenant=tenant,
        code="CT-TCP-01",
        name="Tomógrafo TCP",
        modality="CT",
        ae_title="CT_TCP",
    )
    study = ImagingStudy.objects.create(
        tenant=tenant,
        patient=patient,
        equipment=imaging_equipment,
        accession_number="RAD-TCP-001",
        modality="CT",
        status=ImagingStudy.Status.IN_PROGRESS,
    )
    equipment = IntegrationEquipment.objects.create(
        tenant=tenant,
        name="Gateway DICOM TCP",
        modality=IntegrationEquipment.Modalidade.TOMOGRAFIA,
        protocol=IntegrationEquipment.Protocolo.DICOM,
        connection_mode=IntegrationEquipment.ConnectionMode.TCP_SERVER,
        tcp_host="127.0.0.1",
        tcp_port=10401,
        tcp_framing=IntegrationEquipment.TcpFraming.RAW,
        supported_exam_types=["RAD"],
    )
    _cred, key = IntegrationCredential.generate(equipment=equipment, label="radiology")

    client = APIClient()
    response = client.post(
        f"/api/v1/equipment_integrations/equipment/{equipment.custom_id}/ingest/",
        data={
            "domain": "radiology",
            "message_id": "rad-msg-1",
            "accession": "RAD-TCP-001",
            "imaging": {
                "study_instance_uid": "1.2.840.RAD.TCP.1",
                "image_count": 8,
                "series": [{"series_instance_uid": "1.2.840.RAD.TCP.1.1", "series_number": 1, "image_count": 8}],
                "files": [{"sop_instance_uid": "1.2.840.RAD.TCP.1.1.1", "pacs_object_uri": "pacs://RAD-TCP-001/1"}],
            },
            "report": {"status": "FINAL", "findings": "Sem alterações agudas.", "impression": "Exame sem alterações."},
        },
        format="json",
        HTTP_X_INTEGRATION_KEY=key,
    )

    assert response.status_code == 200, response.data
    study.refresh_from_db()
    equipment.refresh_from_db()
    assert study.study_instance_uid == "1.2.840.RAD.TCP.1"
    assert study.images_available is True
    assert study.image_count == 8
    assert study.reports.exists()
    assert PacsIntegrationEvent.objects.filter(study=study, status=PacsIntegrationEvent.Status.ACKNOWLEDGED).exists()
    assert equipment.last_seen_at is not None


@pytest.mark.django_db
def test_equipment_inbox_consumes_specialty_ecg_measurements():
    tenant = _tenant()
    patient = _patient(tenant)
    specialty_equipment = SpecialtyDiagnosticEquipment.objects.create(
        tenant=tenant,
        code="ECG-SDX-01",
        name="ECG digital",
        specialty="CARDIOLOGY",
        modality="ECG",
    )
    order = SpecialtyDiagnosticOrder.objects.create(
        tenant=tenant,
        patient=patient,
        equipment=specialty_equipment,
        order_number="ECG-TCP-001",
        specialty="CARDIOLOGY",
        modality="ECG",
    )
    equipment = IntegrationEquipment.objects.create(
        tenant=tenant,
        name="Gateway ECG TCP",
        modality=IntegrationEquipment.Modalidade.ECG,
        protocol=IntegrationEquipment.Protocolo.TCP_JSON,
        connection_mode=IntegrationEquipment.ConnectionMode.TCP_SERVER,
        tcp_host="127.0.0.1",
        tcp_port=9102,
        supported_exam_types=["SDX", "ECG"],
    )
    _cred, key = IntegrationCredential.generate(equipment=equipment, label="ecg")

    client = APIClient()
    response = client.post(
        f"/api/v1/equipment_integrations/equipment/{equipment.custom_id}/results/",
        data={
            "domain": "cardiology",
            "message_id": "ecg-msg-1",
            "accession": "ECG-TCP-001",
            "measurements": [
                {"code": "HR", "name": "Frequência cardíaca", "value": "72", "unit": "bpm"},
                {"code": "RHYTHM", "name": "Ritmo", "value": "Sinusal", "value_type": "TEXT"},
            ],
            "report": {"status": "FINAL", "findings": "Ritmo sinusal.", "impression": "ECG dentro da normalidade."},
            "documents": [
                {
                    "filename": "ecg.txt",
                    "content_type": "text/plain",
                    "base64": base64.b64encode(b"ECG trace").decode("ascii"),
                }
            ],
        },
        format="json",
        HTTP_X_INTEGRATION_KEY=key,
    )

    assert response.status_code == 200, response.data
    order.refresh_from_db()
    assert order.status in {SpecialtyDiagnosticOrder.Status.PERFORMED, SpecialtyDiagnosticOrder.Status.REPORTED}
    assert SpecialtyDiagnosticMeasurement.objects.filter(order=order, code="HR", numeric_value=Decimal("72.000")).exists()
    assert SpecialtyDiagnosticMeasurement.objects.filter(order=order, code="RHYTHM", text_value="Sinusal").exists()
    assert order.reports.exists()
    assert SpecialtyDiagnosticIntegrationEvent.objects.filter(
        order=order,
        status=SpecialtyDiagnosticIntegrationEvent.Status.ACKNOWLEDGED,
    ).exists()


_patient = _patient
_exam = _exam
