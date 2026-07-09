from decimal import Decimal
from uuid import uuid4

import pytest

from api.v1.clinical.filters import LabRequestFilter
from apps.clinical.models.lab_request import LabRequest
from apps.clinical.models.lab_request_item import LabRequestItem
from apps.clinical.models.patient import Patient
from apps.clinical_laboratory.models import LabSector, LabTest, SampleType
from apps.tenants.models.tenant import Tenant


def _tenant():
    suffix = uuid4().hex[:8]
    return Tenant.objects.create(
        identifier=f"tn-lab-flow-{suffix}",
        name="Tenant Lab Flow",
        domain=f"tn-lab-flow-{suffix}.testserver",
    )


def _patient(tenant):
    return Patient.objects.create(tenant=tenant, name=f"Paciente {uuid4().hex[:6]}")


def _test(tenant, *, name, method):
    sector, _ = LabSector.objects.get_or_create(
        tenant=tenant,
        code="BIO",
        defaults={"name": "Bioquimica"},
    )
    return LabTest.objects.create(
        tenant=tenant,
        name=name,
        code=f"T-{uuid4().hex[:6]}",
        sector=sector,
        sample_type=SampleType.SERUM,
        method=method,
        price=Decimal("100.00"),
        turnaround_hours=24,
    )


@pytest.mark.django_db
def test_received_samples_without_collected_at_move_from_reception_to_orders():
    tenant = _tenant()
    patient = _patient(tenant)
    request = LabRequest.objects.create(
        tenant=tenant,
        patient=patient,
        type=LabRequest.Type.LABORATORY,
        status="pendente",
        collected_at=None,
    )
    request.add_exam(_test(tenant, name="Coprocultura", method="Cultura"))
    request.add_exam(_test(tenant, name="ALT/TGP", method="CineticoUV"))
    request.items.update(sample_status=LabRequestItem.SampleStatus.RECEIVED)

    filters = LabRequestFilter()
    base = LabRequest.objects.filter(pk=request.pk)

    assert not filters.filter_fase(base, "fase", "rececao_amostras").exists()
    assert filters.filter_fase(base, "fase", "pedidos").exists()
