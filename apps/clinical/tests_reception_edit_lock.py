"""Bloqueio de edição pela recepção após o laboratório receber amostras.

Depois de as amostras serem recebidas pelo laboratório, a composição da
requisição fica imutável para a recepção; a correcção passa por pedidos de
nota de crédito à Contabilidade (um por item da requisição).
"""

from __future__ import annotations

from decimal import Decimal
from uuid import uuid4

import pytest
from rest_framework import serializers as drf_serializers

from api.v1.clinical.serializers import LabRequestSerializer
from apps.billing.models.credit_note_request import CreditNoteRequest
from apps.billing.models.invoice import Invoice
from apps.clinical.models.lab_request import LabRequest
from apps.clinical.models.lab_request_item import LabRequestItem
from apps.clinical.models.medical_exam import MedicalExam
from apps.clinical.models.patient import Patient
from apps.tenants.models.tenant import Tenant


def _tenant():
    suffix = uuid4().hex[:8]
    return Tenant.objects.create(
        identifier=f"tn-edit-lock-{suffix}",
        name="Tenant Edit Lock",
        domain=f"tn-edit-lock-{suffix}.testserver",
    )


def _patient(tenant):
    return Patient.objects.create(tenant=tenant, name=f"Paciente {uuid4().hex[:6]}")


def _medical_exam(tenant, name):
    return MedicalExam.objects.create(tenant=tenant, name=name, price=Decimal("150.00"))


def _med_request(tenant, patient, exams):
    request = LabRequest.objects.create(tenant=tenant, patient=patient, type=LabRequest.Type.MEDICAL_EXAM)
    for exam in exams:
        request.add_medical_exam(exam)
    return request


@pytest.mark.django_db
def test_update_allowed_before_lab_receives_samples():
    tenant = _tenant()
    patient = _patient(tenant)
    exam_a = _medical_exam(tenant, "Raio-X Tórax")
    exam_b = _medical_exam(tenant, "Ecografia Abdominal")
    request = _med_request(tenant, patient, [exam_a])

    LabRequestSerializer().update(request, {"medical_exams": [exam_a, exam_b]})

    ids = set(request.items.filter(deleted=False).values_list("medical_exam_id", flat=True))
    assert ids == {exam_a.id, exam_b.id}


@pytest.mark.django_db
def test_update_blocked_after_lab_receives_samples():
    tenant = _tenant()
    patient = _patient(tenant)
    exam_a = _medical_exam(tenant, "Hemograma Ocupacional")
    exam_b = _medical_exam(tenant, "Audiometria")
    request = _med_request(tenant, patient, [exam_a])

    request.items.update(sample_status=LabRequestItem.SampleStatus.RECEIVED)

    with pytest.raises(drf_serializers.ValidationError) as excinfo:
        LabRequestSerializer().update(request, {"medical_exams": [exam_a, exam_b]})

    assert "nota de crédito" in str(excinfo.value)
    # Composição intacta.
    ids = set(request.items.filter(deleted=False).values_list("medical_exam_id", flat=True))
    assert ids == {exam_a.id}


@pytest.mark.django_db
def test_scalar_update_still_allowed_after_reception():
    tenant = _tenant()
    patient = _patient(tenant)
    exam = _medical_exam(tenant, "Espirometria")
    request = _med_request(tenant, patient, [exam])
    request.items.update(sample_status=LabRequestItem.SampleStatus.RECEIVED)

    # PATCH sem mexer na composição (ex.: notas clínicas) continua permitido.
    updated = LabRequestSerializer().update(request, {"requires_fasting": True})
    assert updated.requires_fasting is True


@pytest.mark.django_db
def test_solicitar_notas_credito_creates_one_request_per_item():
    tenant = _tenant()
    patient = _patient(tenant)
    exam_a = _medical_exam(tenant, "Raio-X Coluna")
    exam_b = _medical_exam(tenant, "Electrocardiograma")
    request = _med_request(tenant, patient, [exam_a, exam_b])
    request.items.update(sample_status=LabRequestItem.SampleStatus.RECEIVED)

    invoice = Invoice.objects.create(
        tenant=tenant,
        patient=patient,
        request=request,
        origin=Invoice.Origin.CLINICAL,
    )

    created = request.solicitar_notas_credito(reason="Exame lançado em duplicado")

    assert len(created) == 2
    assert all(isinstance(c, CreditNoteRequest) for c in created)
    assert all(c.status == CreditNoteRequest.Status.PENDING for c in created)
    assert all(c.invoice_id == invoice.id for c in created)
    reasons = " | ".join(c.reason for c in created)
    assert "Raio-X Coluna" in reasons and "Electrocardiograma" in reasons

    # Repetir com pedidos pendentes é recusado (sem duplicação).
    from django.core.exceptions import ValidationError

    with pytest.raises(ValidationError):
        request.solicitar_notas_credito()


@pytest.mark.django_db
def test_solicitar_notas_credito_requires_invoice():
    from django.core.exceptions import ValidationError

    tenant = _tenant()
    patient = _patient(tenant)
    exam = _medical_exam(tenant, "Tomografia")
    request = _med_request(tenant, patient, [exam])

    with pytest.raises(ValidationError):
        request.solicitar_notas_credito()
