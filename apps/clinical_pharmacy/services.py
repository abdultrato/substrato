from __future__ import annotations

from decimal import Decimal, InvalidOperation

from django.core.exceptions import ValidationError
from django.db import transaction
from django.utils import timezone

from apps.clinical_pharmacy.models import (
    AntibioticStewardshipReview,
    ClinicalPharmacyIngredient,
    ClinicalPharmacyIVPreparation,
    ControlledSubstanceMovement,
    MedicationInteractionCheck,
)

ZERO = Decimal("0.000")
_OUTFLOW = {
    ControlledSubstanceMovement.MovementType.DISPENSE,
    ControlledSubstanceMovement.MovementType.ADMINISTER,
    ControlledSubstanceMovement.MovementType.WASTE,
}


def _append(current: str, label: str, text: str) -> str:
    if not text:
        return current
    return f"{current}\n[{label}] {text}".strip()


def _to_decimal(value, *, field: str = "quantity") -> Decimal:
    try:
        return Decimal(str(value))
    except (InvalidOperation, TypeError, ValueError) as exc:
        raise ValidationError({field: "Quantidade numérica inválida."}) from exc


class ClinicalPharmacyWorkflowService:
    """Casos de uso de farmácia clínica e terapia IV (§8.12): validar → preparar → liberar → administrar,
    verificação de interações, controlados e stewardship antibiótico."""

    _EDITABLE_PREP = {
        ClinicalPharmacyIVPreparation.Status.REQUESTED,
        ClinicalPharmacyIVPreparation.Status.VERIFIED,
        ClinicalPharmacyIVPreparation.Status.IN_PREPARATION,
    }

    # ------------------------------------------------------------------ #
    # Preparação IV
    # ------------------------------------------------------------------ #
    @staticmethod
    @transaction.atomic
    def add_ingredient(
        preparation: ClinicalPharmacyIVPreparation,
        *,
        product,
        lot,
        quantity,
        role: str = ClinicalPharmacyIngredient.IngredientRole.ACTIVE,
        quantity_unit=None,
        concentration: str = "",
        controlled_substance: bool = False,
        hazardous: bool = False,
        notes: str = "",
    ) -> ClinicalPharmacyIngredient:
        if preparation.status not in ClinicalPharmacyWorkflowService._EDITABLE_PREP:
            raise ValidationError("A preparação não pode receber ingredientes no estado atual.")
        return ClinicalPharmacyIngredient.objects.create(
            tenant=preparation.tenant,
            preparation=preparation,
            product=product,
            lot=lot,
            role=role,
            quantity_value=_to_decimal(quantity),
            quantity_unit=quantity_unit or ClinicalPharmacyIngredient._meta.get_field("quantity_unit").default,
            concentration=concentration,
            controlled_substance=controlled_substance,
            hazardous=hazardous,
            notes=notes,
        )

    @staticmethod
    @transaction.atomic
    def verify_preparation(
        preparation: ClinicalPharmacyIVPreparation, *, verifier=None, compatibility_ok: bool = True
    ) -> ClinicalPharmacyIVPreparation:
        """Validação farmacêutica da preparação (§8.5)."""
        if preparation.status != ClinicalPharmacyIVPreparation.Status.REQUESTED:
            raise ValidationError("Apenas preparações solicitadas podem ser validadas.")
        preparation.status = ClinicalPharmacyIVPreparation.Status.VERIFIED
        preparation.verified_at = timezone.now()
        if verifier is not None:
            preparation.verifier = verifier
        preparation.compatibility_check_passed = compatibility_ok
        preparation.save()
        return preparation

    @staticmethod
    @transaction.atomic
    def mark_prepared(
        preparation: ClinicalPharmacyIVPreparation, *, prepared_by=None, sterility_ok: bool = True
    ) -> ClinicalPharmacyIVPreparation:
        if preparation.status not in {
            ClinicalPharmacyIVPreparation.Status.VERIFIED,
            ClinicalPharmacyIVPreparation.Status.IN_PREPARATION,
        }:
            raise ValidationError("A preparação precisa estar validada antes de ser preparada.")
        if not preparation.ingredients.exists():
            raise ValidationError("Registe os ingredientes antes de preparar.")
        preparation.prepared_at = timezone.now()
        if prepared_by is not None:
            preparation.prepared_by = prepared_by
        preparation.sterility_check_passed = sterility_ok
        preparation.save()  # save() do modelo define expires_at e status PREPARED
        return preparation

    @staticmethod
    @transaction.atomic
    def release_preparation(
        preparation: ClinicalPharmacyIVPreparation, *, pharmacist=None, responsible=None
    ) -> ClinicalPharmacyIVPreparation:
        """Libera/dispensa a preparação para a enfermagem, baixando controlados (§8.5)."""
        if preparation.status != ClinicalPharmacyIVPreparation.Status.PREPARED:
            raise ValidationError("Apenas preparações já preparadas podem ser liberadas.")
        if not preparation.compatibility_check_passed:
            raise ValidationError("A preparação precisa de verificação de compatibilidade aprovada.")
        if preparation.expires_at and preparation.expires_at <= timezone.now():
            raise ValidationError("Preparação vencida não pode ser liberada.")
        if pharmacist is not None:
            preparation.pharmacist = pharmacist
        preparation.status = ClinicalPharmacyIVPreparation.Status.DISPENSED
        preparation.dispensed_at = timezone.now()
        preparation.save()

        # Baixa de substâncias controladas usadas na preparação.
        for ingredient in preparation.ingredients.filter(controlled_substance=True):
            ClinicalPharmacyWorkflowService.record_controlled_movement(
                product=ingredient.product,
                lot=ingredient.lot,
                movement_type=ControlledSubstanceMovement.MovementType.DISPENSE,
                quantity=ingredient.quantity_value,
                unit=ingredient.quantity_unit,
                patient=preparation.patient,
                preparation=preparation,
                responsible=responsible or preparation.pharmacist,
            )
        return preparation

    @staticmethod
    @transaction.atomic
    def administer_preparation(preparation: ClinicalPharmacyIVPreparation) -> ClinicalPharmacyIVPreparation:
        if preparation.status != ClinicalPharmacyIVPreparation.Status.DISPENSED:
            raise ValidationError("Apenas preparações dispensadas podem ser administradas.")
        if preparation.expires_at and preparation.expires_at <= timezone.now():
            raise ValidationError("Preparação vencida não pode ser administrada.")
        preparation.status = ClinicalPharmacyIVPreparation.Status.ADMINISTERED
        preparation.save()
        return preparation

    @staticmethod
    @transaction.atomic
    def cancel_preparation(preparation: ClinicalPharmacyIVPreparation, *, reason: str = "") -> ClinicalPharmacyIVPreparation:
        if preparation.status in {
            ClinicalPharmacyIVPreparation.Status.ADMINISTERED,
            ClinicalPharmacyIVPreparation.Status.CANCELLED,
        }:
            raise ValidationError("Preparação administrada/cancelada não pode ser cancelada.")
        if not reason.strip():
            raise ValidationError({"reason": "Informe o motivo do cancelamento."})
        preparation.status = ClinicalPharmacyIVPreparation.Status.CANCELLED
        preparation.notes = _append(preparation.notes, "Cancelamento", reason)
        preparation.save()
        return preparation

    @staticmethod
    @transaction.atomic
    def discard_preparation(preparation: ClinicalPharmacyIVPreparation, *, reason: str = "") -> ClinicalPharmacyIVPreparation:
        if not reason.strip():
            raise ValidationError({"reason": "Informe o motivo do descarte."})
        preparation.status = ClinicalPharmacyIVPreparation.Status.REJECTED
        preparation.rejection_reason = reason
        preparation.save()
        return preparation

    # ------------------------------------------------------------------ #
    # Verificação de interações
    # ------------------------------------------------------------------ #
    @staticmethod
    @transaction.atomic
    def run_interaction_check(
        *,
        patient,
        primary_drug,
        interacting_drug,
        prescription_item=None,
        pharmacist=None,
        clinical_context: str = "",
    ) -> MedicationInteractionCheck:
        """Verifica o par de medicamentos; o save() do modelo localiza a regra e define a gravidade (§8.8)."""
        return MedicationInteractionCheck.objects.create(
            tenant=patient.tenant,
            patient=patient,
            prescription_item=prescription_item,
            primary_drug=primary_drug,
            interacting_drug=interacting_drug,
            pharmacist=pharmacist,
            clinical_context=clinical_context,
            status=MedicationInteractionCheck.Status.PENDING,
        )

    @staticmethod
    @transaction.atomic
    def resolve_check(
        check: MedicationInteractionCheck, *, action_taken: str = "", clear: bool = False, pharmacist=None
    ) -> MedicationInteractionCheck:
        if check.status in {MedicationInteractionCheck.Status.OVERRIDDEN, MedicationInteractionCheck.Status.CLEARED}:
            raise ValidationError("Verificação já encerrada.")
        check.status = (
            MedicationInteractionCheck.Status.CLEARED if clear else MedicationInteractionCheck.Status.REVIEWED
        )
        if action_taken:
            check.action_taken = action_taken
        if pharmacist is not None:
            check.pharmacist = pharmacist
        check.save()
        return check

    @staticmethod
    @transaction.atomic
    def override_check(
        check: MedicationInteractionCheck, *, override_reason: str = "", pharmacist=None
    ) -> MedicationInteractionCheck:
        if not override_reason.strip():
            raise ValidationError({"override_reason": "Informe a justificação para liberar a interação."})
        check.status = MedicationInteractionCheck.Status.OVERRIDDEN
        check.override_reason = override_reason
        if pharmacist is not None:
            check.pharmacist = pharmacist
        check.save()  # save()/clean() do modelo exige override_reason
        return check

    # ------------------------------------------------------------------ #
    # Substâncias controladas
    # ------------------------------------------------------------------ #
    @staticmethod
    def _lot_balance(tenant_id, lot_id) -> Decimal:
        total = ZERO
        queryset = ControlledSubstanceMovement.all_objects.filter(
            tenant_id=tenant_id, lot_id=lot_id, deleted=False
        ).only("movement_type", "quantity")
        for movement in queryset:
            total += movement.signed_quantity
        return total

    @staticmethod
    @transaction.atomic
    def record_controlled_movement(
        *,
        product,
        lot,
        movement_type: str,
        quantity,
        unit=None,
        schedule=None,
        patient=None,
        prescription_item=None,
        preparation=None,
        responsible=None,
        witness=None,
        reason: str = "",
        source: str = "",
        destination: str = "",
    ) -> ControlledSubstanceMovement:
        """Regista um movimento no livro de controlados, garantindo saldo nas saídas (§8.9)."""
        qty = _to_decimal(quantity)
        if qty <= ZERO:
            raise ValidationError({"quantity": "A quantidade deve ser positiva."})
        signed = -qty if movement_type in _OUTFLOW else qty
        if movement_type in _OUTFLOW:
            balance = ClinicalPharmacyWorkflowService._lot_balance(lot.tenant_id, lot.id)
            if balance + signed < ZERO:
                raise ValidationError({"quantity": f"Saldo de controlado insuficiente no lote (disponível: {balance})."})
        return ControlledSubstanceMovement.objects.create(
            tenant=product.tenant,
            product=product,
            lot=lot,
            patient=patient,
            prescription_item=prescription_item,
            preparation=preparation,
            movement_type=movement_type,
            schedule=schedule or ControlledSubstanceMovement.ControlledSchedule.OTHER,
            quantity=qty,
            unit=unit or ControlledSubstanceMovement._meta.get_field("unit").default,
            responsible=responsible,
            witness=witness,
            source=source,
            destination=destination,
            reason=reason,
        )

    @staticmethod
    @transaction.atomic
    def reverse_controlled_movement(
        movement: ControlledSubstanceMovement, *, responsible=None, witness=None, reason: str = ""
    ) -> ControlledSubstanceMovement:
        """Estorno via lançamento compensatório (o livro é append-only) (§8.9)."""
        if not reason.strip():
            raise ValidationError({"reason": "Informe o motivo do estorno."})
        if movement.signed_quantity < ZERO:
            # Saída → devolve (entrada compensatória).
            reverse_type = ControlledSubstanceMovement.MovementType.RETURN
        else:
            # Entrada → descarta (saída compensatória, exige testemunha).
            reverse_type = ControlledSubstanceMovement.MovementType.WASTE
        return ClinicalPharmacyWorkflowService.record_controlled_movement(
            product=movement.product,
            lot=movement.lot,
            movement_type=reverse_type,
            quantity=movement.quantity,
            unit=movement.unit,
            schedule=movement.schedule,
            patient=movement.patient,
            responsible=responsible or movement.responsible,
            witness=witness or movement.witness,
            reason=_append("", "Estorno", reason),
        )

    # ------------------------------------------------------------------ #
    # Stewardship antibiótico
    # ------------------------------------------------------------------ #
    @staticmethod
    @transaction.atomic
    def emit_recommendation(
        review: AntibioticStewardshipReview,
        *,
        recommendation: str,
        status: str,
        reviewer=None,
        escalation_reason: str = "",
    ) -> AntibioticStewardshipReview:
        if review.status == AntibioticStewardshipReview.Status.COMPLETED:
            raise ValidationError("Revisão concluída não pode ser alterada.")
        if not recommendation.strip():
            raise ValidationError({"recommendation": "Informe a recomendação da revisão."})
        valid = {
            AntibioticStewardshipReview.Status.APPROVED,
            AntibioticStewardshipReview.Status.DEESCALATE,
            AntibioticStewardshipReview.Status.ESCALATE,
            AntibioticStewardshipReview.Status.STOP,
        }
        if status not in valid:
            raise ValidationError({"status": "Recomendação inválida."})
        review.recommendation = recommendation
        review.reviewed_at = timezone.now()
        review.status = status
        if reviewer is not None:
            review.reviewer = reviewer
        if status == AntibioticStewardshipReview.Status.ESCALATE:
            review.escalation_reason = escalation_reason
        if status == AntibioticStewardshipReview.Status.DEESCALATE:
            review.deescalation_recommended = True
        review.save()
        return review

    @staticmethod
    @transaction.atomic
    def complete_review(review: AntibioticStewardshipReview, *, action_taken: str = "") -> AntibioticStewardshipReview:
        if review.status == AntibioticStewardshipReview.Status.PENDING:
            raise ValidationError("Emita uma recomendação antes de concluir a revisão.")
        review.status = AntibioticStewardshipReview.Status.COMPLETED
        if action_taken:
            review.action_taken = action_taken
        if not review.reviewed_at:
            review.reviewed_at = timezone.now()
        review.save()
        return review
