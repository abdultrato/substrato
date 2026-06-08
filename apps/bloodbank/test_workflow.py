from __future__ import annotations

import datetime
from uuid import uuid4

import pytest
from django.core.exceptions import ValidationError
from django.utils import timezone

from apps.bloodbank.models.blood_bank import BloodDonation, BloodUnit
from apps.bloodbank.services.donation_workflow import BloodDonationWorkflowService
from apps.clinical.models.patient import Patient
from apps.tenants.models.tenant import Tenant


def _tenant():
    suffix = uuid4().hex[:8]
    return Tenant.objects.create(
        identifier=f"tn-bb-{suffix}", name="Tenant BB", domain=f"{suffix}.local", active=True
    )


def _donor(tenant):
    return Patient.objects.create(
        tenant=tenant, name="Doador", document_number=f"BB-{uuid4().hex[:6]}",
        birth_date=datetime.date(1990, 1, 1),
    )


def _donation(tenant, *, positive_hiv=False):
    neg = BloodDonation.TestResult.NEGATIVE
    return BloodDonation.objects.create(
        tenant=tenant,
        donor=_donor(tenant),
        bag_identifier=f"BAG-{uuid4().hex[:8]}",
        blood_type=BloodDonation._meta.get_field("blood_type").default,
        donor_weight_kg=70,
        hemoglobin_g_dl=14,
        collected_at=timezone.now(),
        hiv_test=BloodDonation.TestResult.POSITIVE if positive_hiv else neg,
        syphilis_rpr_test=neg,
        hepatitis_b_hbsag_test=neg,
        hepatitis_c_anti_hcv_test=neg,
        malaria_test=neg,
    )


@pytest.mark.django_db
def test_screening_then_collection_creates_available_unit():
    tenant = _tenant()
    donation = _donation(tenant)

    BloodDonationWorkflowService.start_screening(donation)
    assert donation.status == BloodDonation.DonationStatus.SCREENING

    BloodDonationWorkflowService.approve_screening(donation)
    assert donation.screening_status == BloodDonation.ScreeningStatus.APPROVED

    BloodDonationWorkflowService.complete_collection(donation)
    assert donation.status == BloodDonation.DonationStatus.COMPLETED

    units = BloodUnit.objects.filter(donation=donation)
    assert units.count() == 1
    assert units.first().status == BloodUnit.UnitStatus.AVAILABLE  # testes negativos → disponível


@pytest.mark.django_db
def test_complete_requires_approved_screening():
    tenant = _tenant()
    donation = _donation(tenant)
    BloodDonationWorkflowService.start_screening(donation)
    with pytest.raises(ValidationError):
        BloodDonationWorkflowService.complete_collection(donation)
    assert not BloodUnit.objects.filter(donation=donation).exists()


@pytest.mark.django_db
def test_approve_requires_negative_tests():
    tenant = _tenant()
    donation = _donation(tenant, positive_hiv=True)
    with pytest.raises(ValidationError):
        BloodDonationWorkflowService.approve_screening(donation)


@pytest.mark.django_db
def test_reject_screening_blocks_collection():
    tenant = _tenant()
    donation = _donation(tenant)
    BloodDonationWorkflowService.reject_screening(donation, reason="Questionário")
    assert donation.screening_status == BloodDonation.ScreeningStatus.REJECTED
    with pytest.raises(ValidationError):
        BloodDonationWorkflowService.complete_collection(donation)


@pytest.mark.django_db
def test_cancel_blocks_completion():
    tenant = _tenant()
    donation = _donation(tenant)
    BloodDonationWorkflowService.cancel(donation, reason="Desistência do doador")
    assert donation.status == BloodDonation.DonationStatus.CANCELED
    with pytest.raises(ValidationError):
        BloodDonationWorkflowService.complete_collection(donation)
    with pytest.raises(ValidationError):
        BloodDonationWorkflowService.cancel(donation)
