from __future__ import annotations

from datetime import timedelta
from decimal import Decimal
from uuid import uuid4

import pytest
from django.core.exceptions import ValidationError
from django.utils import timezone

from apps.clinical.models.patient import Patient
from apps.public_health.models import (
    AdverseEventFollowingImmunization,
    ImmunizationRecord,
    PublicHealthNotification,
    VaccinationCampaign,
    VaccineLot,
    VaccineProduct,
)
from apps.public_health.services import PublicHealthWorkflowService
from apps.tenants.models.tenant import Tenant


def _tenant():
    suffix = uuid4().hex[:8]
    return Tenant.objects.create(
        identifier=f"tn-ph-{suffix}", name="Tenant PH", domain=f"{suffix}.local", active=True
    )


def _patient(tenant):
    return Patient.objects.create(tenant=tenant, name="Paciente PH", document_number=f"PH-{uuid4().hex[:6]}")


def _vaccine(tenant, *, booster_days=30):
    return VaccineProduct.objects.create(
        tenant=tenant, name="Sarampo", disease="Sarampo",
        dose_count_required=2, booster_interval_days=booster_days,
    )


def _lot(tenant, vaccine, *, doses=10, days=120, status=VaccineLot.Status.ACTIVE):
    return VaccineLot.objects.create(
        tenant=tenant, vaccine=vaccine, lot_number=f"L-{uuid4().hex[:5]}",
        expiration_date=timezone.localdate() + timedelta(days=days),
        doses_received=doses, status=status,
    )


@pytest.mark.django_db
def test_register_immunization_decrements_lot_and_sets_next_dose():
    tenant = _tenant()
    patient = _patient(tenant)
    vaccine = _vaccine(tenant, booster_days=30)
    lot = _lot(tenant, vaccine, doses=5)

    record = PublicHealthWorkflowService.register_immunization(patient=patient, lot=lot)
    lot.refresh_from_db()
    assert record.status == ImmunizationRecord.Status.ADMINISTERED
    assert lot.doses_available == 4  # baixa de 1 dose
    assert record.next_due_date == record.administered_at.date() + timedelta(days=30)


@pytest.mark.django_db
def test_register_blocks_inactive_vaccine_and_unusable_lot():
    tenant = _tenant()
    patient = _patient(tenant)
    vaccine = _vaccine(tenant)
    inactive_lot = _lot(tenant, vaccine, status=VaccineLot.Status.RECEIVED)
    # Lote não ativo bloqueia.
    with pytest.raises(ValidationError):
        PublicHealthWorkflowService.register_immunization(patient=patient, lot=inactive_lot)

    PublicHealthWorkflowService.activate_lot(inactive_lot)
    PublicHealthWorkflowService.deactivate_vaccine(vaccine)
    with pytest.raises(ValidationError):
        PublicHealthWorkflowService.register_immunization(patient=patient, lot=inactive_lot)


@pytest.mark.django_db
def test_duplicate_dose_blocked():
    tenant = _tenant()
    patient = _patient(tenant)
    vaccine = _vaccine(tenant)
    lot = _lot(tenant, vaccine, doses=5)
    PublicHealthWorkflowService.register_immunization(patient=patient, lot=lot, dose_number=1)
    with pytest.raises(ValidationError):
        PublicHealthWorkflowService.register_immunization(patient=patient, lot=lot, dose_number=1)
    # Dose 2 é permitida.
    PublicHealthWorkflowService.register_immunization(patient=patient, lot=lot, dose_number=2)


@pytest.mark.django_db
def test_cancel_immunization_restores_lot_dose():
    tenant = _tenant()
    patient = _patient(tenant)
    vaccine = _vaccine(tenant)
    lot = _lot(tenant, vaccine, doses=1)
    record = PublicHealthWorkflowService.register_immunization(patient=patient, lot=lot)
    lot.refresh_from_db()
    assert lot.doses_available == 0
    assert lot.status == VaccineLot.Status.DEPLETED  # esgotou

    PublicHealthWorkflowService.cancel_immunization(record, reason="Registo errado")
    lot.refresh_from_db()
    record.refresh_from_db()
    assert record.status == ImmunizationRecord.Status.CANCELLED
    assert lot.doses_available == 1
    assert lot.status == VaccineLot.Status.ACTIVE  # reaberto


