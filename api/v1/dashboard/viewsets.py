from __future__ import annotations

import datetime as dt

from django.db.models import Count, Sum
from django.utils import timezone
from django.utils.dateparse import parse_date, parse_datetime
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.viewsets import ViewSet

from aplicativos.clinico.modelos.requisicao_item import RequisicaoItem
from aplicativos.consultas.modelos.consulta_medica import ConsultaMedica
from aplicativos.enfermagem.modelos.procedimento_item import ProcedimentoItem
from aplicativos.farmacia.models.item_venda import ItemVenda
from aplicativos.farmacia.models.produto import Produto


def _aware_or_none(value):
    if value is None:
        return None
    if timezone.is_naive(value):
        return timezone.make_aware(value, timezone.get_current_timezone())
    return value


def _parse_dt_start(value: str | None):
    if not value:
        return None
    parsed = parse_datetime(value)
    if parsed:
        return _aware_or_none(parsed)
    d = parse_date(value)
    if d:
        return _aware_or_none(dt.datetime.combine(d, dt.time.min))
    return None


def _parse_dt_end(value: str | None):
    if not value:
        return None
    parsed = parse_datetime(value)
    if parsed:
        return _aware_or_none(parsed)
    d = parse_date(value)
    if d:
        return _aware_or_none(dt.datetime.combine(d, dt.time.max))
    return None


class AnalyticsViewSet(ViewSet):
    """
    Painel de estatísticas (Top N) para o Administrador/Contabilidade.
    """

    permission_classes = [IsAuthenticated]
    http_method_names = ["get", "head", "options"]

    def list(self, request):
        inquilino = getattr(request, "inquilino", None)

        limit = int(request.query_params.get("limit") or 10)
        limit = max(1, min(limit, 50))

        dias = request.query_params.get("dias")
        inicio = _parse_dt_start(request.query_params.get("inicio"))
        fim = _parse_dt_end(request.query_params.get("fim"))

        if inicio is None and fim is None:
            try:
                dias_int = int(dias or 30)
            except Exception:
                dias_int = 30

            dias_int = max(1, min(dias_int, 3650))
            fim = timezone.now()
            inicio = fim - dt.timedelta(days=dias_int)

        if inicio is None:
            inicio = fim - dt.timedelta(days=30)
        if fim is None:
            fim = timezone.now()

        if inicio > fim:
            inicio, fim = fim, inicio

        # =========================
        # EXAMES MAIS SOLICITADOS
        # =========================
        base_exames = RequisicaoItem.objects.filter(
            deletado=False,
            criado_em__gte=inicio,
            criado_em__lte=fim,
        )
        if inquilino is not None:
            base_exames = base_exames.filter(inquilino=inquilino)

        top_exames_lab = list(
            base_exames.filter(exame__isnull=False)
            .values("exame_id", "exame__nome")
            .annotate(total=Count("id"))
            .order_by("-total")[:limit]
        )
        top_exames_medicos = list(
            base_exames.filter(exame_medico__isnull=False)
            .values("exame_medico_id", "exame_medico__nome")
            .annotate(total=Count("id"))
            .order_by("-total")[:limit]
        )

        top_exames = [
            {
                "tipo": "laboratorial",
                "id": row["exame_id"],
                "nome": row["exame__nome"],
                "total": row["total"],
            }
            for row in top_exames_lab
        ] + [
            {
                "tipo": "medico",
                "id": row["exame_medico_id"],
                "nome": row["exame_medico__nome"],
                "total": row["total"],
            }
            for row in top_exames_medicos
        ]

        top_exames = sorted(top_exames, key=lambda x: x["total"], reverse=True)[:limit]

        # =========================
        # PROCEDIMENTOS MAIS SOLICITADOS
        # =========================
        base_procs = ProcedimentoItem.objects.filter(
            deletado=False,
            criado_em__gte=inicio,
            criado_em__lte=fim,
            catalogo__isnull=False,
        )
        if inquilino is not None:
            base_procs = base_procs.filter(inquilino=inquilino)

        top_procedimentos = list(
            base_procs.values("catalogo_id", "catalogo__nome")
            .annotate(total=Count("id"))
            .order_by("-total")[:limit]
        )

        # =========================
        # MEDICAMENTOS MAIS REQUISITADOS
        # =========================
        base_meds = ItemVenda.objects.filter(
            deletado=False,
            criado_em__gte=inicio,
            criado_em__lte=fim,
            produto__tipo=Produto.TipoProduto.MEDICAMENTO,
        )
        if inquilino is not None:
            base_meds = base_meds.filter(inquilino=inquilino)

        top_medicamentos = list(
            base_meds.values("produto_id", "produto__nome")
            .annotate(total_quantidade=Sum("quantidade"), total_pedidos=Count("id"))
            .order_by("-total_quantidade")[:limit]
        )

        # =========================
        # CONSULTAS MAIS MARCADAS
        # =========================
        base_cons = ConsultaMedica.objects.filter(
            deletado=False,
            criado_em__gte=inicio,
            criado_em__lte=fim,
        )
        if inquilino is not None:
            base_cons = base_cons.filter(inquilino=inquilino)

        top_consultas = list(
            base_cons.values("tipo").annotate(total=Count("id")).order_by("-total")[:limit]
        )

        return Response(
            {
                "range": {
                    "inicio": inicio.isoformat() if inicio else None,
                    "fim": fim.isoformat() if fim else None,
                },
                "top_exames": top_exames,
                "top_procedimentos": top_procedimentos,
                "top_medicamentos": top_medicamentos,
                "top_consultas": top_consultas,
            }
        )


VIEWSET_MAP = {
    "analytics": AnalyticsViewSet,
}

__all__ = [
    "AnalyticsViewSet",
    "VIEWSET_MAP",
]

