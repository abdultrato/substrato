from __future__ import annotations

from django.core.exceptions import ValidationError
from django.db import transaction
from django.utils import timezone

from apps.public_health.models import (
    AdverseEventFollowingImmunization,
    ImmunizationRecord,
    PublicHealthNotification,
    VaccinationCampaign,
    VaccinationCampaignTarget,
    VaccineLot,
    VaccineProduct,
)


def _append(current: str, label: str, text: str) -> str:
    if not text:
        return current
    return f"{current}\n[{label}] {text}".strip()


class PublicHealthWorkflowService:
    """Casos de uso de imunização e saúde pública (§10.14): catálogo → lote → campanha → registo → AEFI → notificação."""

    # ------------------------------------------------------------------ #
    # Vacina (catálogo)
    # ------------------------------------------------------------------ #
    @staticmethod
    @transaction.atomic
    def activate_vaccine(vaccine: VaccineProduct) -> VaccineProduct:
        vaccine.active = True
        vaccine.save()
        return vaccine

    @staticmethod
    @transaction.atomic
    def deactivate_vaccine(vaccine: VaccineProduct) -> VaccineProduct:
        vaccine.active = False
        vaccine.save()
        return vaccine

    # ------------------------------------------------------------------ #
    # Lote de vacina
    # ------------------------------------------------------------------ #
    @staticmethod
    def _ensure_lot_usable(lot: VaccineLot) -> None:
        if lot.status != VaccineLot.Status.ACTIVE:
            raise ValidationError({"lot": "Lote indisponível (precisa estar ativo) para aplicação."})
        if lot.is_expired:
            raise ValidationError({"lot": "Lote vencido não pode ser usado."})
        if lot.doses_available < 1:
            raise ValidationError({"lot": "Lote sem doses disponíveis."})

    @staticmethod
    @transaction.atomic
    def activate_lot(lot: VaccineLot) -> VaccineLot:
        if lot.status not in {VaccineLot.Status.RECEIVED, VaccineLot.Status.QUARANTINED}:
            raise ValidationError("Apenas lotes recebidos ou em quarentena podem ser ativados.")
        if lot.is_expired:
            raise ValidationError({"lot": "Lote vencido não pode ser ativado."})
        lot.status = VaccineLot.Status.ACTIVE
        lot.save()
        return lot

    @staticmethod
    @transaction.atomic
    def block_lot(lot: VaccineLot, *, reason: str = "") -> VaccineLot:
        if lot.status in {VaccineLot.Status.RECALLED, VaccineLot.Status.DEPLETED}:
            raise ValidationError("Lote recolhido/esgotado não pode ser bloqueado.")
        lot.status = VaccineLot.Status.QUARANTINED
        lot.notes = _append(lot.notes, "Bloqueio", reason)
        lot.save()
        return lot

    @staticmethod
    @transaction.atomic
    def release_lot(lot: VaccineLot) -> VaccineLot:
        if lot.status != VaccineLot.Status.QUARANTINED:
            raise ValidationError("Apenas lotes em quarentena podem ser liberados.")
        if lot.is_expired:
            raise ValidationError({"lot": "Lote vencido não pode ser liberado."})
        lot.status = VaccineLot.Status.ACTIVE
        lot.save()
        return lot

    @staticmethod
    @transaction.atomic
    def recall_lot(lot: VaccineLot, *, reason: str = "") -> VaccineLot:
        if not reason.strip():
            raise ValidationError({"reason": "Informe o motivo da recolha."})
        lot.status = VaccineLot.Status.RECALLED
        lot.notes = _append(lot.notes, "Recolha", reason)
        lot.save()
        return lot

    # ------------------------------------------------------------------ #
    # Campanha
    # ------------------------------------------------------------------ #
    @staticmethod
    @transaction.atomic
    def activate_campaign(campaign: VaccinationCampaign) -> VaccinationCampaign:
        if campaign.status not in {VaccinationCampaign.Status.PLANNED, VaccinationCampaign.Status.PAUSED}:
            raise ValidationError("Apenas campanhas planeadas ou pausadas podem ser ativadas.")
        if not campaign.vaccine.active:
            raise ValidationError({"vaccine": "A vacina da campanha está inativa."})
        campaign.status = VaccinationCampaign.Status.ACTIVE
        campaign.save()
        return campaign

    @staticmethod
    @transaction.atomic
    def pause_campaign(campaign: VaccinationCampaign, *, reason: str = "") -> VaccinationCampaign:
        if campaign.status != VaccinationCampaign.Status.ACTIVE:
            raise ValidationError("Apenas campanhas ativas podem ser pausadas.")
        campaign.status = VaccinationCampaign.Status.PAUSED
        campaign.notes = _append(campaign.notes, "Suspensão", reason)
        campaign.save()
        return campaign

    @staticmethod
    @transaction.atomic
    def complete_campaign(campaign: VaccinationCampaign) -> VaccinationCampaign:
        if campaign.status not in {VaccinationCampaign.Status.ACTIVE, VaccinationCampaign.Status.PAUSED}:
            raise ValidationError("Apenas campanhas ativas/pausadas podem ser encerradas.")
        campaign.status = VaccinationCampaign.Status.COMPLETED
        campaign.save()
        return campaign

    @staticmethod
    @transaction.atomic
    def cancel_campaign(campaign: VaccinationCampaign, *, reason: str = "") -> VaccinationCampaign:
        if campaign.status == VaccinationCampaign.Status.COMPLETED:
            raise ValidationError("Uma campanha concluída não pode ser cancelada.")
        if not reason.strip():
            raise ValidationError({"reason": "Informe o motivo do cancelamento."})
        campaign.status = VaccinationCampaign.Status.CANCELLED
        campaign.notes = _append(campaign.notes, "Cancelamento", reason)
        campaign.save()
        return campaign

    # ------------------------------------------------------------------ #
    # Registo de imunização
    # ------------------------------------------------------------------ #
    @staticmethod
    @transaction.atomic
    def register_immunization(
        *,
        patient,
        lot: VaccineLot,
        vaccine: VaccineProduct | None = None,
        campaign: VaccinationCampaign | None = None,
        target_group: VaccinationCampaignTarget | None = None,
        administered_by=None,
        dose_number: int = 1,
        route: str = ImmunizationRecord.Route.IM,
        source: str = ImmunizationRecord.Source.ROUTINE,
        body_site: str = "",
        administered_at=None,
        allow_duplicate: bool = False,
    ) -> ImmunizationRecord:
        """Aplica a vacina; o save() do modelo baixa o stock do lote e atualiza a meta da campanha (§10.9)."""
        vaccine = vaccine or lot.vaccine
        if not vaccine.active:
            raise ValidationError({"vaccine": "Vacina inativa não pode ser aplicada."})
        PublicHealthWorkflowService._ensure_lot_usable(lot)
        if campaign is not None and campaign.status != VaccinationCampaign.Status.ACTIVE:
            raise ValidationError({"campaign": "A campanha precisa estar ativa para registar doses."})
        if not allow_duplicate and ImmunizationRecord.objects.filter(
            patient=patient,
            vaccine=vaccine,
            dose_number=dose_number,
            status__in=[ImmunizationRecord.Status.ADMINISTERED, ImmunizationRecord.Status.REPORTED],
        ).exists():
            raise ValidationError("Esta dose já foi registada para o paciente (possível duplicidade).")

        return ImmunizationRecord.objects.create(
            tenant=patient.tenant,
            patient=patient,
            vaccine=vaccine,
            lot=lot,
            campaign=campaign,
            target_group=target_group,
            administered_by=administered_by,
            status=ImmunizationRecord.Status.ADMINISTERED,
            source=source,
            dose_number=dose_number,
            route=route,
            body_site=body_site,
            administered_at=administered_at or timezone.now(),
        )

    @staticmethod
    @transaction.atomic
    def cancel_immunization(record: ImmunizationRecord, *, reason: str = "") -> ImmunizationRecord:
        if record.status == ImmunizationRecord.Status.CANCELLED:
            raise ValidationError("Registo já cancelado.")
        if not reason.strip():
            raise ValidationError({"reason": "Informe o motivo do cancelamento."})
        was_administered = record.is_administered
        lot_id = record.lot_id
        target_id = record.target_group_id

        record.status = ImmunizationRecord.Status.CANCELLED
        record.notes = _append(record.notes, "Cancelamento", reason)
        record.save()

        # Devolve a dose ao lote e ajusta a meta (a baixa tinha sido feita na criação).
        if was_administered and lot_id:
            lot = VaccineLot.objects.select_for_update().get(pk=lot_id)
            lot.doses_available += 1
            if lot.status == VaccineLot.Status.DEPLETED and not lot.is_expired:
                lot.status = VaccineLot.Status.ACTIVE
            lot.save()
        if was_administered and target_id:
            target = VaccinationCampaignTarget.objects.select_for_update().get(pk=target_id)
            target.administered_doses = max(target.administered_doses - 1, 0)
            target.save()
        return record

    # ------------------------------------------------------------------ #
    # Eventos adversos (AEFI)
    # ------------------------------------------------------------------ #
    @staticmethod
    @transaction.atomic
    def register_adverse_event(
        *,
        immunization_record: ImmunizationRecord,
        symptoms: str,
        onset_at,
        severity: str = AdverseEventFollowingImmunization.Severity.MILD,
        outcome: str = AdverseEventFollowingImmunization.Outcome.UNKNOWN,
        reported_by=None,
    ) -> AdverseEventFollowingImmunization:
        """Regista AEFI; o save() do modelo marca `serious` e o prazo de investigação para eventos graves (§10.11)."""
        if not (symptoms or "").strip():
            raise ValidationError({"symptoms": "Descreva os sintomas do evento adverso."})
        return AdverseEventFollowingImmunization.objects.create(
            tenant=immunization_record.tenant,
            immunization_record=immunization_record,
            patient=immunization_record.patient,
            vaccine=immunization_record.vaccine,
            lot=immunization_record.lot,
            reported_by=reported_by,
            severity=severity,
            outcome=outcome,
            onset_at=onset_at,
            symptoms=symptoms,
        )

    @staticmethod
    @transaction.atomic
    def classify_adverse_event(
        aefi: AdverseEventFollowingImmunization, *, severity: str | None = None, investigated_by=None
    ) -> AdverseEventFollowingImmunization:
        if aefi.status in {
            AdverseEventFollowingImmunization.Status.RESOLVED,
            AdverseEventFollowingImmunization.Status.DISCARDED,
        }:
            raise ValidationError("Evento encerrado não pode ser reclassificado.")
        if severity:
            aefi.severity = severity
        if investigated_by is not None:
            aefi.investigated_by = investigated_by
        aefi.status = AdverseEventFollowingImmunization.Status.UNDER_INVESTIGATION
        aefi.save()
        return aefi

    @staticmethod
    @transaction.atomic
    def resolve_adverse_event(
        aefi: AdverseEventFollowingImmunization, *, outcome: str, causality_assessment: str = ""
    ) -> AdverseEventFollowingImmunization:
        if outcome == AdverseEventFollowingImmunization.Outcome.UNKNOWN:
            raise ValidationError({"outcome": "Eventos resolvidos exigem desfecho conhecido."})
        aefi.outcome = outcome
        if causality_assessment:
            aefi.causality_assessment = causality_assessment
        aefi.status = AdverseEventFollowingImmunization.Status.RESOLVED
        aefi.save()
        return aefi

    @staticmethod
    @transaction.atomic
    def discard_adverse_event(aefi: AdverseEventFollowingImmunization, *, reason: str = "") -> AdverseEventFollowingImmunization:
        if not reason.strip():
            raise ValidationError({"reason": "Informe o motivo do descarte."})
        aefi.status = AdverseEventFollowingImmunization.Status.DISCARDED
        aefi.notes = _append(aefi.notes, "Descarte", reason)
        aefi.save()
        return aefi

    @staticmethod
    @transaction.atomic
    def generate_aefi_notification(
        aefi: AdverseEventFollowingImmunization, *, official_system: str = PublicHealthNotification.OfficialSystem.CUSTOM
    ) -> PublicHealthNotification:
        """Gera a notificação oficial para o evento adverso (§10.12)."""
        notification = PublicHealthNotification.objects.create(
            tenant=aefi.tenant,
            official_system=official_system,
            event_type=PublicHealthNotification.EventType.AEFI,
            status=PublicHealthNotification.Status.PENDING,
            adverse_event=aefi,
            payload={
                "aefi": aefi.pk,
                "severity": aefi.severity,
                "serious": aefi.serious,
                "outcome": aefi.outcome,
            },
        )
        return notification

    # ------------------------------------------------------------------ #
    # Notificações oficiais
    # ------------------------------------------------------------------ #
    @staticmethod
    @transaction.atomic
    def send_notification(notification: PublicHealthNotification, *, external_reference: str = "") -> PublicHealthNotification:
        if notification.status in {
            PublicHealthNotification.Status.SENT,
            PublicHealthNotification.Status.ACCEPTED,
        }:
            raise ValidationError("Notificação já enviada.")
        notification.attempt_count = (notification.attempt_count or 0) + 1
        notification.last_attempt_at = timezone.now()
        if external_reference:
            notification.external_reference = external_reference
        notification.status = PublicHealthNotification.Status.SENT  # save() define sent_at
        notification.save()
        if notification.adverse_event_id:
            aefi = notification.adverse_event
            if aefi.status != AdverseEventFollowingImmunization.Status.SENT_TO_AUTHORITY:
                aefi.status = AdverseEventFollowingImmunization.Status.SENT_TO_AUTHORITY
                aefi.save()
        return notification

    @staticmethod
    @transaction.atomic
    def acknowledge_notification(
        notification: PublicHealthNotification, *, accepted: bool = True, external_reference: str = "", error_message: str = ""
    ) -> PublicHealthNotification:
        if notification.status not in {
            PublicHealthNotification.Status.SENT,
            PublicHealthNotification.Status.SENDING,
        }:
            raise ValidationError("Apenas notificações enviadas podem receber resposta.")
        if external_reference:
            notification.external_reference = external_reference
        if accepted:
            notification.status = PublicHealthNotification.Status.ACCEPTED
        else:
            notification.status = PublicHealthNotification.Status.REJECTED
            notification.error_message = error_message
        notification.save()
        return notification

    @staticmethod
    @transaction.atomic
    def retry_notification(notification: PublicHealthNotification) -> PublicHealthNotification:
        if notification.status not in {
            PublicHealthNotification.Status.FAILED,
            PublicHealthNotification.Status.REJECTED,
        }:
            raise ValidationError("Apenas notificações falhadas/rejeitadas podem ser reprocessadas.")
        notification.status = PublicHealthNotification.Status.PENDING
        notification.error_message = ""
        notification.next_retry_at = None
        notification.save()
        return notification
