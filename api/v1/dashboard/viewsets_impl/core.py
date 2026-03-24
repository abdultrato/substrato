from __future__ import annotations

import csv
import datetime as dt
from decimal import Decimal
import io

from django.db.models import Count, DecimalField, Sum, Value
from django.db.models.functions import Coalesce
from django.http import HttpResponse
from django.utils import timezone
from django.utils.dateparse import parse_date, parse_datetime
from drf_spectacular.utils import (
    OpenApiParameter,
    OpenApiResponse,
    OpenApiTypes,
    extend_schema,
)
from rest_framework import serializers
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.viewsets import GenericViewSet

from api.v1.viewset_mixins import ValidatedSearchOrderingMixin
from apps.clinical.models.patient import Patient
from apps.clinical.models.lab_request import LabRequest
from apps.clinical.models.lab_request_item import LabRequestItem
from apps.consultations.models.medical_consultation import MedicalConsultation
from apps.nursing.models.ward import WardAdmission
from apps.nursing.models.procedure_item import ProcedureItem
from apps.pharmacy.models.sale_item import SaleItem
from apps.pharmacy.models.product import Product
from apps.billing.models.invoice import Invoice
from apps.payments.models.payment import Payment
from domain.clinical.estado_resultado import EstadoResultado


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


class AnalyticsRangeSerializer(serializers.Serializer):
    inicio = serializers.CharField(required=False, allow_null=True)
    fim = serializers.CharField(required=False, allow_null=True)


class AnalyticsTopExameSerializer(serializers.Serializer):
    tipo = serializers.CharField()
    id = serializers.IntegerField(required=False, allow_null=True)
    nome = serializers.CharField()
    total = serializers.IntegerField()


class AnalyticsTopProcedimentoSerializer(serializers.Serializer):
    catalogo_id = serializers.IntegerField(required=False, allow_null=True)
    catalogo__nome = serializers.CharField(required=False, allow_blank=True)
    total = serializers.IntegerField()


class AnalyticsTopMedicamentoSerializer(serializers.Serializer):
    produto_id = serializers.IntegerField(required=False, allow_null=True)
    produto__nome = serializers.CharField(required=False, allow_blank=True)
    total_quantidade = serializers.DecimalField(max_digits=14, decimal_places=2)
    total_pedidos = serializers.IntegerField()


class AnalyticsTopConsultaSerializer(serializers.Serializer):
    tipo = serializers.CharField(required=False, allow_blank=True)
    total = serializers.IntegerField()


class AnalyticsResponseSerializer(serializers.Serializer):
    range = AnalyticsRangeSerializer()
    kpis = serializers.DictField(child=serializers.JSONField())
    top_exames = AnalyticsTopExameSerializer(many=True)
    top_procedimentos = AnalyticsTopProcedimentoSerializer(many=True)
    top_medicamentos = AnalyticsTopMedicamentoSerializer(many=True)
    top_consultas = AnalyticsTopConsultaSerializer(many=True)


