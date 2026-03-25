from decimal import Decimal

from django.db.models import Case, IntegerField, Sum, Value, When
from django.db.models.functions import Coalesce
from django.utils import timezone

from apps.billing.models.invoice import Invoice
from apps.clinical.models.lab_request import LabRequest
from apps.clinical.models.patient import Patient
from apps.payments.models.payment import Payment
from apps.payments.models.receipt import Receipt
from apps.reception.models.reception_checkin import ReceptionCheckin
from domain.clinical.result_state import ResultState


def execute(tenant):
    today = timezone.localdate()

    today_checkins = ReceptionCheckin.objects.filter(
        tenant=tenant,
        arrived_at__date=today,
    )

    queue = (
        today_checkins.exclude(
            status__in=[
                ReceptionCheckin.Status.COMPLETED,
                ReceptionCheckin.Status.CANCELED,
            ]
        )
        .select_related("patient", "request", "invoice", "attendant")
        .annotate(
            priority_order=Case(
                When(priority=ReceptionCheckin.Priority.URGENT, then=Value(0)),
                When(priority=ReceptionCheckin.Priority.PREFERRED, then=Value(1)),
                default=Value(2),
                output_field=IntegerField(),
            ),
            status_order=Case(
                When(status=ReceptionCheckin.Status.WAITING, then=Value(0)),
                When(status=ReceptionCheckin.Status.IN_CARE, then=Value(1)),
                When(status=ReceptionCheckin.Status.REQUEST_CREATED, then=Value(2)),
                When(status=ReceptionCheckin.Status.INVOICE_LINKED, then=Value(3)),
                default=Value(4),
                output_field=IntegerField(),
            ),
        )
        .order_by("status_order", "priority_order", "arrived_at")[:12]
    )

    received_today = (
        Payment.objects.filter(
            invoice__tenant=tenant,
            status=Payment.Status.CONFIRMED,
            paid_at__date=today,
        ).aggregate(total=Coalesce(Sum("value"), Decimal("0.00")))
    )["total"]

    summary = {
        "checkins_today": today_checkins.count(),
        "queue_size": today_checkins.filter(status=ReceptionCheckin.Status.WAITING).count(),
        "in_care": today_checkins.filter(status=ReceptionCheckin.Status.IN_CARE).count(),
        "new_patients": Patient.objects.filter(tenant=tenant, created_at__date=today).count(),
        "pending_requests": LabRequest.objects.filter(
            tenant=tenant,
            status=ResultState.PENDING,
        ).count(),
        "open_invoices": Invoice.objects.filter(
            tenant=tenant,
            status=Invoice.Status.ISSUED,
        ).count(),
        "receipts_generated_today": Receipt.objects.filter(
            invoice__tenant=tenant,
            created_at__date=today,
        ).count(),
        "received_today": received_today,
    }
    summary.update(
        {
            "checkins_hoje": summary["checkins_today"],
            "na_fila": summary["queue_size"],
            "em_atendimento": summary["in_care"],
            "pacientes_novos": summary["new_patients"],
            "requisicoes_pendentes": summary["pending_requests"],
            "faturas_em_aberto": summary["open_invoices"],
            "recibos_gerados_hoje": summary["receipts_generated_today"],
            "recebido_hoje": summary["received_today"],
        }
    )

    return {
        "date": str(today),
        "summary": summary,
        "resumo": summary,
        "queue": [
            {
                "id": item.id,
                "custom_id": item.custom_id,
                "patient_id": item.patient_id,
                "patient_name": item.patient.name,
                "patient_code": item.patient.custom_id,
                "priority": item.get_priority_display(),
                "status": item.get_status_display(),
                "arrived_at": item.arrived_at.isoformat(),
                "attendant": getattr(item.attendant, "username", "") if item.attendant_id else "",
                "request_id": item.request_id,
                "request_code": item.request.custom_id if item.request_id else "",
                "invoice_id": item.invoice_id,
                "invoice_code": item.invoice.custom_id if item.invoice_id else "",
                "paciente_id": item.patient_id,
                "paciente_nome": item.patient.name,
                "paciente_codigo": item.patient.custom_id,
                "prioridade": item.get_priority_display(),
                "estado": item.get_status_display(),
                "chegou_em": item.arrived_at.isoformat(),
                "atendente": getattr(item.attendant, "username", "") if item.attendant_id else "",
                "requisicao_id": item.request_id,
                "requisicao_codigo": item.request.custom_id if item.request_id else "",
                "fatura_id": item.invoice_id,
                "fatura_codigo": item.invoice.custom_id if item.invoice_id else "",
            }
            for item in queue
        ],
        "fila": [
            {
                "id": item.id,
                "id_custom": item.custom_id,
                "paciente_id": item.patient_id,
                "paciente_nome": item.patient.name,
                "paciente_codigo": item.patient.custom_id,
                "prioridade": item.get_priority_display(),
                "estado": item.get_status_display(),
                "chegou_em": item.arrived_at.isoformat(),
                "atendente": getattr(item.attendant, "username", "") if item.attendant_id else "",
                "requisicao_id": item.request_id,
                "requisicao_codigo": item.request.custom_id if item.request_id else "",
                "fatura_id": item.invoice_id,
                "fatura_codigo": item.invoice.custom_id if item.invoice_id else "",
            }
            for item in queue
        ],
    }


