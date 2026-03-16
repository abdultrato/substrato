from decimal import Decimal

from django.db.models import Case, IntegerField, Sum, Value, When
from django.db.models.functions import Coalesce
from django.utils import timezone

from aplicativos.clinico.modelos.paciente import Paciente
from aplicativos.clinico.modelos.requisicao_analise import RequisicaoAnalise
from aplicativos.faturamento.modelos.fatura import Fatura
from aplicativos.pagamentos.modelos.pagamentos import Pagamento
from aplicativos.pagamentos.modelos.recibo import Recibo
from aplicativos.recepcao.modelos.checkin_recepcao import CheckinRecepcao
from dominio.clinico.estado_resultado import EstadoResultado


def executar(inquilino):
    hoje = timezone.localdate()

    checkins_hoje = CheckinRecepcao.objects.filter(
        inquilino=inquilino,
        chegou_em__date=hoje,
    )

    fila = (
        checkins_hoje.exclude(
            estado__in=[
                CheckinRecepcao.Estado.CONCLUIDO,
                CheckinRecepcao.Estado.CANCELADO,
            ]
        )
        .select_related("paciente", "requisicao", "fatura", "atendente")
        .annotate(
            prioridade_ordem=Case(
                When(prioridade=CheckinRecepcao.Prioridade.URGENTE, then=Value(0)),
                When(prioridade=CheckinRecepcao.Prioridade.PREFERENCIAL, then=Value(1)),
                default=Value(2),
                output_field=IntegerField(),
            ),
            estado_ordem=Case(
                When(estado=CheckinRecepcao.Estado.AGUARDANDO, then=Value(0)),
                When(estado=CheckinRecepcao.Estado.EM_ATENDIMENTO, then=Value(1)),
                When(estado=CheckinRecepcao.Estado.REQUISICAO_CRIADA, then=Value(2)),
                When(estado=CheckinRecepcao.Estado.FATURA_VINCULADA, then=Value(3)),
                default=Value(4),
                output_field=IntegerField(),
            ),
        )
        .order_by("estado_ordem", "prioridade_ordem", "chegou_em")[:12]
    )

    recebido_hoje = (
        Pagamento.objects.filter(
            fatura__inquilino=inquilino,
            status=Pagamento.Status.CONFIRMADO,
            pago_em__date=hoje,
        ).aggregate(total=Coalesce(Sum("valor"), Decimal("0.00")))
    )["total"]

    return {
        "data": str(hoje),
        "resumo": {
            "checkins_hoje": checkins_hoje.count(),
            "na_fila": checkins_hoje.filter(estado=CheckinRecepcao.Estado.AGUARDANDO).count(),
            "em_atendimento": checkins_hoje.filter(estado=CheckinRecepcao.Estado.EM_ATENDIMENTO).count(),
            "pacientes_novos": Paciente.objects.filter(inquilino=inquilino, criado_em__date=hoje).count(),
            "requisicoes_pendentes": RequisicaoAnalise.objects.filter(
                inquilino=inquilino,
                estado=EstadoResultado.PENDENTE,
            ).count(),
            "faturas_em_aberto": Fatura.objects.filter(
                inquilino=inquilino,
                estado=Fatura.Estado.EMITIDA,
            ).count(),
            "recibos_gerados_hoje": Recibo.objects.filter(
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
