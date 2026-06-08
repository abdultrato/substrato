from __future__ import annotations

from datetime import timedelta
from decimal import Decimal
from uuid import uuid4

import pytest
from django.core.exceptions import ValidationError
from django.utils import timezone

from apps.clinical.models.patient import Patient
from apps.clinical_pharmacy.models import (
    AntibioticStewardshipReview,
    ClinicalPharmacyIVPreparation,
    ControlledSubstanceMovement,
    DrugInteractionRule,
    MedicationInteractionCheck,
)
from apps.clinical_pharmacy.services import ClinicalPharmacyWorkflowService
from apps.human_resources.models import Employee
from apps.pharmacy.models.lot import Lot
from apps.pharmacy.models.product import Product
from apps.pharmacy.models.product_category import ProductCategory
from apps.tenants.models.tenant import Tenant


def _tenant():
    suffix = uuid4().hex[:8]
    return Tenant.objects.create(
        identifier=f"tn-cp-{suffix}", name="Tenant CP", domain=f"{suffix}.local", active=True
    )


def _patient(tenant):
    return Patient.objects.create(tenant=tenant, name="Paciente CP", document_number=f"CP-{uuid4().hex[:6]}")


def _pharmacist(tenant):
    return Employee.objects.create(tenant=tenant, name="Farmacêutico", email=f"{uuid4().hex[:8]}@cp.test")


def _product(tenant, name="Cefazolina"):
    category = ProductCategory.objects.create(tenant=tenant, name=f"Cat {uuid4().hex[:4]}", description="")
    return Product.objects.create(
        tenant=tenant, name=name, type=Product.ProductType.MEDICAMENTO, sale_price=Decimal("10.00"), category=category
    )


def _lot(tenant, product, *, days=90):
    return Lot.objects.create(
        tenant=tenant, product=product, lot_number=f"L-{uuid4().hex[:5]}",
        expiration_date=timezone.localdate() + timedelta(days=days), initial_quantity=100,
    )


def _preparation(tenant, patient):
    return ClinicalPharmacyIVPreparation.objects.create(
        tenant=tenant, patient=patient,
        preparation_type=ClinicalPharmacyIVPreparation.PreparationType.ANTIBIOTIC,
        dose_value=Decimal("1.000"), final_volume_ml=Decimal("100.000"), beyond_use_hours=24,
    )


@pytest.mark.django_db
def test_iv_preparation_full_journey():
    tenant = _tenant()
    patient = _patient(tenant)
    pharmacist = _pharmacist(tenant)
    drug = _product(tenant, "Cefazolina")
    drug_lot = _lot(tenant, drug)
    diluent = _product(tenant, "SF 0,9%")
    diluent_lot = _lot(tenant, diluent)

    prep = _preparation(tenant, patient)
    ClinicalPharmacyWorkflowService.add_ingredient(
        prep, product=drug, lot=drug_lot, quantity="1", role="ACTIVE"
    )
    ClinicalPharmacyWorkflowService.add_ingredient(
        prep, product=diluent, lot=diluent_lot, quantity="100", role="DILUENT", quantity_unit="ML"
    )

    ClinicalPharmacyWorkflowService.verify_preparation(prep, verifier=pharmacist)
    assert prep.status == ClinicalPharmacyIVPreparation.Status.VERIFIED

    ClinicalPharmacyWorkflowService.mark_prepared(prep, prepared_by=pharmacist)
    assert prep.status == ClinicalPharmacyIVPreparation.Status.PREPARED
    assert prep.expires_at is not None  # beyond_use_hours aplicado

    ClinicalPharmacyWorkflowService.release_preparation(prep, pharmacist=pharmacist)
    assert prep.status == ClinicalPharmacyIVPreparation.Status.DISPENSED

    ClinicalPharmacyWorkflowService.administer_preparation(prep)
    assert prep.status == ClinicalPharmacyIVPreparation.Status.ADMINISTERED


@pytest.mark.django_db
def test_prepare_requires_ingredients():
    tenant = _tenant()
    prep = _preparation(tenant, _patient(tenant))
    ClinicalPharmacyWorkflowService.verify_preparation(prep)
    with pytest.raises(ValidationError):
        ClinicalPharmacyWorkflowService.mark_prepared(prep)


