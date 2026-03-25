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
    hoje = timezone.localdate()

    checkins_hoje = ReceptionCheckin.objects.filter(
        tenant=tenant,
        arrived_at__date=hoje,
    )

    fila = (
        checkins_hoje.exclude(
            status__in=[
                ReceptionCheckin.Status.CONCLUIDO,
                ReceptionCheckin.Status.CANCELADO,
            ]
        )
        .select_related("patient", "request", "invoice", "attendant")
        .annotate(
            priority_order=Case(
                When(priority=ReceptionCheckin.Priority.URGENTE, then=Value(0)),
                When(priority=ReceptionCheckin.Priority.PREFERENCIAL, then=Value(1)),
                default=Value(2),
                output_field=IntegerField(),
            ),
            status_order=Case(
                When(status=ReceptionCheckin.Status.AGUARDANDO, then=Value(0)),
                When(status=ReceptionCheckin.Status.EM_ATENDIMENTO, then=Value(1)),
                When(status=ReceptionCheckin.Status.REQUISICAO_CRIADA, then=Value(2)),
                When(status=ReceptionCheckin.Status.FATURA_VINCULADA, then=Value(3)),
                default=Value(4),
                output_field=IntegerField(),
            ),
        )
        .order_by("status_order", "priority_order", "arrived_at")[:12]
    )

    recebido_hoje = (
        Payment.objects.filter(
            invoice__tenant=tenant,
            status=Payment.Status.CONFIRMADO,
            paid_at__date=hoje,
        ).aggregate(total=Coalesce(Sum("value"), Decimal("0.00")))
    )["total"]

    return {
        "date": str(hoje),
        "resumo": {
            "checkins_hoje": checkins_hoje.count(),
            "na_fila": checkins_hoje.filter(status=ReceptionCheckin.Status.AGUARDANDO).count(),
            "em_atendimento": checkins_hoje.filter(status=ReceptionCheckin.Status.EM_ATENDIMENTO).count(),
            "pacientes_novos": Patient.objects.filter(tenant=tenant, created_at__date=hoje).count(),
            "requisicoes_pendentes": LabRequest.objects.filter(
                tenant=tenant,
                status=ResultState.PENDING,
            ).count(),
            "faturas_em_aberto": Invoice.objects.filter(
                tenant=tenant,
                status=Invoice.Estado.EMITIDA,
            ).count(),
            "recibos_gerados_hoje": Receipt.objects.filter(
                invoice__tenant=tenant,
                created_at__date=hoje,
            ).count(),
            "recebido_hoje": recebido_hoje,
        },
        "fila": [
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
            }
            for item in fila
        ],
    }


executar = execute
