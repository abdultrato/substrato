from decimal import Decimal
import json

from django.contrib.auth import get_user_model
from django.contrib.auth.models import Group
from django.core.exceptions import ValidationError
from django.utils import timezone
import pytest

from apps.tenants.models.tenant import Tenant
from apps.veterinary.models import (
    VeterinaryAnimal,
    VeterinaryAppointment,
    VeterinaryLabExam,
    VeterinaryLabRequest,
    VeterinaryLabRequestItem,
    VeterinaryMedicalRecord,
    VeterinaryPrescription,
    VeterinaryPrescriptionItem,
    VeterinaryVaccination,
    VeterinaryVaccine,
)


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
        identifier="tn-vet",
        name="Tenant Vet",
        domain="tenant-vet.local",
        active=True,
    )


def _authenticate_admin(tenant, api_client):
    user_model = get_user_model()
    user = user_model.objects.create_user(
        username="admin-vet",
        email="admin-vet@example.com",
        password="testpass123",
        tenant=tenant,
    )
    group, _ = Group.objects.get_or_create(name="Administrador")
    user.groups.add(group)
    api_client.defaults["HTTP_HOST"] = tenant.domain
    api_client.force_authenticate(user=user)
    return user


@pytest.mark.django_db
def test_veterinary_models_propagate_tenant_and_validate_species():
    tenant = _tenant()
    animal = VeterinaryAnimal.objects.create(
        tenant=tenant,
        name="Milo",
        species="DOG",
        owner_name="Ana Tutor",
    )
    appointment = VeterinaryAppointment.objects.create(
        animal=animal,
        scheduled_start=timezone.now(),
        reason="Febre",
    )
    record = VeterinaryMedicalRecord.objects.create(
        animal=animal,
        appointment=appointment,
        weight_kg=Decimal("12.50"),
        symptoms="Febre e apatia",
    )
    vaccine = VeterinaryVaccine.objects.create(
        tenant=tenant,
        name="V10",
        species="DOG",
        disease="Doenças caninas",
    )
    vaccination = VeterinaryVaccination.objects.create(
        animal=animal,
        vaccine=vaccine,
        status="APPLIED",
        administered_at=timezone.now(),
    )
    dog_exam = VeterinaryLabExam.objects.create(
        tenant=tenant,
        code="HEM-DOG",
        name="Hemograma canino",
        species="DOG",
    )
    request = VeterinaryLabRequest.objects.create(animal=animal, record=record, clinical_notes="Febre persistente")
    item = VeterinaryLabRequestItem.objects.create(request=request, exam=dog_exam, result_value="Normal")
    prescription = VeterinaryPrescription.objects.create(animal=animal, record=record, instructions="Dar com alimento")
    prescription_item = VeterinaryPrescriptionItem.objects.create(
        prescription=prescription,
        medication_name="Antibiótico veterinário",
        dosage="1 comprimido",
    )

    assert appointment.tenant == tenant
    assert record.tenant == tenant
    assert vaccination.tenant == tenant
    assert request.tenant == tenant
    assert item.tenant == tenant
    assert prescription.tenant == tenant
    assert prescription_item.tenant == tenant

    cat_exam = VeterinaryLabExam.objects.create(
        tenant=tenant,
        code="FELV",
        name="Teste FeLV",
        species="CAT",
    )
    with pytest.raises(ValidationError):
        VeterinaryLabRequestItem.objects.create(request=request, exam=cat_exam)


