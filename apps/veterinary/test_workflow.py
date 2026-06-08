from __future__ import annotations

from datetime import timedelta
from decimal import Decimal
from uuid import uuid4

import pytest
from django.core.exceptions import ValidationError
from django.utils import timezone

from apps.human_resources.models import Employee
from apps.tenants.models.tenant import Tenant
from apps.veterinary.models import (
    AnimalSpecies,
    VeterinaryAdmission,
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
from apps.veterinary.services import VeterinaryWorkflowService


def _tenant():
    suffix = uuid4().hex[:8]
    return Tenant.objects.create(
        identifier=f"tn-{suffix}", name="Tenant Vet", domain=f"{suffix}.local", active=True
    )


def _animal(tenant, species=AnimalSpecies.DOG):
    return VeterinaryAnimal.objects.create(
        tenant=tenant,
        name="Rex",
        owner_name="Tutor WF",
        species=species,
    )


def _vet(tenant):
    return Employee.objects.create(tenant=tenant, name="Dra. Vet", email=f"{uuid4().hex[:8]}@vet.test")


def _vaccine(tenant, *, species=AnimalSpecies.ALL, interval=365):
    return VeterinaryVaccine.objects.create(
        tenant=tenant,
        name="Antirrábica",
        disease="Raiva",
        species=species,
        default_interval_days=interval,
    )


def _exam(tenant, *, code=None, species=AnimalSpecies.ALL):
    return VeterinaryLabExam.objects.create(
        tenant=tenant,
        name="Hemograma",
        code=code or f"HEM-{uuid4().hex[:5]}",
        species=species,
    )


def _appointment(tenant, animal, vet=None):
    return VeterinaryAppointment.objects.create(
        tenant=tenant,
        animal=animal,
        veterinarian=vet,
        scheduled_start=timezone.now() + timedelta(hours=1),
    )


@pytest.mark.django_db
def test_confirm_start_and_finalize_appointment():
    tenant = _tenant()
    animal = _animal(tenant)
    vet = _vet(tenant)
    appointment = _appointment(tenant, animal, vet)

    VeterinaryWorkflowService.confirm_appointment(appointment)
    assert appointment.status == VeterinaryAppointment.Status.CONFIRMED

    record = VeterinaryWorkflowService.start_attendance(appointment, anamnesis="Apatia")
    appointment.refresh_from_db()
    assert appointment.status == VeterinaryAppointment.Status.IN_PROGRESS
    assert record.status == VeterinaryMedicalRecord.Status.ACTIVE
    assert record.appointment_id == appointment.id

    VeterinaryWorkflowService.finalize_appointment(appointment)
    appointment.refresh_from_db()
    record.refresh_from_db()
    assert appointment.status == VeterinaryAppointment.Status.COMPLETED
    assert record.status == VeterinaryMedicalRecord.Status.FINALIZED
    assert record.closed_at is not None


@pytest.mark.django_db
def test_cancel_appointment_requires_reason():
    tenant = _tenant()
    appointment = _appointment(tenant, _animal(tenant))
    with pytest.raises(ValidationError):
        VeterinaryWorkflowService.cancel_appointment(appointment, reason="")
    VeterinaryWorkflowService.cancel_appointment(appointment, reason="Tutor desmarcou")
    assert appointment.status == VeterinaryAppointment.Status.CANCELLED


@pytest.mark.django_db
def test_register_vaccination_applies_and_schedules_booster():
    tenant = _tenant()
    animal = _animal(tenant, species=AnimalSpecies.DOG)
    vaccine = _vaccine(tenant, species=AnimalSpecies.DOG, interval=365)
    vet = _vet(tenant)

    vaccination = VeterinaryWorkflowService.register_vaccination(
        animal=animal, vaccine=vaccine, veterinarian=vet, lot_number="L-001"
    )
    assert vaccination.status == VeterinaryVaccination.Status.APPLIED
    assert vaccination.administered_at is not None
    assert vaccination.next_due_date == vaccination.administered_at.date() + timedelta(days=365)


@pytest.mark.django_db
def test_register_vaccination_blocks_species_mismatch():
    tenant = _tenant()
    animal = _animal(tenant, species=AnimalSpecies.DOG)
    vaccine = _vaccine(tenant, species=AnimalSpecies.CAT)
    with pytest.raises(ValidationError):
        VeterinaryWorkflowService.register_vaccination(animal=animal, vaccine=vaccine)


@pytest.mark.django_db
def test_lab_request_flow_completes_when_all_items_resulted():
    tenant = _tenant()
    animal = _animal(tenant)
    vet = _vet(tenant)
    exam_a = _exam(tenant)
    exam_b = _exam(tenant)

    request = VeterinaryWorkflowService.create_lab_request(
        animal=animal, exams=[exam_a, exam_b], veterinarian=vet, clinical_notes="Suspeita de infeção"
    )
    assert request.status == VeterinaryLabRequest.Status.REQUESTED
    assert request.items.count() == 2

    VeterinaryWorkflowService.collect_sample(request, sample_identifier="AM-1")
    request.refresh_from_db()
    assert request.status == VeterinaryLabRequest.Status.COLLECTED
    assert all(
        i.status == VeterinaryLabRequestItem.Status.COLLECTED for i in request.items.all()
    )

    VeterinaryWorkflowService.start_processing(request)
    request.refresh_from_db()
    assert request.status == VeterinaryLabRequest.Status.PROCESSING

    for item in request.items.all():
        VeterinaryWorkflowService.register_item_result(item, result_value="Normal")
    request.refresh_from_db()
    assert request.status == VeterinaryLabRequest.Status.COMPLETED


@pytest.mark.django_db
def test_cancel_lab_request_cancels_pending_items():
    tenant = _tenant()
    animal = _animal(tenant)
    request = VeterinaryWorkflowService.create_lab_request(animal=animal, exams=[_exam(tenant)])
    VeterinaryWorkflowService.cancel_lab_request(request, reason="Tutor desistiu")
    request.refresh_from_db()
    assert request.status == VeterinaryLabRequest.Status.CANCELLED
    assert all(i.status == VeterinaryLabRequestItem.Status.CANCELLED for i in request.items.all())


@pytest.mark.django_db
def test_admission_admit_evolve_and_discharge():
    tenant = _tenant()
    animal = _animal(tenant)
    vet = _vet(tenant)

    with pytest.raises(ValidationError):
        VeterinaryWorkflowService.admit_animal(animal=animal, veterinarian=vet, reason="")

    admission = VeterinaryWorkflowService.admit_animal(
        animal=animal, veterinarian=vet, reason="Desidratação", ward="UTI", cage="B2"
    )
    assert admission.status == VeterinaryAdmission.Status.ADMITTED

    VeterinaryWorkflowService.register_admission_evolution(admission, text="Hidratação EV", author_name="Dra. Vet")
    assert "Hidratação EV" in admission.notes

    VeterinaryWorkflowService.discharge_admission(admission, condition="Estável")
    admission.refresh_from_db()
    assert admission.status == VeterinaryAdmission.Status.DISCHARGED
    assert admission.discharged_at is not None


@pytest.mark.django_db
def test_admission_death_marks_animal_deceased():
    tenant = _tenant()
    animal = _animal(tenant)
    vet = _vet(tenant)
    admission = VeterinaryWorkflowService.admit_animal(animal=animal, veterinarian=vet, reason="Trauma grave")

    VeterinaryWorkflowService.register_admission_death(admission, notes="Parada cardiorrespiratória")
    admission.refresh_from_db()
    animal.refresh_from_db()
    assert admission.status == VeterinaryAdmission.Status.DECEASED
    assert animal.status == VeterinaryAnimal.Status.DECEASED


@pytest.mark.django_db
def test_prescription_emit_requires_items_and_vet():
    tenant = _tenant()
    animal = _animal(tenant)
    vet = _vet(tenant)
    prescription = VeterinaryPrescription.objects.create(tenant=tenant, animal=animal, veterinarian=vet)

    with pytest.raises(ValidationError):
        VeterinaryWorkflowService.emit_prescription(prescription)

    VeterinaryPrescriptionItem.objects.create(
        prescription=prescription,
        medication_name="Amoxicilina",
        dosage="250mg",
        quantity=Decimal("1.00"),
    )
    VeterinaryWorkflowService.emit_prescription(prescription)
    prescription.refresh_from_db()
    assert prescription.status == VeterinaryPrescription.Status.ACTIVE


@pytest.mark.django_db
def test_register_animal_opens_record():
    tenant = _tenant()
    animal = VeterinaryWorkflowService.register_animal(
        tenant=tenant, name="Mia", owner_name="Tutora", species=AnimalSpecies.CAT
    )
    assert animal.medical_records.filter(status=VeterinaryMedicalRecord.Status.ACTIVE).exists()
