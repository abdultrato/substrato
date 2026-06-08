from __future__ import annotations

from decimal import Decimal

from django.core.exceptions import ValidationError
from django.db import transaction
from django.utils import timezone

from apps.pathology.models import (
    PathologyAccession,
    PathologyArchive,
    PathologyBillingEvent,
    PathologyDiagnosisReview,
    PathologyEmbedding,
    PathologyGrossExamination,
    PathologyHistologySlide,
    PathologyMicrotomy,
    PathologyProcessing,
    PathologyQualityControl,
    PathologyReport,
    PathologyRequest,
    PathologySampleReception,
    PathologyStaining,
)


def _append(current: str, label: str, text: str) -> str:
    if not text:
        return current
    return f"{current}\n[{label}] {text}".strip()


def _next_sequence_code(model, tenant, band: str) -> str:
    """Gera o próximo código sequencial zero-padded para um prefixo `band` (ex.: H-2026-)."""
    last = (
        model.objects.filter(tenant=tenant, accession_number__startswith=band)
        .order_by("-accession_number")
        .first()
    )
    seq = 1
    if last is not None:
        try:
            seq = int(str(last.accession_number).rsplit("-", 1)[1]) + 1
        except (ValueError, IndexError):
            seq = model.objects.filter(tenant=tenant, accession_number__startswith=band).count() + 1
    return f"{band}{seq:06d}"


