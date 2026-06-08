from __future__ import annotations

from django.core.exceptions import ValidationError
from django.db import transaction
from django.db.models import Max
from django.utils import timezone

from apps.radiology.models import (
    ImagingEquipment,
    ImagingFile,
    ImagingReport,
    ImagingSeries,
    ImagingStudy,
    PacsIntegrationEvent,
)


def _append(current: str, label: str, text: str) -> str:
    if not text:
        return current
    return f"{current}\n[{label}] {text}".strip()


class RadiologyWorkflowService:
    """Casos de uso do fluxo de imagiologia (§5.13): solicitar → agendar → adquirir → laudar → liberar."""

    # ------------------------------------------------------------------ #
    # Equipamentos
    # ------------------------------------------------------------------ #
    @staticmethod
    def _ensure_equipment_usable(equipment: ImagingEquipment) -> None:
        if equipment is None:
            return
        if equipment.status != ImagingEquipment.Status.ACTIVE:
            raise ValidationError({"equipment": "Equipamento indisponível (manutenção/inativo) não pode ser usado."})
        if equipment.next_quality_control and equipment.next_quality_control < timezone.localdate():
            raise ValidationError({"equipment": "Equipamento com controlo de qualidade/calibração vencido — uso bloqueado."})

    @staticmethod
    @transaction.atomic
    def mark_equipment_maintenance(
        equipment: ImagingEquipment, *, next_quality_control=None, notes: str = ""
    ) -> ImagingEquipment:
        equipment.status = ImagingEquipment.Status.MAINTENANCE
        if next_quality_control is not None:
            equipment.next_quality_control = next_quality_control
        equipment.notes = _append(equipment.notes, "Manutenção", notes)
        equipment.save()
        return equipment

    @staticmethod
    @transaction.atomic
    def mark_equipment_available(
        equipment: ImagingEquipment, *, last_quality_control=None, next_quality_control=None
    ) -> ImagingEquipment:
        equipment.status = ImagingEquipment.Status.ACTIVE
        if last_quality_control is not None:
            equipment.last_quality_control = last_quality_control
        if next_quality_control is not None:
            equipment.next_quality_control = next_quality_control
        equipment.save()
        return equipment

    # ------------------------------------------------------------------ #
    # Estudo
    # ------------------------------------------------------------------ #
    @staticmethod
    def _next_accession(tenant) -> str:
        band = f"RAD-{timezone.now().year}-"
        last = (
            ImagingStudy.objects.filter(tenant=tenant, accession_number__startswith=band)
            .order_by("-accession_number")
            .first()
        )
        seq = 1
        if last is not None:
            try:
                seq = int(str(last.accession_number).rsplit("-", 1)[1]) + 1
            except (ValueError, IndexError):
                seq = ImagingStudy.objects.filter(tenant=tenant, accession_number__startswith=band).count() + 1
        return f"{band}{seq:06d}"

    @staticmethod
    def _ensure_accession(study: ImagingStudy) -> None:
        if not study.accession_number:
            study.accession_number = RadiologyWorkflowService._next_accession(study.tenant)

    @staticmethod
    @transaction.atomic
    def schedule_study(
        study: ImagingStudy, *, scheduled_at=None, equipment: ImagingEquipment | None = None, protocol=None
    ) -> ImagingStudy:
        if study.status not in {ImagingStudy.Status.REQUESTED, ImagingStudy.Status.SCHEDULED}:
            raise ValidationError("Apenas estudos solicitados podem ser agendados.")
        if equipment is not None:
            RadiologyWorkflowService._ensure_equipment_usable(equipment)
            study.equipment = equipment
        if protocol is not None:
            study.protocol = protocol
        study.scheduled_at = scheduled_at or timezone.now()
        study.status = ImagingStudy.Status.SCHEDULED
        RadiologyWorkflowService._ensure_accession(study)
        study.save()
        return study

    @staticmethod
    @transaction.atomic
    def start_acquisition(study: ImagingStudy, *, equipment: ImagingEquipment | None = None) -> ImagingStudy:
        if study.status not in {
            ImagingStudy.Status.REQUESTED,
            ImagingStudy.Status.SCHEDULED,
            ImagingStudy.Status.IN_PROGRESS,
        }:
            raise ValidationError("O estudo não pode iniciar aquisição no estado atual.")
        if equipment is not None:
            study.equipment = equipment
        RadiologyWorkflowService._ensure_equipment_usable(study.equipment)
        study.status = ImagingStudy.Status.IN_PROGRESS
        study.started_at = study.started_at or timezone.now()
        RadiologyWorkflowService._ensure_accession(study)
        study.save()
        return study

    @staticmethod
    @transaction.atomic
    def mark_acquired(
        study: ImagingStudy, *, image_count: int | None = None, study_instance_uid: str = "", storage_uri: str = ""
    ) -> ImagingStudy:
        if study.status not in {ImagingStudy.Status.IN_PROGRESS, ImagingStudy.Status.SCHEDULED}:
            raise ValidationError("Apenas estudos em aquisição podem ser marcados como adquiridos.")
        study.status = ImagingStudy.Status.ACQUIRED
        study.acquired_at = timezone.now()
        if not study.started_at:
            study.started_at = study.acquired_at
        if image_count is not None:
            study.image_count = image_count
        if study_instance_uid:
            study.study_instance_uid = study_instance_uid
        if storage_uri:
            study.storage_uri = storage_uri
        study.images_available = True
        study.save()
        return study

    @staticmethod
    @transaction.atomic
    def assign_radiologist(study: ImagingStudy, *, radiologist) -> ImagingStudy:
        if radiologist is None:
            raise ValidationError({"radiologist": "Indique o radiologista."})
        if study.status in {
            ImagingStudy.Status.CANCELLED,
            ImagingStudy.Status.DELIVERED,
        }:
            raise ValidationError("Estudo encerrado não pode ser atribuído.")
        study.radiologist = radiologist
        if study.status == ImagingStudy.Status.ACQUIRED:
            study.status = ImagingStudy.Status.REPORTING
        study.save()
        return study

    @staticmethod
    @transaction.atomic
    def cancel_study(study: ImagingStudy, *, reason: str = "") -> ImagingStudy:
        if study.status in {ImagingStudy.Status.DELIVERED, ImagingStudy.Status.CANCELLED}:
            raise ValidationError("Estudo entregue/cancelado não pode ser cancelado.")
        if not reason.strip():
            raise ValidationError({"reason": "Informe o motivo do cancelamento."})
        study.status = ImagingStudy.Status.CANCELLED
        study.notes = _append(study.notes, "Cancelamento", reason)
        study.save()
        return study

    # ------------------------------------------------------------------ #
    # Séries / ficheiros / PACS
    # ------------------------------------------------------------------ #
    @staticmethod
    @transaction.atomic
    def register_series(
        study: ImagingStudy,
        *,
        series_number: int | None = None,
        series_instance_uid: str = "",
        description: str = "",
        image_count: int = 0,
    ) -> ImagingSeries:
        if series_number is None:
            current_max = study.series.aggregate(m=Max("series_number"))["m"] or 0
            series_number = current_max + 1
        return ImagingSeries.objects.create(
            tenant=study.tenant,
            study=study,
            series_number=series_number,
            series_instance_uid=series_instance_uid,
            description=description,
            image_count=image_count,
        )

    @staticmethod
    @transaction.atomic
    def register_file(
        study: ImagingStudy,
        *,
        series: ImagingSeries | None = None,
        sop_instance_uid: str = "",
        file_type: str = ImagingFile.FileType.DICOM,
        pacs_object_uri: str = "",
        image_number: int = 0,
    ) -> ImagingFile:
        return ImagingFile.objects.create(
            tenant=study.tenant,
            study=study,
            series=series,
            sop_instance_uid=sop_instance_uid,
            file_type=file_type,
            pacs_object_uri=pacs_object_uri,
            image_number=image_number,
        )

    @staticmethod
    @transaction.atomic
    def record_pacs_event(
        *,
        event_type: str,
        study: ImagingStudy | None = None,
        equipment: ImagingEquipment | None = None,
        direction: str = PacsIntegrationEvent.Direction.OUTBOUND,
        status: str = PacsIntegrationEvent.Status.PENDING,
        external_system: str = "PACS",
        message_control_id: str = "",
        payload: dict | None = None,
        error_message: str = "",
    ) -> PacsIntegrationEvent:
        tenant = getattr(study, "tenant", None) or getattr(equipment, "tenant", None)
        return PacsIntegrationEvent.objects.create(
            tenant=tenant,
            study=study,
            equipment=equipment,
            event_type=event_type,
            direction=direction,
            status=status,
            external_system=external_system,
            message_control_id=message_control_id,
            payload=payload or {},
            error_message=error_message,
        )

    @staticmethod
    @transaction.atomic
    def reprocess_pacs_event(event: PacsIntegrationEvent) -> PacsIntegrationEvent:
        if event.status != PacsIntegrationEvent.Status.FAILED:
            raise ValidationError("Apenas eventos falhados podem ser reprocessados.")
        event.status = PacsIntegrationEvent.Status.PENDING
        event.retry_count = (event.retry_count or 0) + 1
        event.error_message = ""
        event.save()
        return event

    # ------------------------------------------------------------------ #
    # Laudo
    # ------------------------------------------------------------------ #
    @staticmethod
    @transaction.atomic
    def sign_report(
        report: ImagingReport,
        *,
        findings: str | None = None,
        impression: str | None = None,
        technique: str | None = None,
        recommendations: str | None = None,
        radiologist=None,
        critical_result: bool | None = None,
        template_used: str | None = None,
    ) -> ImagingReport:
        if report.status in {ImagingReport.Status.FINAL, ImagingReport.Status.AMENDED}:
            raise ValidationError("Laudo já assinado — use retificação.")
        if report.status == ImagingReport.Status.CANCELLED:
            raise ValidationError("Laudo cancelado não pode ser assinado.")
        if findings is not None:
            report.findings = findings
        if impression is not None:
            report.impression = impression
        if technique is not None:
            report.technique = technique
        if recommendations is not None:
            report.recommendations = recommendations
        if template_used is not None:
            report.template_used = template_used
        if critical_result is not None:
            report.critical_result = critical_result
        if radiologist is not None:
            report.radiologist = radiologist
        if not (report.impression or report.findings).strip():
            raise ValidationError({"impression": "Informe achados ou conclusão antes de assinar."})
        if report.radiologist_id is None:
            raise ValidationError({"radiologist": "O laudo precisa de radiologista responsável."})
        report.status = ImagingReport.Status.FINAL  # save() assina e marca o estudo como laudado
        report.save()
        return report

    @staticmethod
    @transaction.atomic
    def release_report(report: ImagingReport, *, validate_first: bool = True) -> ImagingReport:
        if report.status not in {ImagingReport.Status.FINAL, ImagingReport.Status.AMENDED}:
            raise ValidationError("Apenas laudos assinados podem ser liberados.")
        if report.critical_result and not report.critical_notified_at:
            raise ValidationError("Resultado crítico exige comunicação documentada antes da liberação.")
        study = report.study
        if validate_first and study.status == ImagingStudy.Status.REPORTED:
            study.status = ImagingStudy.Status.VALIDATED
            study.save()
        if study.status in {
            ImagingStudy.Status.REPORTED,
            ImagingStudy.Status.VALIDATED,
        }:
            study.status = ImagingStudy.Status.DELIVERED
            if not study.completed_at:
                study.completed_at = timezone.now()
            study.save()
        return report

    @staticmethod
    @transaction.atomic
    def amend_report(
        report: ImagingReport, *, findings: str | None = None, impression: str | None = None, reason: str = ""
    ) -> ImagingReport:
        """Retificação preserva a versão anterior criando uma nova versão AMENDED (§5.23)."""
        if report.status not in {ImagingReport.Status.FINAL, ImagingReport.Status.AMENDED}:
            raise ValidationError("Apenas laudos finais podem ser retificados.")
        if not reason.strip():
            raise ValidationError({"reason": "Informe o motivo da retificação."})
        study = report.study
        next_version = (study.reports.aggregate(m=Max("version_number"))["m"] or report.version_number) + 1
        amended = ImagingReport.objects.create(
            tenant=study.tenant,
            study=study,
            radiologist=report.radiologist,
            status=ImagingReport.Status.AMENDED,
            version_number=next_version,
            technique=report.technique,
            findings=findings if findings is not None else report.findings,
            impression=impression if impression is not None else report.impression,
            recommendations=report.recommendations,
            critical_result=report.critical_result,
            critical_notified_at=report.critical_notified_at,
            template_used=report.template_used,
            notes=_append(report.notes, "Retificação", reason),
        )
        return amended

    @staticmethod
    @transaction.atomic
    def mark_critical_communicated(report: ImagingReport, *, communication: str = "") -> ImagingReport:
        if not communication.strip():
            raise ValidationError({"communication": "Documente a comunicação do resultado crítico (quem/quando/meio)."})
        report.critical_result = True
        report.critical_notified_at = timezone.now()
        report.notes = _append(report.notes, "Resultado crítico comunicado", communication)
        report.save()
        return report