class AnalyticsViewSet(ValidatedSearchOrderingMixin, GenericViewSet):
    """
    Painel de estatísticas (Top N) para o Administrador/Contabilidade.
    """

    queryset = LabRequest.objects.none()
    serializer_class = AnalyticsResponseSerializer
    permission_classes = [IsAuthenticated]
    http_method_names = ["get", "head", "options"]

    def _compute(self, request) -> dict:
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
        # KPIs (agregados principais)
        # =========================
        qs_pacientes = Patient.objects.filter(deletado=False)
        qs_requisicoes = LabRequest.objects.filter(deletado=False)
        qs_faturas = Invoice.objects.filter(deletado=False)
        qs_consultas = MedicalConsultation.objects.filter(deletado=False)
        qs_internamentos = WardAdmission.objects.filter(deletado=False)
        qs_pagamentos = Payment.objects.all()

        if inquilino is not None:
            qs_pacientes = qs_pacientes.filter(inquilino=inquilino)
            qs_requisicoes = qs_requisicoes.filter(inquilino=inquilino)
            qs_faturas = qs_faturas.filter(inquilino=inquilino)
            qs_consultas = qs_consultas.filter(inquilino=inquilino)
            qs_internamentos = qs_internamentos.filter(inquilino=inquilino)
            # Pagamento não tem inquilino direto; scopa pela fatura
            qs_pagamentos = qs_pagamentos.filter(fatura__inquilino=inquilino)

        pacientes_total = qs_pacientes.count()
        pacientes_novos = qs_pacientes.filter(criado_em__gte=inicio, criado_em__lte=fim).count()

        requisicoes_total = qs_requisicoes.filter(criado_em__gte=inicio, criado_em__lte=fim).count()
        requisicoes_validadas = qs_requisicoes.filter(
            criado_em__gte=inicio,
            criado_em__lte=fim,
            estado=EstadoResultado.VALIDADO,
        ).count()

        consultas_total = qs_consultas.filter(criado_em__gte=inicio, criado_em__lte=fim).count()

        faturas_total = qs_faturas.filter(criado_em__gte=inicio, criado_em__lte=fim).count()
        faturas_pagas = qs_faturas.filter(
            criado_em__gte=inicio,
            criado_em__lte=fim,
            estado=Invoice.Estado.PAGA,
        ).count()

        valor_faturado = (
            qs_faturas.filter(
                criado_em__gte=inicio,
                criado_em__lte=fim,
            )
            .exclude(estado=Invoice.Estado.CANCELADA)
            .aggregate(
                total=Coalesce(
                    Sum(
                        "total",
                        output_field=DecimalField(max_digits=14, decimal_places=2),
                    ),
                    Value(Decimal("0.00")),
                )
            )["total"]
        )

        valor_pago_confirmado = qs_pagamentos.filter(
            status=Payment.Status.CONFIRMADO,
            pago_em__isnull=False,
            pago_em__gte=inicio,
            pago_em__lte=fim,
        ).aggregate(
            total=Coalesce(
                Sum(
                    "valor",
                    output_field=DecimalField(max_digits=14, decimal_places=2),
                ),
                Value(Decimal("0.00")),
            )
        )["total"]

        internamentos_ativos = qs_internamentos.filter(ativo=True).count()
        camas_ocupadas = qs_internamentos.filter(ativo=True).values("cama_id").distinct().count()

        # =========================
        # EXAMES MAIS SOLICITADOS
        # =========================
        base_exames = LabRequestItem.objects.filter(
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
        base_procs = ProcedureItem.objects.filter(
            deletado=False,
            criado_em__gte=inicio,
            criado_em__lte=fim,
            catalogo__isnull=False,
        )
        if inquilino is not None:
            base_procs = base_procs.filter(inquilino=inquilino)

        top_procedimentos = list(
            base_procs.values("catalogo_id", "catalogo__nome").annotate(total=Count("id")).order_by("-total")[:limit]
        )

        # =========================
        # MEDICAMENTOS MAIS REQUISITADOS
        # =========================
        base_meds = SaleItem.objects.filter(
            deletado=False,
            criado_em__gte=inicio,
            criado_em__lte=fim,
            produto__tipo=Product.TipoProduto.MEDICAMENTO,
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
        base_cons = MedicalConsultation.objects.filter(
            deletado=False,
            criado_em__gte=inicio,
            criado_em__lte=fim,
        )
        if inquilino is not None:
            base_cons = base_cons.filter(inquilino=inquilino)

        top_consultas = list(base_cons.values("tipo").annotate(total=Count("id")).order_by("-total")[:limit])

        return {
            "range": {
                "inicio": inicio.isoformat() if inicio else None,
                "fim": fim.isoformat() if fim else None,
            },
            "kpis": {
                "Pacientes (total)": pacientes_total,
                "Pacientes (novos no período)": pacientes_novos,
                "Requisições (no período)": requisicoes_total,
                "Requisições validadas (no período)": requisicoes_validadas,
                "Consultas (no período)": consultas_total,
                "Faturas (no período)": faturas_total,
                "Faturas pagas (no período)": faturas_pagas,
                "Valor faturado (no período)": valor_faturado,
                "Valor pago confirmado (no período)": valor_pago_confirmado,
                "Internamentos ativos (agora)": internamentos_ativos,
                "Camas ocupadas (agora)": camas_ocupadas,
            },
            "top_exames": top_exames,
            "top_procedimentos": top_procedimentos,
            "top_medicamentos": top_medicamentos,
            "top_consultas": top_consultas,
        }

    @extend_schema(
        parameters=[
            OpenApiParameter("limit", OpenApiTypes.INT, OpenApiParameter.QUERY, description="Limite (1-50)"),
            OpenApiParameter("dias", OpenApiTypes.INT, OpenApiParameter.QUERY, description="Janela em dias (fallback)"),
            OpenApiParameter("inicio", OpenApiTypes.DATETIME, OpenApiParameter.QUERY, description="Data/hora inicial"),
            OpenApiParameter("fim", OpenApiTypes.DATETIME, OpenApiParameter.QUERY, description="Data/hora final"),
        ],
        responses={200: AnalyticsResponseSerializer},
    )
    def list(self, request):
        return Response(self._compute(request))

    @action(detail=False, methods=["get"], url_path="export")
    @extend_schema(
        parameters=[
            OpenApiParameter(
                "tipo",
                OpenApiTypes.STR,
                OpenApiParameter.QUERY,
                description="Formato de exportação: pdf|csv|word",
            ),
        ],
        responses={
            200: OpenApiResponse(response=OpenApiTypes.BINARY, description="Arquivo exportado (PDF/CSV/Word)."),
        },
    )
    def export(self, request):
        """
        Exporta o relatório do endpoint /dashboard/analytics/ em:
        - PDF (tipo=pdf)
        - CSV (tipo=csv)
        - Word (tipo=word)

        Nota: evitamos o query-param `format` porque o DRF usa esse nome
        para content negotiation e pode responder 404 quando não existe
        renderer para o formato solicitado.
        """
        fmt = (
            request.query_params.get("tipo")
            or request.query_params.get("saida")
            or request.query_params.get("export")
            or "pdf"
        )
        fmt = str(fmt).strip().lower()
        payload = self._compute(request)

        if fmt == "csv":
            output = io.StringIO()
            writer = csv.writer(output)

            rng = payload.get("range") or {}
            writer.writerow(["Relatório", "Estatísticas (Dashboard)"])
            writer.writerow(["Início", rng.get("inicio") or ""])
            writer.writerow(["Fim", rng.get("fim") or ""])
            writer.writerow([])

            writer.writerow(["Indicador", "Valor"])
            for k, v in (payload.get("kpis") or {}).items():
                writer.writerow([k, v])

            writer.writerow([])
            writer.writerow(["Top Exames (Tipo)", "Exame", "Total"])
            for r in payload.get("top_exames") or []:
                writer.writerow([r.get("tipo"), r.get("nome"), r.get("total")])

            writer.writerow([])
            writer.writerow(["Top Procedimentos", "Total"])
            for r in payload.get("top_procedimentos") or []:
                writer.writerow([r.get("catalogo__nome"), r.get("total")])

            writer.writerow([])
            writer.writerow(["Top Medicamentos", "Quantidade", "Pedidos"])
            for r in payload.get("top_medicamentos") or []:
                writer.writerow([r.get("produto__nome"), r.get("total_quantidade"), r.get("total_pedidos")])

            writer.writerow([])
            writer.writerow(["Top Consultas", "Total"])
            for r in payload.get("top_consultas") or []:
                writer.writerow([r.get("tipo"), r.get("total")])

            csv_bytes = output.getvalue().encode("utf-8")
            resp = HttpResponse(csv_bytes, content_type="text/csv; charset=utf-8")
            resp["Content-Disposition"] = "attachment; filename=relatorio_estatisticas.csv"
            return resp

        if fmt in {"word", "doc", "msword"}:
            rng = payload.get("range") or {}
            kpis = payload.get("kpis") or {}

            def _table_rows(rows: list[list[str]]) -> str:
                return "\n".join(
                    "<tr>" + "".join(f"<td>{(c if c is not None else '')}</td>" for c in r) + "</tr>" for r in rows
                )

            html = f"""<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <title>Relatório de Estatísticas</title>
  <style>
    body {{ font-family: Arial, sans-serif; font-size: 11pt; color: #111; }}
    h1 {{ font-size: 14pt; }}
    h2 {{ font-size: 12pt; margin-top: 18px; }}
    table {{ width: 100%; border-collapse: collapse; }}
    th, td {{ border: 1px solid #ddd; padding: 6px; vertical-align: top; }}
    th {{ background: #f2f2f2; text-align: left; }}
    .meta {{ margin: 8px 0 14px 0; color: #444; }}
  </style>
</head>
<body>
  <h1>Relatório de Estatísticas</h1>
  <div class="meta"><b>Período:</b> {rng.get("inicio") or ""} até {rng.get("fim") or ""}</div>

  <h2>Indicadores</h2>
  <table>
    <tr><th>Indicador</th><th>Valor</th></tr>
    {_table_rows([[k, str(v)] for k, v in kpis.items()])}
  </table>

  <h2>Exames Mais Solicitados</h2>
  <table>
    <tr><th>Tipo</th><th>Exame</th><th>Total</th></tr>
    {_table_rows([[r.get("tipo", ""), r.get("nome", ""), str(r.get("total", 0))] for r in (payload.get("top_exames") or [])])}
  </table>

  <h2>Procedimentos Mais Solicitados</h2>
  <table>
    <tr><th>Procedimento</th><th>Total</th></tr>
    {_table_rows([[r.get("catalogo__nome", ""), str(r.get("total", 0))] for r in (payload.get("top_procedimentos") or [])])}
  </table>

  <h2>Medicamentos Mais Requisitados</h2>
  <table>
    <tr><th>Medicamento</th><th>Quantidade</th><th>Pedidos</th></tr>
    {_table_rows([[r.get("produto__nome", ""), str(r.get("total_quantidade", 0)), str(r.get("total_pedidos", 0))] for r in (payload.get("top_medicamentos") or [])])}
  </table>

  <h2>Consultas Mais Marcadas</h2>
  <table>
    <tr><th>Consulta</th><th>Total</th></tr>
    {_table_rows([[r.get("tipo", ""), str(r.get("total", 0))] for r in (payload.get("top_consultas") or [])])}
  </table>
</body>
</html>
"""

            resp = HttpResponse(html.encode("utf-8"), content_type="application/msword")
            resp["Content-Disposition"] = "attachment; filename=relatorio_estatisticas.doc"
            return resp

        # PDF (default)
        from tasks.gerar_pdf.pdf_generator_analytics import gerar_pdf_analytics

        pdf_bytes, filename = gerar_pdf_analytics(payload, request=request)
        resp = HttpResponse(pdf_bytes, content_type="application/pdf")
        resp["Content-Disposition"] = f'attachment; filename="{filename}"'
        return resp


VIEWSET_MAP = {
    "analytics": AnalyticsViewSet,
}

__all__ = [
    "VIEWSET_MAP",
    "AnalyticsViewSet",
]
