from __future__ import annotations

from uuid import uuid4

import pytest
from django.core.exceptions import ValidationError

from apps.clinical.models.patient import Patient
from apps.medical_records.models.medical_record_entry import MedicalRecordEntry
from apps.tenants.models.tenant import Tenant


def _tenant():
    s = uuid4().hex[:8]
    return Tenant.objects.create(identifier=f"tn-mr-{s}", name="Tenant MR", domain=f"{s}.local", active=True)


def _patient(tenant):
    return Patient.objects.create(tenant=tenant, name="Paciente", document_number=f"MR-{uuid4().hex[:6]}")


def _entry(tenant, *, diagnosis="Hipertensão"):
    return MedicalRecordEntry.objects.create(tenant=tenant, patient=_patient(tenant), diagnosis=diagnosis)


@pytest.mark.django_db
def test_finalize_sets_status_and_end_time():
    tenant = _tenant()
    entry = _entry(tenant)
    assert entry.status == MedicalRecordEntry.Status.DRAFT

    entry.finalize()
    assert entry.status == MedicalRecordEntry.Status.FINALIZED
    assert entry.care_end_at is not None

    # Finalizado é imutável → não pode finalizar de novo.
    with pytest.raises(ValidationError):
        entry.finalize()


@pytest.mark.django_db
def test_finalize_requires_clinical_content():
    tenant = _tenant()
    entry = _entry(tenant, diagnosis="")  # sem sintomas/diagnóstico/relatório
    with pytest.raises(ValidationError):
        entry.finalize()
    entry.refresh_from_db()
    assert entry.status == MedicalRecordEntry.Status.DRAFT


@pytest.mark.django_db
def test_cancel_preserves_reason_and_blocks_double_cancel():
    tenant = _tenant()
    entry = _entry(tenant)
    entry.cancel(reason="Registo duplicado")
    assert entry.status == MedicalRecordEntry.Status.CANCELED
    assert "Cancelado" in entry.medical_report

    with pytest.raises(ValidationError):
        entry.cancel()