@pytest.mark.django_db
def test_recall_blocks_application():
    tenant = _tenant()
    patient = _patient(tenant)
    vaccine = _vaccine(tenant)
    lot = _lot(tenant, vaccine, doses=5)
    PublicHealthWorkflowService.recall_lot(lot, reason="Alerta do fabricante")
    assert lot.status == VaccineLot.Status.RECALLED
    with pytest.raises(ValidationError):
        PublicHealthWorkflowService.register_immunization(patient=patient, lot=lot)


@pytest.mark.django_db
def test_severe_aefi_flow_to_notification():
    tenant = _tenant()
    patient = _patient(tenant)
    vaccine = _vaccine(tenant)
    lot = _lot(tenant, vaccine, doses=5)
    record = PublicHealthWorkflowService.register_immunization(patient=patient, lot=lot)

    aefi = PublicHealthWorkflowService.register_adverse_event(
        immunization_record=record, symptoms="Anafilaxia", onset_at=timezone.now(),
        severity=AdverseEventFollowingImmunization.Severity.SEVERE,
    )
    assert aefi.serious is True  # grave → serious automático
    assert aefi.investigation_due_at is not None

    PublicHealthWorkflowService.classify_adverse_event(aefi, severity=AdverseEventFollowingImmunization.Severity.CRITICAL)
    assert aefi.status == AdverseEventFollowingImmunization.Status.UNDER_INVESTIGATION

    notification = PublicHealthWorkflowService.generate_aefi_notification(aefi)
    assert notification.status == PublicHealthNotification.Status.PENDING
    assert notification.event_type == PublicHealthNotification.EventType.AEFI

    PublicHealthWorkflowService.send_notification(notification, external_reference="SIPNI-123")
    aefi.refresh_from_db()
    assert notification.status == PublicHealthNotification.Status.SENT
    assert notification.sent_at is not None
    assert aefi.status == AdverseEventFollowingImmunization.Status.SENT_TO_AUTHORITY


@pytest.mark.django_db
def test_resolve_aefi_requires_known_outcome():
    tenant = _tenant()
    patient = _patient(tenant)
    vaccine = _vaccine(tenant)
    lot = _lot(tenant, vaccine, doses=5)
    record = PublicHealthWorkflowService.register_immunization(patient=patient, lot=lot)
    aefi = PublicHealthWorkflowService.register_adverse_event(
        immunization_record=record, symptoms="Febre", onset_at=timezone.now()
    )
    with pytest.raises(ValidationError):
        PublicHealthWorkflowService.resolve_adverse_event(aefi, outcome=AdverseEventFollowingImmunization.Outcome.UNKNOWN)
    PublicHealthWorkflowService.resolve_adverse_event(aefi, outcome=AdverseEventFollowingImmunization.Outcome.RECOVERED)
    assert aefi.status == AdverseEventFollowingImmunization.Status.RESOLVED


@pytest.mark.django_db
def test_campaign_lifecycle_and_dose_requires_active():
    tenant = _tenant()
    patient = _patient(tenant)
    vaccine = _vaccine(tenant)
    lot = _lot(tenant, vaccine, doses=5)
    campaign = VaccinationCampaign.objects.create(
        tenant=tenant, name="Campanha Sarampo", vaccine=vaccine, target_doses=100,
    )
    # Campanha planeada não aceita doses.
    with pytest.raises(ValidationError):
        PublicHealthWorkflowService.register_immunization(patient=patient, lot=lot, campaign=campaign)

    PublicHealthWorkflowService.activate_campaign(campaign)
    record = PublicHealthWorkflowService.register_immunization(patient=patient, lot=lot, campaign=campaign)
    assert record.campaign_id == campaign.id
    assert campaign.administered_doses == 1