@pytest.mark.django_db
def test_veterinary_api_exposes_core_workflow(api_client):
    tenant = _tenant()
    _authenticate_admin(tenant, api_client)

    animal_response = api_client.post(
        "/api/v1/veterinary/animal/",
        {
            "name": "Kira",
            "species": "CAT",
            "breed": "Europeu comum",
            "sex": "FEMALE",
            "owner_name": "Carlos Tutor",
            "owner_phone": "+258840000000",
        },
        format="json",
    )
    assert animal_response.status_code == 201
    animal_id = _response_data(animal_response)["id"]

    appointment_response = api_client.post(
        "/api/v1/veterinary/appointment/",
        {
            "animal": animal_id,
            "scheduled_start": timezone.now().isoformat(),
            "reason": "Vacinação e consulta geral",
            "room": "Sala Vet 1",
        },
        format="json",
    )
    assert appointment_response.status_code == 201
    appointment_id = _response_data(appointment_response)["id"]

    record_response = api_client.post(
        "/api/v1/veterinary/record/",
        {
            "animal": animal_id,
            "appointment": appointment_id,
            "weight_kg": "4.20",
            "temperature_c": "38.60",
            "symptoms": "Sem queixas relevantes",
            "diagnosis": "Exame geral normal",
        },
        format="json",
    )
    assert record_response.status_code == 201
    record_payload = _response_data(record_response)
    assert record_payload["animal_name"] == "Kira"

    vaccine_response = api_client.post(
        "/api/v1/veterinary/vaccine/",
        {
            "name": "Tríplice felina",
            "species": "CAT",
            "disease": "Rinotraqueíte, calicivirose e panleucopenia",
            "default_interval_days": 365,
        },
        format="json",
    )
    assert vaccine_response.status_code == 201
    vaccine_id = _response_data(vaccine_response)["id"]

    vaccination_response = api_client.post(
        "/api/v1/veterinary/vaccination/",
        {
            "animal": animal_id,
            "vaccine": vaccine_id,
            "status": "APPLIED",
            "administered_at": timezone.now().isoformat(),
            "lot_number": "VAC-001",
        },
        format="json",
    )
    assert vaccination_response.status_code == 201

    exam_response = api_client.post(
        "/api/v1/veterinary/lab_exam/",
        {
            "code": "FEL-HEM",
            "name": "Hemograma felino",
            "species": "CAT",
            "sample_type": "BLOOD",
        },
        format="json",
    )
    assert exam_response.status_code == 201
    exam_id = _response_data(exam_response)["id"]

    request_response = api_client.post(
        "/api/v1/veterinary/lab_request/",
        {
            "animal": animal_id,
            "appointment": appointment_id,
            "record": record_payload["id"],
            "priority": "ROUTINE",
            "clinical_notes": "Exame de rotina",
        },
        format="json",
    )
    assert request_response.status_code == 201
    request_id = _response_data(request_response)["id"]

    item_response = api_client.post(
        "/api/v1/veterinary/lab_request_item/",
        {
            "request": request_id,
            "exam": exam_id,
            "sample_identifier": "AMO-001",
            "status": "RESULTED",
            "result_value": "Dentro dos limites",
        },
        format="json",
    )
    assert item_response.status_code == 201
    assert _response_data(item_response)["animal_name"] == "Kira"

    admission_response = api_client.post(
        "/api/v1/veterinary/admission/",
        {
            "animal": animal_id,
            "appointment": appointment_id,
            "status": "OBSERVATION",
            "ward": "Observação",
            "cage": "BOX-01",
            "reason": "Monitorização pós-vacina",
        },
        format="json",
    )
    assert admission_response.status_code == 201

    prescription_response = api_client.post(
        "/api/v1/veterinary/prescription/",
        {
            "animal": animal_id,
            "record": record_payload["id"],
            "status": "ACTIVE",
            "instructions": "Retornar em 7 dias se houver reação.",
        },
        format="json",
    )
    assert prescription_response.status_code == 201
    prescription_id = _response_data(prescription_response)["id"]

    prescription_item_response = api_client.post(
        "/api/v1/veterinary/prescription_item/",
        {
            "prescription": prescription_id,
            "medication_name": "Suplemento felino",
            "dosage": "2 ml",
            "route": "ORAL",
            "frequency": "1 vez ao dia",
            "duration_days": 5,
        },
        format="json",
    )
    assert prescription_item_response.status_code == 201
    assert _response_data(prescription_item_response)["medication_display"] == "Suplemento felino"

    list_response = api_client.get("/api/v1/veterinary/animal/")
    assert list_response.status_code == 200
    assert len(_items(list_response)) == 1
