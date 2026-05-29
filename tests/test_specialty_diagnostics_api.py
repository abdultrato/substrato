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
from apps.specialty_diagnostics.models import (
    SpecialtyDiagnosticEquipment,
    SpecialtyDiagnosticIntegrationEvent,
    SpecialtyDiagnosticMeasurement,
    SpecialtyDiagnosticOrder,
    SpecialtyDiagnosticProtocol,
    SpecialtyDiagnosticReport,
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
        identifier="tn-specialty-diagnostics",
        name="Tenant Diagnósticos",
        domain="tenant-specialty-diagnostics.local",
        active=True,
    )


def _patient(tenant, name="Paciente Diagnóstico"):
    return Patient.objects.create(
        tenant=tenant,
        name=name,
        gender="Feminino",
        address_street="Rua Diagnósticos",
    )


def _prescription_item(tenant, patient, name="Ecocardiograma"):
    record = MedicalRecordEntry.objects.create(
        tenant=tenant,
        patient=patient,
        symptoms="Dor torácica",
        diagnosis="Investigar alteração cardiovascular",
        prescription=name,
    )
    product = Product.objects.create(
        tenant=tenant,
        name=name,
        type=Product.ProductType.MEDICAMENTO,
    )
    return PrescriptionItem.objects.create(
        record=record,
        medication=product,
        dosage_value=Decimal("1.00"),
        dosage_unit="MG",
        dose_count=1,
        notes="Exame especializado solicitado",
    )


def _authenticate_admin(tenant, api_client):
    user_model = get_user_model()
    user = user_model.objects.create_user(
        username="admin-specialty-diagnostics",
        email="admin-specialty-diagnostics@example.com",
        password="testpass123",
        tenant=tenant,
    )
    group, _ = Group.objects.get_or_create(name="Administrador")
    user.groups.add(group)
    api_client.defaults["HTTP_HOST"] = tenant.domain
    api_client.force_authenticate(user=user)
    return user


@pytest.mark.django_db
def test_specialty_diagnostics_models_manage_cardiology_workflow():
    tenant = _tenant()
    patient = _patient(tenant)
    prescription_item = _prescription_item(tenant, patient)
    equipment = SpecialtyDiagnosticEquipment.objects.create(
        tenant=tenant,
        code="ECHO-01",
        name="Ecógrafo cardíaco",
        specialty="CARDIOLOGY",
        modality="ECHOCARDIOGRAM",
        location="Sala de cardiologia",
    )
    protocol = SpecialtyDiagnosticProtocol.objects.create(
        tenant=tenant,
        code="CARD-ECHO",
        name="Ecocardiograma transtorácico",
        specialty="CARDIOLOGY",
        modality="ECHOCARDIOGRAM",
        default_measurements=["FEVE", "DDVE"],
        default_report_template="Técnica, medições, achados e conclusão.",
    )
    order = SpecialtyDiagnosticOrder.objects.create(
        patient=patient,
        medical_record=prescription_item.record,
        prescription_item=prescription_item,
        protocol=protocol,
        equipment=equipment,
        order_number="CARD-001",
        priority="URGENT",
        clinical_indication="Dor torácica e dispneia",
        performed_at=timezone.now(),
    )
    measurement = SpecialtyDiagnosticMeasurement.objects.create(
        order=order,
        code="FEVE",
        name="Fração de ejeção",
        numeric_value=Decimal("58.000"),
        unit="%",
        reference_range="55-70",
    )
    report = SpecialtyDiagnosticReport.objects.create(
        order=order,
        status="FINAL",
        findings="Função sistólica preservada.",
        impression="Ecocardiograma sem alterações relevantes.",
    )
    event = SpecialtyDiagnosticIntegrationEvent.objects.create(
        order=order,
        equipment=equipment,
        event_type="DEVICE_IMPORT",
        status="ACKNOWLEDGED",
        payload={"measurements": 1},
    )

    order.refresh_from_db()
    assert order.tenant == tenant
    assert order.specialty == "CARDIOLOGY"
    assert order.modality == "ECHOCARDIOGRAM"
    assert order.status == "REPORTED"
    assert order.measurements_complete is True
    assert order.report_available is True
    assert measurement.tenant == tenant
    assert measurement.position == 1
    assert report.tenant == tenant
    assert report.signed_at is not None
    assert event.tenant == tenant
    assert event.order_number == "CARD-001"

    other_patient = _patient(tenant, name="Outro Paciente")
    with pytest.raises(ValidationError):
        SpecialtyDiagnosticOrder.objects.create(
            patient=other_patient,
            prescription_item=prescription_item,
            order_number="CARD-INVALID",
            specialty="CARDIOLOGY",
            modality="ECHOCARDIOGRAM",
        )

    with pytest.raises(ValidationError):
        SpecialtyDiagnosticEquipment.objects.create(
            tenant=tenant,
            code="EEG-INVALID",
            name="EEG em cardiologia",
            specialty="CARDIOLOGY",
            modality="EEG",
        )