class PathologyWorkflowService:
    """Casos de uso do workflow laboratorial de patologia (§4.24). Tudo aponta para a amostra/accessionamento."""

    # ------------------------------------------------------------------ #
    # Pedido
    # ------------------------------------------------------------------ #
    @staticmethod
    @transaction.atomic
    def cancel_request(request: PathologyRequest, *, reason: str = "", label: str = "Cancelamento") -> PathologyRequest:
        if request.status == PathologyRequest.Status.REPORTED:
            raise ValidationError("Um pedido laudado não pode ser cancelado.")
        if not reason.strip():
            raise ValidationError({"reason": "Informe o motivo."})
        request.status = PathologyRequest.Status.CANCELLED
        request.notes = _append(request.notes, label, reason)
        request.save()
        return request

    @staticmethod
    def _advance_request(sample: PathologySampleReception, status: str) -> None:
        request = sample.request
        if request is None:
            return
        if request.status in {PathologyRequest.Status.CANCELLED, PathologyRequest.Status.REPORTED}:
            return
        if request.status != status:
            request.status = status
            request.save()

    # ------------------------------------------------------------------ #
    # Recepção da amostra
    # ------------------------------------------------------------------ #
    @staticmethod
    @transaction.atomic
    def accept_sample(
        sample: PathologySampleReception, *, restriction: str = "", received_by=None
    ) -> PathologySampleReception:
        if sample.status != PathologySampleReception.Status.RECEIVED:
            raise ValidationError("Apenas amostras recebidas podem ser aceites.")
        sample.status = PathologySampleReception.Status.ACCEPTED
        if received_by is not None:
            sample.received_by = received_by
        if restriction:
            sample.notes = _append(sample.notes, "Aceite com restrição", restriction)
        sample.save()
        PathologyWorkflowService._advance_request(sample, PathologyRequest.Status.RECEIVED)
        return sample

    @staticmethod
    @transaction.atomic
    def reject_sample(sample: PathologySampleReception, *, reason: str = "") -> PathologySampleReception:
        if not reason.strip():
            raise ValidationError({"reason": "Informe o motivo da rejeição."})
        if sample.status in {
            PathologySampleReception.Status.REPORTED,
            PathologySampleReception.Status.ARCHIVED,
        }:
            raise ValidationError("Amostra já laudada/arquivada não pode ser rejeitada.")
        sample.status = PathologySampleReception.Status.REJECTED
        sample.rejection_reason = reason
        sample.save()
        PathologyQualityControl.objects.create(
            tenant=sample.tenant,
            sample=sample,
            control_type=PathologyQualityControl.ControlType.REJECTION_RATE,
            status=PathologyQualityControl.Status.FAIL,
            finding=f"Amostra rejeitada: {reason}",
        )
        return sample

    # ------------------------------------------------------------------ #
    # Acessionamento
    # ------------------------------------------------------------------ #
    @staticmethod
    @transaction.atomic
    def generate_accession(
        sample: PathologySampleReception,
        *,
        accessioned_by=None,
        sub_sample_code: str = "A",
        barcode_type=None,
        notes: str = "",
    ) -> PathologyAccession:
        """Gera o número único laboratorial e (via save do modelo) aceita a amostra."""
        if sample.status in {
            PathologySampleReception.Status.REJECTED,
            PathologySampleReception.Status.CANCELLED,
        }:
            raise ValidationError("Amostra rejeitada/cancelada não pode ser acessionada.")
        if sample.accession_number:
            number = sample.accession_number
        else:
            prefix = "C" if sample.specimen_type == PathologySampleReception.SpecimenType.CYTOLOGY else "H"
            band = f"{prefix}-{timezone.now().year}-"
            number = _next_sequence_code(PathologyAccession, sample.tenant, band)
        accession = PathologyAccession.objects.create(
            tenant=sample.tenant,
            sample=sample,
            accessioned_by=accessioned_by,
            accession_number=number,
            sub_sample_code=sub_sample_code or "A",
            barcode_type=barcode_type or PathologyAccession.BarcodeType.QR,
            status=PathologyAccession.Status.ACTIVE,
            notes=notes,
        )
        PathologyWorkflowService._advance_request(sample, PathologyRequest.Status.RECEIVED)
        return accession

    # ------------------------------------------------------------------ #
    # Macroscopia
    # ------------------------------------------------------------------ #
    @staticmethod
    @transaction.atomic
    def finalize_gross(
        gross: PathologyGrossExamination, *, gross_description: str | None = None
    ) -> PathologyGrossExamination:
        if gross.status == PathologyGrossExamination.Status.CANCELLED:
            raise ValidationError("Macroscopia cancelada não pode ser finalizada.")
        if gross_description is not None:
            gross.gross_description = gross_description
        if not (gross.gross_description or "").strip():
            raise ValidationError({"gross_description": "Descreva a macroscopia antes de finalizar."})
        gross.status = PathologyGrossExamination.Status.COMPLETED
        gross.save()

        sample = gross.sample
        if sample.status in {
            PathologySampleReception.Status.ACCEPTED,
            PathologySampleReception.Status.IN_GROSSING,
        }:
            sample.status = PathologySampleReception.Status.IN_PROCESSING
            sample.save()
        PathologyWorkflowService._advance_request(sample, PathologyRequest.Status.IN_PROGRESS)
        return gross

    # ------------------------------------------------------------------ #
    # Processamento histológico
    # ------------------------------------------------------------------ #
    @staticmethod
    @transaction.atomic
    def start_processing(processing: PathologyProcessing) -> PathologyProcessing:
        if processing.status != PathologyProcessing.Status.QUEUED:
            raise ValidationError("Apenas processamentos em fila podem ser iniciados.")
        processing.status = PathologyProcessing.Status.PROCESSING
        processing.save()
        return processing

    @staticmethod
    @transaction.atomic
    def complete_processing(processing: PathologyProcessing) -> PathologyProcessing:
        if processing.status not in {PathologyProcessing.Status.QUEUED, PathologyProcessing.Status.PROCESSING}:
            raise ValidationError("Só é possível concluir processamentos em fila ou em execução.")
        processing.status = PathologyProcessing.Status.COMPLETED
        processing.completed_at = timezone.now()
        processing.save()
        return processing

    @staticmethod
    @transaction.atomic
    def fail_processing(processing: PathologyProcessing, *, reason: str = "") -> PathologyProcessing:
        if not reason.strip():
            raise ValidationError({"reason": "Descreva a falha do processamento."})
        processing.status = PathologyProcessing.Status.FAILED
        processing.notes = _append(processing.notes, "Falha", reason)
        processing.save()
        PathologyQualityControl.objects.create(
            tenant=processing.tenant,
            sample=processing.sample,
            control_type=PathologyQualityControl.ControlType.REWORK,
            status=PathologyQualityControl.Status.FAIL,
            finding=f"Falha de processamento: {reason}",
        )
        return processing

    # ------------------------------------------------------------------ #
    # Inclusão / microtomia / lâmina
    # ------------------------------------------------------------------ #
    @staticmethod
    @transaction.atomic
    def mark_embedded(embedding: PathologyEmbedding) -> PathologyEmbedding:
        if embedding.status not in {PathologyEmbedding.Status.PENDING, PathologyEmbedding.Status.REWORK}:
            raise ValidationError("Bloco não está num estado que permita inclusão.")
        embedding.status = PathologyEmbedding.Status.EMBEDDED
        embedding.save()
        return embedding

    @staticmethod
    @transaction.atomic
    def mark_cut(microtomy: PathologyMicrotomy) -> PathologyMicrotomy:
        if microtomy.status not in {PathologyMicrotomy.Status.PENDING, PathologyMicrotomy.Status.REPEAT}:
            raise ValidationError("Microtomia não está num estado que permita corte.")
        microtomy.status = PathologyMicrotomy.Status.CUT
        microtomy.save()
        return microtomy

    @staticmethod
    @transaction.atomic
    def produce_slide(
        microtomy: PathologyMicrotomy,
        *,
        slide_number: str,
        stain: str = "H&E",
        prepared_by=None,
        block_number: str = "",
    ) -> PathologyHistologySlide:
        if not slide_number.strip():
            raise ValidationError({"slide_number": "Informe o número da lâmina."})
        return PathologyHistologySlide.objects.create(
            tenant=microtomy.tenant,
            sample=microtomy.sample,
            microtomy=microtomy,
            processing=None,
            prepared_by=prepared_by,
            slide_number=slide_number,
            block_number=block_number or microtomy.embedding.block_number,
            stain=stain,
            status=PathologyHistologySlide.Status.CREATED,
        )

    @staticmethod
    @transaction.atomic
    def mark_slide_ready(slide: PathologyHistologySlide) -> PathologyHistologySlide:
        if slide.status in {
            PathologyHistologySlide.Status.LOST,
            PathologyHistologySlide.Status.DESTROYED,
        }:
            raise ValidationError("Lâmina perdida/destruída não pode ir para análise.")
        slide.status = PathologyHistologySlide.Status.REVIEW
        slide.save()
        sample = slide.sample
        if sample.status == PathologySampleReception.Status.IN_PROCESSING:
            sample.status = PathologySampleReception.Status.READY_FOR_REPORT
            sample.save()
        return slide

    @staticmethod
    @transaction.atomic
    def mark_slide_lost(slide: PathologyHistologySlide, *, reason: str = "") -> PathologyHistologySlide:
        slide.status = PathologyHistologySlide.Status.LOST
        slide.notes = _append(slide.notes, "Extravio", reason)
        slide.save()
        PathologyQualityControl.objects.create(
            tenant=slide.tenant,
            sample=slide.sample,
            slide=slide,
            control_type=PathologyQualityControl.ControlType.OTHER,
            status=PathologyQualityControl.Status.FAIL,
            finding=f"Lâmina extraviada: {reason}".strip(),
        )
        return slide

    # ------------------------------------------------------------------ #
    # Coloração
    # ------------------------------------------------------------------ #
    @staticmethod
    @transaction.atomic
    def complete_staining(staining: PathologyStaining) -> PathologyStaining:
        if staining.status == PathologyStaining.Status.CANCELLED:
            raise ValidationError("Coloração cancelada não pode ser concluída.")
        staining.status = PathologyStaining.Status.COMPLETED
        staining.save()  # save() do modelo marca a lâmina como STAINED
        return staining

    @staticmethod
    @transaction.atomic
    def repeat_staining(staining: PathologyStaining, *, reason: str = "") -> PathologyStaining:
        staining.status = PathologyStaining.Status.REPEAT
        staining.notes = _append(staining.notes, "Repetir", reason)
        staining.save()
        PathologyQualityControl.objects.create(
            tenant=staining.tenant,
            sample=staining.sample,
            staining=staining,
            slide=staining.slide,
            control_type=PathologyQualityControl.ControlType.STAIN_FAILURE,
            status=PathologyQualityControl.Status.FAIL,
            finding=f"Coloração a repetir: {reason}".strip(),
        )
        return staining

    # ------------------------------------------------------------------ #
    # Diagnóstico
    # ------------------------------------------------------------------ #
    @staticmethod
    @transaction.atomic
    def finalize_diagnosis(
        diagnosis: PathologyDiagnosisReview, *, diagnosis_text: str | None = None, comments: str | None = None
    ) -> PathologyDiagnosisReview:
        if diagnosis.status == PathologyDiagnosisReview.Status.CANCELLED:
            raise ValidationError("Diagnóstico cancelado não pode ser finalizado.")
        if diagnosis_text is not None:
            diagnosis.diagnosis = diagnosis_text
        if comments is not None:
            diagnosis.comments = comments
        diagnosis.status = PathologyDiagnosisReview.Status.FINAL
        diagnosis.save()  # save() valida diagnóstico/comentário e assina
        return diagnosis

    # ------------------------------------------------------------------ #
    # Laudo
    # ------------------------------------------------------------------ #
    @staticmethod
    def _next_report_number(tenant) -> str:
        band = f"AP-{timezone.now().year}-"
        last = (
            PathologyReport.objects.filter(tenant=tenant, report_number__startswith=band)
            .order_by("-report_number")
            .first()
        )
        seq = 1
        if last is not None:
            try:
                seq = int(str(last.report_number).rsplit("-", 1)[1]) + 1
            except (ValueError, IndexError):
                seq = PathologyReport.objects.filter(tenant=tenant, report_number__startswith=band).count() + 1
        return f"{band}{seq:06d}"

    @staticmethod
    @transaction.atomic
    def sign_report(
        report: PathologyReport,
        *,
        diagnosis: str | None = None,
        conclusion: str | None = None,
        pathologist=None,
    ) -> PathologyReport:
        if report.status in {PathologyReport.Status.FINAL, PathologyReport.Status.AMENDED}:
            raise ValidationError("Laudo já assinado — use retificação.")
        if diagnosis is not None:
            report.diagnosis = diagnosis
        if conclusion is not None:
            report.conclusion = conclusion
        if pathologist is not None:
            report.pathologist = pathologist
        if not report.report_number:
            report.report_number = PathologyWorkflowService._next_report_number(report.tenant)
        report.status = PathologyReport.Status.FINAL  # save() valida diagnóstico/conclusão e assina
        report.save()
        return report

    @staticmethod
    @transaction.atomic
    def release_report(report: PathologyReport, *, generate_base_billing: bool = False) -> PathologyReport:
        if report.status not in {PathologyReport.Status.FINAL, PathologyReport.Status.AMENDED}:
            raise ValidationError("Apenas laudos assinados podem ser liberados.")
        report.delivered_at = timezone.now()
        report.save()

        sample = report.sample
        if sample.status not in {
            PathologySampleReception.Status.ARCHIVED,
            PathologySampleReception.Status.CANCELLED,
        }:
            sample.status = PathologySampleReception.Status.REPORTED
            sample.save()
        PathologyWorkflowService._advance_request(sample, PathologyRequest.Status.REPORTED)

        if generate_base_billing:
            PathologyWorkflowService.create_billing_event(
                sample=sample,
                event_type=PathologyBillingEvent.EventType.GROSSING,
                description="Exame anatomopatológico (base)",
                report=report,
            )
        return report

    @staticmethod
    @transaction.atomic
    def amend_report(report: PathologyReport, *, reason: str = "") -> PathologyReport:
        if report.status not in {PathologyReport.Status.FINAL, PathologyReport.Status.AMENDED}:
            raise ValidationError("Apenas laudos finais podem ser retificados.")
        if not reason.strip():
            raise ValidationError({"reason": "Informe o motivo da retificação."})
        report.status = PathologyReport.Status.AMENDED
        report.notes = _append(report.notes, "Retificação", reason)
        report.signed_at = timezone.now()
        report.save()
        return report

    # ------------------------------------------------------------------ #
    # Faturação
    # ------------------------------------------------------------------ #
    @staticmethod
    @transaction.atomic
    def create_billing_event(
        *,
        sample: PathologySampleReception,
        event_type: str,
        description: str = "",
        quantity=Decimal("1.00"),
        unit_price=Decimal("0.00"),
        vat_percentage=Decimal("0.00"),
        report=None,
        slide=None,
        staining=None,
        immunohistochemistry=None,
        molecular_test=None,
    ) -> PathologyBillingEvent:
        return PathologyBillingEvent.objects.create(
            tenant=sample.tenant,
            sample=sample,
            report=report,
            slide=slide,
            staining=staining,
            immunohistochemistry=immunohistochemistry,
            molecular_test=molecular_test,
            event_type=event_type,
            description=description or event_type,
            quantity=quantity,
            unit_price=unit_price,
            vat_percentage=vat_percentage,
            status=PathologyBillingEvent.BillingStatus.READY,
        )

    @staticmethod
    @transaction.atomic
    def mark_billing_billed(event: PathologyBillingEvent, *, invoice=None) -> PathologyBillingEvent:
        if event.status == PathologyBillingEvent.BillingStatus.CANCELLED:
            raise ValidationError("Evento cancelado não pode ser faturado.")
        event.status = PathologyBillingEvent.BillingStatus.BILLED
        if invoice is not None:
            event.invoice = invoice
        event.save()  # save() define billed_at
        return event

    # ------------------------------------------------------------------ #
    # Arquivo
    # ------------------------------------------------------------------ #
    @staticmethod
    @transaction.atomic
    def archive_material(
        *,
        sample: PathologySampleReception,
        archive_type: str,
        location: str,
        report=None,
        responsible=None,
        slide: PathologyHistologySlide | None = None,
        box_number: str = "",
        shelf: str = "",
        retention_until=None,
    ) -> PathologyArchive:
        if not location.strip():
            raise ValidationError({"location": "Informe a localização física."})
        archive = PathologyArchive.objects.create(
            tenant=sample.tenant,
            sample=sample,
            report=report,
            responsible=responsible,
            archive_type=archive_type,
            status=PathologyArchive.Status.ARCHIVED,
            location=location,
            box_number=box_number,
            shelf=shelf,
            retention_until=retention_until,
        )
        if slide is not None:
            slide.status = PathologyHistologySlide.Status.ARCHIVED
            slide.current_location = location
            slide.save()
        if sample.status == PathologySampleReception.Status.REPORTED:
            sample.status = PathologySampleReception.Status.ARCHIVED
            sample.save()
        return archive

    @staticmethod
    @transaction.atomic
    def borrow_archive(archive: PathologyArchive, *, reason: str = "") -> PathologyArchive:
        if archive.status != PathologyArchive.Status.ARCHIVED:
            raise ValidationError("Apenas material arquivado pode ser emprestado.")
        archive.status = PathologyArchive.Status.BORROWED
        archive.notes = _append(archive.notes, "Empréstimo", reason)
        archive.save()
        return archive

    @staticmethod
    @transaction.atomic
    def return_archive(archive: PathologyArchive) -> PathologyArchive:
        if archive.status != PathologyArchive.Status.BORROWED:
            raise ValidationError("Apenas material emprestado pode ser devolvido.")
        archive.status = PathologyArchive.Status.ARCHIVED
        archive.save()
        return archive