@pytest.mark.django_db
def test_interaction_check_picks_rule_and_severity():
    tenant = _tenant()
    patient = _patient(tenant)
    a = _product(tenant, "Varfarina")
    b = _product(tenant, "AAS")
    DrugInteractionRule.objects.create(
        tenant=tenant, primary_drug=a, interacting_drug=b,
        severity=DrugInteractionRule.Severity.MAJOR, recommendation="Monitorizar INR",
    )
    check = ClinicalPharmacyWorkflowService.run_interaction_check(patient=patient, primary_drug=a, interacting_drug=b)
    assert check.severity == DrugInteractionRule.Severity.MAJOR
    assert check.rule_id is not None
    assert "INR" in check.recommendation

    with pytest.raises(ValidationError):
        ClinicalPharmacyWorkflowService.override_check(check, override_reason="")
    ClinicalPharmacyWorkflowService.override_check(check, override_reason="Risco aceite, monitorização ativa")
    assert check.status == MedicationInteractionCheck.Status.OVERRIDDEN


@pytest.mark.django_db
def test_controlled_movement_balance_and_reversal():
    tenant = _tenant()
    pharmacist = _pharmacist(tenant)
    drug = _product(tenant, "Morfina")
    lot = _lot(tenant, drug)

    # Sem saldo, dispensa é bloqueada.
    with pytest.raises(ValidationError):
        ClinicalPharmacyWorkflowService.record_controlled_movement(
            product=drug, lot=lot, movement_type=ControlledSubstanceMovement.MovementType.DISPENSE,
            quantity="5", responsible=pharmacist,
        )

    receipt = ClinicalPharmacyWorkflowService.record_controlled_movement(
        product=drug, lot=lot, movement_type=ControlledSubstanceMovement.MovementType.RECEIPT,
        quantity="10", responsible=pharmacist,
    )
    assert receipt.running_balance == Decimal("10.000")

    dispense = ClinicalPharmacyWorkflowService.record_controlled_movement(
        product=drug, lot=lot, movement_type=ControlledSubstanceMovement.MovementType.DISPENSE,
        quantity="4", responsible=pharmacist,
    )
    assert dispense.running_balance == Decimal("6.000")

    # Estorno de uma dispensa devolve ao saldo.
    reversal = ClinicalPharmacyWorkflowService.reverse_controlled_movement(
        dispense, responsible=pharmacist, reason="Dose não administrada"
    )
    assert reversal.movement_type == ControlledSubstanceMovement.MovementType.RETURN
    assert reversal.running_balance == Decimal("10.000")


@pytest.mark.django_db
def test_antibiotic_review_recommendation_and_completion():
    tenant = _tenant()
    patient = _patient(tenant)
    reviewer = _pharmacist(tenant)
    antibiotic = _product(tenant, "Meropenem")
    review = AntibioticStewardshipReview.objects.create(
        tenant=tenant, patient=patient, antibiotic=antibiotic, indication="Sepse abdominal"
    )

    with pytest.raises(ValidationError):
        ClinicalPharmacyWorkflowService.complete_review(review)  # sem recomendação

    ClinicalPharmacyWorkflowService.emit_recommendation(
        review, recommendation="Descalonar para cefalosporina conforme cultura",
        status=AntibioticStewardshipReview.Status.DEESCALATE, reviewer=reviewer,
    )
    assert review.status == AntibioticStewardshipReview.Status.DEESCALATE
    assert review.deescalation_recommended is True
    assert review.reviewed_at is not None

    ClinicalPharmacyWorkflowService.complete_review(review, action_taken="Prescrição ajustada pelo médico")
    assert review.status == AntibioticStewardshipReview.Status.COMPLETED


@pytest.mark.django_db
def test_escalate_requires_reason():
    tenant = _tenant()
    review = AntibioticStewardshipReview.objects.create(
        tenant=tenant, patient=_patient(tenant), antibiotic=_product(tenant, "Pip/Tazo"), indication="Pneumonia"
    )
    with pytest.raises(ValidationError):
        ClinicalPharmacyWorkflowService.emit_recommendation(
            review, recommendation="Escalar cobertura", status=AntibioticStewardshipReview.Status.ESCALATE,
        )
    ClinicalPharmacyWorkflowService.emit_recommendation(
        review, recommendation="Escalar cobertura", status=AntibioticStewardshipReview.Status.ESCALATE,
        escalation_reason="Deterioração clínica",
    )
    assert review.status == AntibioticStewardshipReview.Status.ESCALATE