@pytest.mark.django_db
def test_specialty_diagnostics_api_exposes_neurology_and_ophthalmology_workflows(api_client):
    tenant = _tenant()
    patient = _patient(tenant)
    prescription_item = _prescription_item(tenant, patient, name="EEG")
    _authenticate_admin(tenant, api_client)

    equipment_response = api_client.post(
        "/api/v1/specialty_diagnostics/equipment/",
        {
            "code": "EEG-01",
            "name": "Eletroencefalógrafo",
            "specialty": "NEUROLOGY",
            "modality": "EEG",
            "location": "Neurofisiologia",
        },
        format="json",
    )
    assert equipment_response.status_code == 201
    equipment_id = _response_data(equipment_response)["id"]

    protocol_response = api_client.post(
        "/api/v1/specialty_diagnostics/protocol/",
        {
            "code": "NEURO-EEG",
            "name": "EEG de rotina",
            "specialty": "NEUROLOGY",
            "modality": "EEG",
            "preparation": "Sono parcial conforme idade.",
            "default_measurements": ["Ritmo de base", "Atividade epileptiforme"],
        },
        format="json",
    )
    assert protocol_response.status_code == 201
    protocol_id = _response_data(protocol_response)["id"]

    order_response = api_client.post(
        "/api/v1/specialty_diagnostics/order/",
        {
            "patient": patient.id,
            "medical_record": prescription_item.record_id,
            "prescription_item": prescription_item.id,
            "protocol": protocol_id,
            "equipment": equipment_id,
            "order_number": "NEURO-001",
            "priority": "ROUTINE",
            "clinical_indication": "Crises paroxísticas",
            "requested_at": timezone.now().isoformat(),
        },
        format="json",
    )
    assert order_response.status_code == 201
    order_payload = _response_data(order_response)
    assert order_payload["patient_name"] == patient.name
    assert order_payload["specialty"] == "NEUROLOGY"
    assert order_payload["modality"] == "EEG"
    order_id = order_payload["id"]

    measurement_response = api_client.post(
        "/api/v1/specialty_diagnostics/measurement/",
        {
            "order": order_id,
            "code": "BASE",
            "name": "Ritmo de base",
            "value_type": "TEXT",
            "text_value": "Ritmo alfa posterior preservado.",
        },
        format="json",
    )
    assert measurement_response.status_code == 201
    assert _response_data(measurement_response)["specialty"] == "NEUROLOGY"

    report_response = api_client.post(
        "/api/v1/specialty_diagnostics/report/",
        {
            "order": order_id,
            "status": "FINAL",
            "findings": "Sem atividade epileptiforme no traçado.",
            "impression": "EEG dentro da normalidade.",
        },
        format="json",
    )
    assert report_response.status_code == 201
    assert _response_data(report_response)["signed_at"] is not None

    event_response = api_client.post(
        "/api/v1/specialty_diagnostics/integration_event/",
        {
            "order": order_id,
            "equipment": equipment_id,
            "event_type": "RESULT_SYNC",
            "status": "ACKNOWLEDGED",
            "payload": {"order": "NEURO-001"},
        },
        format="json",
    )
    assert event_response.status_code == 201
    assert _response_data(event_response)["order_number"] == "NEURO-001"

    list_response = api_client.get("/api/v1/specialty_diagnostics/order/?specialty=NEUROLOGY")
    assert list_response.status_code == 200
    assert len(_items(list_response)) == 1

    measurement_list_response = api_client.get("/api/v1/specialty_diagnostics/measurement/?specialty=NEUROLOGY")
    assert measurement_list_response.status_code == 200
    assert len(_items(measurement_list_response)) == 1

    report_list_response = api_client.get("/api/v1/specialty_diagnostics/report/?specialty=NEUROLOGY")
    assert report_list_response.status_code == 200
    assert len(_items(report_list_response)) == 1

    ophthalmology_response = api_client.post(
        "/api/v1/specialty_diagnostics/protocol/",
        {
            "code": "OFT-OCT",
            "name": "OCT macular",
            "specialty": "OPHTHALMOLOGY",
            "modality": "OCT",
        },
        format="json",
    )
    assert ophthalmology_response.status_code == 201
