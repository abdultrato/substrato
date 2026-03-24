from decimal import Decimal

from django.db.models import Case, IntegerField, Sum, Value, When
from django.db.models.functions import Coalesce
from django.utils import timezone

from apps.clinical.models.patient import Patient
from apps.clinical.models.lab_request import LabRequest
from apps.billing.models.invoice import Invoice
from apps.payments.models.payment import Payment
from apps.payments.models.receipt import Receipt
from apps.reception.models.reception_checkin import ReceptionCheckin
from domain.clinical.estado_resultado import EstadoResultado


def execute(inquilino):
    hoje = timezone.localdate()

    checkins_hoje = ReceptionCheckin.objects.filter(
        inquilino=inquilino,
        chegou_em__date=hoje,
    )

    fila = (
        checkins_hoje.exclude(
            estado__in=[
                ReceptionCheckin.Status.CONCLUIDO,
                ReceptionCheckin.Status.CANCELADO,
            ]
        )
        .select_related("paciente", "requisicao", "fatura", "atendente")
        .annotate(
            prioridade_ordem=Case(
                When(prioridade=ReceptionCheckin.Priority.URGENTE, then=Value(0)),
                When(prioridade=ReceptionCheckin.Priority.PREFERENCIAL, then=Value(1)),
                default=Value(2),
                output_field=IntegerField(),
            ),
            estado_ordem=Case(
                When(estado=ReceptionCheckin.Status.AGUARDANDO, then=Value(0)),
                When(estado=ReceptionCheckin.Status.EM_ATENDIMENTO, then=Value(1)),
                When(estado=ReceptionCheckin.Status.REQUISICAO_CRIADA, then=Value(2)),
                When(estado=ReceptionCheckin.Status.FATURA_VINCULADA, then=Value(3)),
                default=Value(4),
                output_field=IntegerField(),
            ),
        )
        .order_by("estado_ordem", "prioridade_ordem", "chegou_em")[:12]
    )

    recebido_hoje = (
        Payment.objects.filter(
            fatura__inquilino=inquilino,
            status=Payment.Status.CONFIRMADO,
            pago_em__date=hoje,
        ).aggregate(total=Coalesce(Sum("valor"), Decimal("0.00")))
    )["total"]

    return {
        "data": str(hoje),
        "resumo": {
            "checkins_hoje": checkins_hoje.count(),
            "na_fila": checkins_hoje.filter(estado=ReceptionCheckin.Status.AGUARDANDO).count(),
            "em_atendimento": checkins_hoje.filter(estado=ReceptionCheckin.Status.EM_ATENDIMENTO).count(),
            "pacientes_novos": Patient.objects.filter(inquilino=inquilino, criado_em__date=hoje).count(),
            "requisicoes_pendentes": LabRequest.objects.filter(
                inquilino=inquilino,
                estado=EstadoResultado.PENDENTE,
            ).count(),
            "faturas_em_aberto": Invoice.objects.filter(
                inquilino=inquilino,
                estado=Invoice.Estado.EMITIDA,
            ).count(),
            "recibos_gerados_hoje": Receipt.objects.filter(
                fatura__inquilino=inquilino,
                criado_em__date=hoje,
            ).count(),
            "recebido_hoje": recebido_hoje,
        },
        "fila": [
            {
                "id": item.id,
                "id_custom": item.id_custom,
                "paciente_id": item.paciente_id,
                "paciente_nome": item.paciente.nome,
                "paciente_codigo": item.paciente.id_custom,
                "prioridade": item.get_prioridade_display(),
                "estado": item.get_estado_display(),
                "chegou_em": item.chegou_em.isoformat(),
                "atendente": getattr(item.atendente, "username", "") if item.atendente_id else "",
                "requisicao_id": item.requisicao_id,
                "requisicao_codigo": item.requisicao.id_custom if item.requisicao_id else "",
                "fatura_id": item.fatura_id,
                "fatura_codigo": item.fatura.id_custom if item.fatura_id else "",
            }
            for item in fila
        ],
    }


executar = execute
