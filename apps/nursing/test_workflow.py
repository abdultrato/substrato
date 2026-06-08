from __future__ import annotations

from uuid import uuid4

import pytest
from django.core.exceptions import ValidationError

from apps.clinical.models.patient import Patient
from apps.nursing.models import Ward, WardAdmission, WardBed
from apps.nursing.services import WardAdmissionWorkflowService
from apps.tenants.models.tenant import Tenant


def _tenant():
    suffix = uuid4().hex[:8]
    return Tenant.objects.create(
        identifier=f"tn-nur-{suffix}", name="Tenant Nur", domain=f"{suffix}.local", active=True
    )


def _patient(tenant, name="Paciente"):
    return Patient.objects.create(tenant=tenant, name=name, document_number=f"NU-{uuid4().hex[:6]}")


def _ward(tenant, *, active=True):
    return Ward.objects.create(tenant=tenant, name=f"Enfermaria {uuid4().hex[:4]}", active=active)


def _bed(tenant, ward, *, number=None, active=True):
    return WardBed.objects.create(tenant=tenant, ward=ward, number=number or uuid4().hex[:5], active=active)


@pytest.mark.django_db
def test_admit_occupies_bed_and_blocks_double_admission():
    tenant = _tenant()
    ward = _ward(tenant)
    bed = _bed(tenant, ward)
    p1 = _patient(tenant, "Ana")
    p2 = _patient(tenant, "Bruno")

    admission = WardAdmissionWorkflowService.admit_patient(bed=bed, patient=p1)
    assert admission.active is True
    assert admission.ward_id == ward.id  # WardScopedModel propaga a enfermaria da cama

    with pytest.raises(ValidationError):
        WardAdmissionWorkflowService.admit_patient(bed=bed, patient=p2)


@pytest.mark.django_db
def test_admit_requires_active_ward_and_bed():
    tenant = _tenant()
    inactive_ward = _ward(tenant, active=False)
    bed_in_inactive = _bed(tenant, inactive_ward)
    patient = _patient(tenant)
    with pytest.raises(ValidationError):
        WardAdmissionWorkflowService.admit_patient(bed=bed_in_inactive, patient=patient)

    ward = _ward(tenant)
    inactive_bed = _bed(tenant, ward, active=False)
    with pytest.raises(ValidationError):
        WardAdmissionWorkflowService.admit_patient(bed=inactive_bed, patient=patient)


@pytest.mark.django_db
def test_discharge_frees_bed_for_reuse():
    tenant = _tenant()
    ward = _ward(tenant)
    bed = _bed(tenant, ward)
    admission = WardAdmissionWorkflowService.admit_patient(bed=bed, patient=_patient(tenant, "Ana"))

    WardAdmissionWorkflowService.discharge_patient(admission, condition="Estável")
    admission.refresh_from_db()
    assert admission.active is False
    assert admission.discharged_at is not None

    # Cama livre de novo.
    reused = WardAdmissionWorkflowService.admit_patient(bed=bed, patient=_patient(tenant, "Carlos"))
    assert reused.active is True


@pytest.mark.django_db
def test_transfer_moves_patient_and_frees_origin():
    tenant = _tenant()
    ward = _ward(tenant)
    bed1 = _bed(tenant, ward, number="A1")
    bed2 = _bed(tenant, ward, number="A2")
    patient = _patient(tenant, "Ana")
    admission = WardAdmissionWorkflowService.admit_patient(bed=bed1, patient=patient)

    new_admission = WardAdmissionWorkflowService.transfer_patient(admission, new_bed=bed2, reason="Isolamento")
    admission.refresh_from_db()
    assert admission.active is False
    assert new_admission.active is True
    assert new_admission.bed_id == bed2.id
    assert new_admission.patient_id == patient.id
    # bed1 livre, bed2 ocupada.
    assert not WardAdmission.objects.filter(bed=bed1, active=True).exists()
    assert WardAdmission.objects.filter(bed=bed2, active=True).count() == 1


@pytest.mark.django_db
def test_transfer_to_occupied_bed_fails():
    tenant = _tenant()
    ward = _ward(tenant)
    bed1 = _bed(tenant, ward, number="A1")
    bed2 = _bed(tenant, ward, number="A2")
    a1 = WardAdmissionWorkflowService.admit_patient(bed=bed1, patient=_patient(tenant, "Ana"))
    WardAdmissionWorkflowService.admit_patient(bed=bed2, patient=_patient(tenant, "Bruno"))
    with pytest.raises(ValidationError):
        WardAdmissionWorkflowService.transfer_patient(a1, new_bed=bed2)


@pytest.mark.django_db
def test_block_bed_with_active_admission_fails():
    tenant = _tenant()
    ward = _ward(tenant)
    bed = _bed(tenant, ward)
    WardAdmissionWorkflowService.admit_patient(bed=bed, patient=_patient(tenant))
    with pytest.raises(ValidationError):
        WardAdmissionWorkflowService.block_bed(bed)

    # Sem internamento ativo, bloqueia.
    free_bed = _bed(tenant, ward)
    WardAdmissionWorkflowService.block_bed(free_bed)
    free_bed.refresh_from_db()
    assert free_bed.active is False


@pytest.mark.django_db
def test_register_death_closes_admission():
    tenant = _tenant()
    ward = _ward(tenant)
    bed = _bed(tenant, ward)
    admission = WardAdmissionWorkflowService.admit_patient(bed=bed, patient=_patient(tenant))
    WardAdmissionWorkflowService.register_death(admission, notes="PCR")
    admission.refresh_from_db()
    assert admission.active is False
    assert admission.discharged_at is not None
    assert "Óbito" in admission.notes
