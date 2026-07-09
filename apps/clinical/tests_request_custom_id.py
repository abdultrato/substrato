from __future__ import annotations

from uuid import uuid4

import pytest
from django.utils import timezone

from apps.clinical.models.lab_request import LabRequest
from apps.clinical.models.patient import Patient
from apps.pharmacy.models.material_requisition import MaterialRequisition, RequestingSector
from apps.tenants.models.tenant import Tenant
from core.identity.custom_id import parse_annual_daily_custom_id_sequence


def _tenant():
    suffix = uuid4().hex[:8]
    return Tenant.objects.create(
        identifier=f"tn-req-code-{suffix}",
        name="Tenant Requisition Codes",
        domain=f"tn-req-code-{suffix}.testserver",
    )


def _patient(tenant):
    return Patient.objects.create(tenant=tenant, name=f"Paciente {uuid4().hex[:6]}")


def _sequence(code: str, prefix: str) -> int:
    sequence = parse_annual_daily_custom_id_sequence(
        code,
        prefix=prefix,
        year=timezone.localdate().strftime("%Y"),
    )
    assert sequence is not None
    return sequence


@pytest.mark.django_db
def test_lab_request_custom_id_uses_lab_exam_pattern_and_annual_sequence():
    tenant = _tenant()
    patient = _patient(tenant)

    first = LabRequest.objects.create(tenant=tenant, patient=patient, type=LabRequest.Type.LABORATORY)
    second = LabRequest.objects.create(tenant=tenant, patient=patient, type=LabRequest.Type.LABORATORY)

    assert first.custom_id.startswith(f"REQ/LAB/EXA/{timezone.localdate():%Y%m%d}")
    assert second.custom_id.startswith(f"REQ/LAB/EXA/{timezone.localdate():%Y%m%d}")
    assert _sequence(second.custom_id, "REQ/LAB/EXA") == _sequence(first.custom_id, "REQ/LAB/EXA") + 1


@pytest.mark.django_db
def test_medical_exam_request_custom_id_uses_medical_exam_pattern():
    tenant = _tenant()
    patient = _patient(tenant)

    request = LabRequest.objects.create(tenant=tenant, patient=patient, type=LabRequest.Type.MEDICAL_EXAM)

    assert request.custom_id.startswith(f"REQ/MED/EXA/{timezone.localdate():%Y%m%d}")
    assert _sequence(request.custom_id, "REQ/MED/EXA") >= 1


@pytest.mark.django_db
def test_material_requisition_custom_id_uses_pharmacy_material_pattern():
    tenant = _tenant()

    requisition = MaterialRequisition.objects.create(tenant=tenant, sector=RequestingSector.ENFERMAGEM)

    assert requisition.custom_id.startswith(f"REQ/MAT/FAR/{timezone.localdate():%Y%m%d}")
    assert _sequence(requisition.custom_id, "REQ/MAT/FAR") >= 1
