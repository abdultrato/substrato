from decimal import Decimal
from uuid import uuid4

import pytest

from apps.clinical.models.lab_exam import LabExam
from apps.clinical.models.sample import Sample
from apps.clinical_laboratory.catalog import sync_legacy_lab_exams
from apps.clinical_laboratory.models import LabTest, SampleType
from apps.tenants.models.tenant import Tenant


def _unique(prefix: str) -> str:
    return f"{prefix}-{uuid4().hex[:8]}"


@pytest.mark.django_db
def test_sync_legacy_lab_exams_backfills_lis_catalog():
    tenant = Tenant.objects.create(identifier=_unique("legacy-lab"), name="Legacy Lab")
    sample = Sample.objects.create(tenant=tenant, name="Soro")
    exam_name = _unique("Ferritina")
    legacy = LabExam.objects.create(
        tenant=tenant,
        name=exam_name,
        sector="Bioquimica",
        method="Quimioluminescencia",
        sample_type=sample,
        price=Decimal("900.00"),
        turnaround_hours=8,
    )

    stats = sync_legacy_lab_exams(tenant)

    assert stats["legacy_tests"] == 1
    test = LabTest.objects.get(tenant=tenant, code=legacy.custom_id)
    assert test.name == exam_name.title()
    assert test.sector.code == "BIO"
    assert test.sample_type == SampleType.SERUM
    assert test.method == "Quimioluminescencia"
    assert test.price == Decimal("900.00")
    assert test.turnaround_hours == 8


@pytest.mark.django_db
def test_sync_legacy_lab_exams_is_idempotent_by_code_and_name():
    tenant = Tenant.objects.create(identifier=_unique("legacy-lab-idem"), name="Legacy Lab Idempotent")
    sample = Sample.objects.create(tenant=tenant, name="Sangue Total")
    exam_name = _unique("Hemoglobina Sync Unica")
    LabExam.objects.create(
        tenant=tenant,
        name=exam_name,
        sector="Hematologia",
        method="Automatizado",
        sample_type=sample,
        price=Decimal("120.00"),
        turnaround_hours=4,
    )

    assert sync_legacy_lab_exams(tenant)["legacy_tests"] == 1
    assert sync_legacy_lab_exams(tenant)["legacy_tests"] == 0
    assert LabTest.objects.filter(tenant=tenant, name=exam_name.title()).count() == 1
