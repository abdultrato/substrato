from __future__ import annotations

from decimal import Decimal, InvalidOperation

from django.core.exceptions import ValidationError
from django.db import transaction
from django.db.models import Max
from django.utils import timezone

from apps.specialty_diagnostics.models import (
    SpecialtyDiagnosticEquipment,
    SpecialtyDiagnosticIntegrationEvent,
    SpecialtyDiagnosticMeasurement,
    SpecialtyDiagnosticOrder,
    SpecialtyDiagnosticReport,
)


def _append(current: str, label: str, text: str) -> str:
    if not text:
        return current
    return f"{current}\n[{label}] {text}".strip()


def _to_decimal(value):
    if value in (None, ""):
        return None
    try:
        return Decimal(str(value))
    except (InvalidOperation, TypeError, ValueError) as exc:
        raise ValidationError({"numeric_value": "Valor numérico inválido."}) from exc


class SpecialtyDiagnosticsWorkflowService:
    """Casos de uso do motor de exames instrumentais (§7.13): solicitar → executar → medir → laudar → liberar."""

    # ------------------------------------------------------------------ #
    # Equipamentos
    # ------------------------------------------------------------------ #
    @staticmethod
    def _ensure_equipment_usable(equipment: SpecialtyDiagnosticEquipment) -> None:
        if equipment is None:
            return
        if equipment.status != SpecialtyDiagnosticEquipment.Status.ACTIVE:
            raise ValidationError({"equipment": "Equipamento indisponível (manutenção/inativo) não pode ser usado."})
        if equipment.next_quality_control and equipment.next_quality_control < timezone.localdate():
            raise ValidationError({"equipment": "Equipamento com controlo de qualidade/calibração vencido — uso bloqueado."})

    @staticmethod
    @transaction.atomic
    def mark_equipment_maintenance(
        equipment: SpecialtyDiagnosticEquipment, *, next_quality_control=None, notes: str = ""
    ) -> SpecialtyDiagnosticEquipment:
        equipment.status = SpecialtyDiagnosticEquipment.Status.MAINTENANCE
        if next_quality_control is not None:
            equipment.next_quality_control = next_quality_control
        equipment.notes = _append(equipment.notes, "Manutenção", notes)
        equipment.save()
        return equipment

    @staticmethod
    @transaction.atomic
    def mark_equipment_available(
        equipment: SpecialtyDiagnosticEquipment, *, last_quality_control=None, next_quality_control=None
    ) -> SpecialtyDiagnosticEquipment:
        equipment.status = SpecialtyDiagnosticEquipment.Status.ACTIVE
        if last_quality_control is not None:
            equipment.last_quality_control = last_quality_control
        if next_quality_control is not None:
            equipment.next_quality_control = next_quality_control
        equipment.save()
        return equipment

    # ------------------------------------------------------------------ #
    # Exame (order)
    # ------------------------------------------------------------------ #
    @staticmethod
    def _next_order_number(tenant) -> str:
        band = f"DX-{timezone.now().year}-"
        last = (
            SpecialtyDiagnosticOrder.objects.filter(tenant=tenant, order_number__startswith=band)
            .order_by("-order_number")
            .first()
        )
        seq = 1
        if last is not None:
            try:
                seq = int(str(last.order_number).rsplit("-", 1)[1]) + 1
            except (ValueError, IndexError):
                seq = SpecialtyDiagnosticOrder.objects.filter(tenant=tenant, order_number__startswith=band).count() + 1
        return f"{band}{seq:06d}"

    @staticmethod
    def _ensure_order_number(order: SpecialtyDiagnosticOrder) -> None:
        if not order.order_number:
            order.order_number = SpecialtyDiagnosticsWorkflowService._next_order_number(order.tenant)

    @staticmethod
    @transaction.atomic
    def schedule_order(
        order: SpecialtyDiagnosticOrder, *, scheduled_at=None, equipment=None, protocol=None
    ) -> SpecialtyDiagnosticOrder:
        if order.status not in {
            SpecialtyDiagnosticOrder.Status.REQUESTED,
            SpecialtyDiagnosticOrder.Status.SCHEDULED,
        }:
            raise ValidationError("Apenas exames solicitados podem ser agendados.")
        if equipment is not None:
            SpecialtyDiagnosticsWorkflowService._ensure_equipment_usable(equipment)
            order.equipment = equipment
        if protocol is not None:
            order.protocol = protocol
        order.scheduled_at = scheduled_at or timezone.now()
        order.status = SpecialtyDiagnosticOrder.Status.SCHEDULED
        SpecialtyDiagnosticsWorkflowService._ensure_order_number(order)
        order.save()
        return order

    @staticmethod
    @transaction.atomic
    def start_exam(order: SpecialtyDiagnosticOrder, *, equipment=None, performer=None) -> SpecialtyDiagnosticOrder:
        if order.status not in {
            SpecialtyDiagnosticOrder.Status.REQUESTED,
            SpecialtyDiagnosticOrder.Status.SCHEDULED,
            SpecialtyDiagnosticOrder.Status.IN_PROGRESS,
        }:
            raise ValidationError("O exame não pode iniciar execução no estado atual.")
        if equipment is not None:
            order.equipment = equipment
        SpecialtyDiagnosticsWorkflowService._ensure_equipment_usable(order.equipment)
        order.status = SpecialtyDiagnosticOrder.Status.IN_PROGRESS
        order.started_at = order.started_at or timezone.now()
        SpecialtyDiagnosticsWorkflowService._ensure_order_number(order)
        order.save()
        return order

    @staticmethod
    @transaction.atomic
    def finish_execution(order: SpecialtyDiagnosticOrder) -> SpecialtyDiagnosticOrder:
        if order.status not in {
            SpecialtyDiagnosticOrder.Status.IN_PROGRESS,
            SpecialtyDiagnosticOrder.Status.SCHEDULED,
        }:
            raise ValidationError("Apenas exames em execução podem ser finalizados.")
        order.status = SpecialtyDiagnosticOrder.Status.PERFORMED
        order.performed_at = timezone.now()
        if not order.started_at:
            order.started_at = order.performed_at
        order.save()
        return order

    @staticmethod
    @transaction.atomic
    def assign_specialist(order: SpecialtyDiagnosticOrder, *, specialist) -> SpecialtyDiagnosticOrder:
        if specialist is None:
            raise ValidationError({"specialist": "Indique o especialista."})
        if order.status in {SpecialtyDiagnosticOrder.Status.CANCELLED, SpecialtyDiagnosticOrder.Status.DELIVERED}:
            raise ValidationError("Exame encerrado não pode ser atribuído.")
        order.specialist = specialist
        if order.status == SpecialtyDiagnosticOrder.Status.PERFORMED:
            order.status = SpecialtyDiagnosticOrder.Status.REPORTING
        order.save()
        return order

    @staticmethod
    @transaction.atomic
    def cancel_order(order: SpecialtyDiagnosticOrder, *, reason: str = "") -> SpecialtyDiagnosticOrder:
        if order.status in {SpecialtyDiagnosticOrder.Status.DELIVERED, SpecialtyDiagnosticOrder.Status.CANCELLED}:
            raise ValidationError("Exame entregue/cancelado não pode ser cancelado.")
        if not reason.strip():
            raise ValidationError({"reason": "Informe o motivo do cancelamento."})
        order.status = SpecialtyDiagnosticOrder.Status.CANCELLED
        order.notes = _append(order.notes, "Cancelamento", reason)
        order.save()
        return order

    # ------------------------------------------------------------------ #
    # Medições
    # ------------------------------------------------------------------ #
    @staticmethod
    @transaction.atomic
    def record_measurements(
        order: SpecialtyDiagnosticOrder, *, measurements: list[dict], origin: str = "MANUAL"
    ) -> list[SpecialtyDiagnosticMeasurement]:
        """Regista medições do exame (§7.9). `origin` é registado nas observações."""
        if order.status in {SpecialtyDiagnosticOrder.Status.CANCELLED}:
            raise ValidationError("Não é possível registar medições num exame cancelado.")
        if not measurements:
            raise ValidationError({"measurements": "Informe ao menos uma medição."})
        created: list[SpecialtyDiagnosticMeasurement] = []
        for row in measurements:
            value_type = row.get("value_type") or SpecialtyDiagnosticMeasurement.ValueType.NUMERIC
            name = (row.get("name") or row.get("code") or "Medição").strip()
            created.append(
                SpecialtyDiagnosticMeasurement.objects.create(
                    tenant=order.tenant,
                    order=order,
                    name=name,
                    code=row.get("code", ""),
                    value_type=value_type,
                    numeric_value=_to_decimal(row.get("numeric_value")),
                    text_value=str(row.get("text_value", "")),
                    unit=row.get("unit", ""),
                    reference_range=row.get("reference_range", ""),
                    interpretation=row.get("interpretation", ""),
                    abnormal=bool(row.get("abnormal", False)),
                    critical=bool(row.get("critical", False)),
                    notes=_append(str(row.get("notes", "")), "Origem", origin),
                )
            )
        return created

    # ------------------------------------------------------------------ #
    # Laudo
    # ------------------------------------------------------------------ #
    @staticmethod
    @transaction.atomic
    def sign_report(
        report: SpecialtyDiagnosticReport,
        *,
        findings: str | None = None,
        impression: str | None = None,
        technique: str | None = None,
        recommendations: str | None = None,
        specialist=None,
        critical_result: bool | None = None,
        require_measurements: bool = True,
    ) -> SpecialtyDiagnosticReport:
        if report.status in {SpecialtyDiagnosticReport.Status.FINAL, SpecialtyDiagnosticReport.Status.AMENDED}:
            raise ValidationError("Laudo já assinado — use retificação.")
        if report.status == SpecialtyDiagnosticReport.Status.CANCELLED:
            raise ValidationError("Laudo cancelado não pode ser assinado.")
        if require_measurements and not report.order.measurements.exists():
            raise ValidationError("Registe as medições do exame antes de laudar.")
        if findings is not None:
            report.findings = findings
        if impression is not None:
            report.impression = impression
        if technique is not None:
            report.technique = technique
        if recommendations is not None:
            report.recommendations = recommendations
        if critical_result is not None:
            report.critical_result = critical_result
        if specialist is not None:
            report.specialist = specialist
        if not (report.impression or report.findings).strip():
            raise ValidationError({"impression": "Informe achados ou conclusão antes de assinar."})
        report.status = SpecialtyDiagnosticReport.Status.FINAL  # save() assina e marca o exame como laudado
        report.save()
        return report

    @staticmethod
    @transaction.atomic
    def release_report(report: SpecialtyDiagnosticReport) -> SpecialtyDiagnosticReport:
        if report.status not in {SpecialtyDiagnosticReport.Status.FINAL, SpecialtyDiagnosticReport.Status.AMENDED}:
            raise ValidationError("Apenas laudos assinados podem ser liberados.")
        if report.critical_result and not report.critical_notified_at:
            raise ValidationError("Resultado crítico exige comunicação documentada antes da liberação.")
        order = report.order
        if order.status == SpecialtyDiagnosticOrder.Status.REPORTED:
            order.status = SpecialtyDiagnosticOrder.Status.VALIDATED
            order.save()
        if order.status in {SpecialtyDiagnosticOrder.Status.REPORTED, SpecialtyDiagnosticOrder.Status.VALIDATED}:
            order.status = SpecialtyDiagnosticOrder.Status.DELIVERED
            if not order.completed_at:
                order.completed_at = timezone.now()
            order.save()
        return report

    @staticmethod
    @transaction.atomic
    def amend_report(
        report: SpecialtyDiagnosticReport, *, findings: str | None = None, impression: str | None = None, reason: str = ""
    ) -> SpecialtyDiagnosticReport:
        """Retificação preserva a versão anterior criando uma nova versão AMENDED (§7.23)."""
        if report.status not in {SpecialtyDiagnosticReport.Status.FINAL, SpecialtyDiagnosticReport.Status.AMENDED}:
            raise ValidationError("Apenas laudos finais podem ser retificados.")
        if not reason.strip():
            raise ValidationError({"reason": "Informe o motivo da retificação."})
        order = report.order
        next_version = (order.reports.aggregate(m=Max("version_number"))["m"] or report.version_number) + 1
        return SpecialtyDiagnosticReport.objects.create(
            tenant=order.tenant,
            order=order,
            specialist=report.specialist,
            status=SpecialtyDiagnosticReport.Status.AMENDED,
            version_number=next_version,
            technique=report.technique,
            findings=findings if findings is not None else report.findings,
            impression=impression if impression is not None else report.impression,
            recommendations=report.recommendations,
            critical_result=report.critical_result,
            critical_notified_at=report.critical_notified_at,
            notes=_append(report.notes, "Retificação", reason),
        )

    @staticmethod
    @transaction.atomic
    def mark_critical_communicated(report: SpecialtyDiagnosticReport, *, communication: str = "") -> SpecialtyDiagnosticReport:
        if not communication.strip():
            raise ValidationError({"communication": "Documente a comunicação do resultado crítico (quem/quando/meio)."})
        report.critical_result = True
        report.critical_notified_at = timezone.now()
        report.notes = _append(report.notes, "Resultado crítico comunicado", communication)
        report.save()
        return report

    # ------------------------------------------------------------------ #
    # Integração
    # ------------------------------------------------------------------ #
    @staticmethod
    @transaction.atomic
    def record_integration_event(
        *,
        event_type: str,
        order: SpecialtyDiagnosticOrder | None = None,
        equipment: SpecialtyDiagnosticEquipment | None = None,
        direction: str = SpecialtyDiagnosticIntegrationEvent.Direction.INBOUND,
        status: str = SpecialtyDiagnosticIntegrationEvent.Status.PENDING,
        external_system: str = "",
        message_control_id: str = "",
        payload: dict | None = None,
        error_message: str = "",
    ) -> SpecialtyDiagnosticIntegrationEvent:
        tenant = getattr(order, "tenant", None) or getattr(equipment, "tenant", None)
        return SpecialtyDiagnosticIntegrationEvent.objects.create(
            tenant=tenant,
            order=order,
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
    def reprocess_integration_event(
        event: SpecialtyDiagnosticIntegrationEvent,
    ) -> SpecialtyDiagnosticIntegrationEvent:
        if event.status != SpecialtyDiagnosticIntegrationEvent.Status.FAILED:
            raise ValidationError("Apenas eventos falhados podem ser reprocessados.")
        event.status = SpecialtyDiagnosticIntegrationEvent.Status.PENDING
        event.retry_count = (event.retry_count or 0) + 1
        event.error_message = ""
        event.save()
        return event
