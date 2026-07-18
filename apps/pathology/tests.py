from decimal import Decimal
from uuid import uuid4

from django.core.exceptions import ValidationError
import pytest

from apps.clinical.models.patient import Patient
from apps.pathology.models import (
    PathologyAccession,
    PathologyBillingEvent,
    PathologyHistologySlide,
    PathologyMolecularTest,
    PathologySampleReception,
    PathologyStaining,
)
from apps.tenants.models.tenant import Tenant


def _tenant():
    suffix = uuid4().hex[:8]
    return Tenant.objects.create(
        identifier=f"tn-patologia-{suffix}",
        name=f"Tenant Patologia {suffix}",
        domain=f"patologia-{suffix}.test",
        active=True,
    )


def _patient(tenant):
    return Patient.objects.create(
        tenant=tenant,
        name="Paciente Patologia",
        gender="Feminino",
        address_street="Rua Patologia",
    )


def _sample(tenant=None):
    tenant = tenant or _tenant()
    patient = _patient(tenant)
    return PathologySampleReception.objects.create(
        patient=patient,
        specimen_type=PathologySampleReception.SpecimenType.BIOPSY,
        anatomical_site="Mama esquerda",
    )


@pytest.mark.django_db
def test_accession_propagates_tenant_and_updates_sample_identifier():
    sample = _sample()

    accession = PathologyAccession.objects.create(
        sample=sample,
        accession_number="PAT-2026-0000123",
        sub_sample_code="B",
    )

    sample.refresh_from_db()

    assert accession.tenant == sample.tenant
    assert accession.full_code == "PAT-2026-0000123-B"
    assert accession.barcode_value == "PAT-2026-0000123-B"
    assert sample.accession_number == "PAT-2026-0000123"
    assert sample.status == PathologySampleReception.Status.ACCEPTED
    assert sample.accepted_at is not None


@pytest.mark.django_db
def test_staining_updates_slide_and_billing_event_calculates_totals():
    sample = _sample()
    slide = PathologyHistologySlide.objects.create(
        sample=sample,
        slide_number="PAT-2026-0000123-A1-HE",
        block_number="PAT-2026-0000123-A1",
    )

    staining = PathologyStaining.objects.create(
        sample=sample,
        slide=slide,
        stain_type=PathologyStaining.StainType.PAS,
        stain_name="PAS",
        status=PathologyStaining.Status.COMPLETED,
        unit_price=Decimal("100.00"),
    )
    billing_event = PathologyBillingEvent.objects.create(
        sample=sample,
        staining=staining,
        event_type=PathologyBillingEvent.EventType.SPECIAL_STAIN,
        quantity=Decimal("2.00"),
        unit_price=Decimal("100.00"),
        vat_percentage=Decimal("5.00"),
    )

    slide.refresh_from_db()

    assert slide.status == PathologyHistologySlide.Status.STAINED
    assert slide.stain == "PAS"
    assert billing_event.line_total == Decimal("200.00")
    assert billing_event.total_with_vat == Decimal("232.00")


@pytest.mark.django_db
def test_completed_molecular_test_requires_result_or_interpretation():
    sample = _sample()

    with pytest.raises(ValidationError):
        PathologyMolecularTest.objects.create(
            sample=sample,
            test_type=PathologyMolecularTest.TestType.EGFR,
            target="EGFR",
            status=PathologyMolecularTest.Status.COMPLETED,
        )
