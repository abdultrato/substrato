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
from apps.billing.models.invoice import Invoice
from apps.clinical.models.lab_request import LabRequest
from apps.clinical.models.lab_request_item import LabRequestItem
from apps.clinical.models.patient import Patient
from apps.consultations.models.medical_consultation import MedicalConsultation
from apps.nursing.models.procedure_item import ProcedureItem
from apps.nursing.models.ward import WardAdmission
from apps.payments.models.payment import Payment
from apps.pharmacy.models.product import Product
from apps.pharmacy.models.sale_item import SaleItem
from domain.clinical.request_state import RequestState


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


class AnalyticsTopExamSerializer(serializers.Serializer):
    type = serializers.CharField()
    id = serializers.IntegerField(required=False, allow_null=True)
    name = serializers.CharField()
    total = serializers.IntegerField()


class AnalyticsTopProcedimentoSerializer(serializers.Serializer):
    catalog_id = serializers.IntegerField(required=False, allow_null=True)
    catalog__name = serializers.CharField(required=False, allow_blank=True)
    total = serializers.IntegerField()


class AnalyticsTopMedicamentoSerializer(serializers.Serializer):
    product_id = serializers.IntegerField(required=False, allow_null=True)
    product__name = serializers.CharField(required=False, allow_blank=True)
    total_quantity = serializers.DecimalField(max_digits=14, decimal_places=2)
    total_pedidos = serializers.IntegerField()


class AnalyticsTopConsultaSerializer(serializers.Serializer):
    type = serializers.CharField(required=False, allow_blank=True)
    total = serializers.IntegerField()


class AnalyticsResponseSerializer(serializers.Serializer):
    range = AnalyticsRangeSerializer()
    kpis = serializers.DictField(child=serializers.JSONField())
    top_exams = AnalyticsTopExamSerializer(many=True)
    top_procedures = AnalyticsTopProcedimentoSerializer(many=True)
    top_medicamentos = AnalyticsTopMedicamentoSerializer(many=True)
    top_consultations = AnalyticsTopConsultaSerializer(many=True)


class AnalyticsViewSet(ValidatedSearchOrderingMixin, GenericViewSet):
    """
    Painel de estatísticas (Top N) para o Administrador/Contabilidade.
    """

    queryset = LabRequest.objects.none()
    serializer_class = AnalyticsResponseSerializer
    permission_classes = [IsAuthenticated]
    http_method_names = ["get", "head", "options"]

    def _compute(self, request) -> dict:
        tenant = getattr(request, "tenant", None)

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
        qs_pacientes = Patient.objects.filter(deleted=False)
        qs_requisicoes = LabRequest.objects.filter(deleted=False)
        qs_faturas = Invoice.objects.filter(deleted=False)
        qs_consultations = MedicalConsultation.objects.filter(deleted=False)
        qs_internamentos = WardAdmission.objects.filter(deleted=False)
        qs_pagamentos = Payment.objects.all()

        if tenant is not None:
            qs_pacientes = qs_pacientes.filter(tenant=tenant)
            qs_requisicoes = qs_requisicoes.filter(tenant=tenant)
            qs_faturas = qs_faturas.filter(tenant=tenant)
            qs_consultations = qs_consultations.filter(tenant=tenant)
            qs_internamentos = qs_internamentos.filter(tenant=tenant)
            # Pagamento não tem tenant direto; scopa pela invoice
            qs_pagamentos = qs_pagamentos.filter(invoice__tenant=tenant)

        pacientes_total = qs_pacientes.count()
        pacientes_novos = qs_pacientes.filter(created_at__gte=inicio, created_at__lte=fim).count()

        requisicoes_total = qs_requisicoes.filter(created_at__gte=inicio, created_at__lte=fim).count()
        requisicoes_validadas = qs_requisicoes.filter(
            created_at__gte=inicio,
            created_at__lte=fim,
            status=RequestState.VALIDATED,
        ).count()

        consultations_total = qs_consultations.filter(created_at__gte=inicio, created_at__lte=fim).count()

        faturas_total = qs_faturas.filter(created_at__gte=inicio, created_at__lte=fim).count()
        faturas_pagas = qs_faturas.filter(
            created_at__gte=inicio,
            created_at__lte=fim,
            status=Invoice.Estado.PAGA,
        ).count()

        value_faturado = (
            qs_faturas.filter(
                created_at__gte=inicio,
                created_at__lte=fim,
            )
            .exclude(status=Invoice.Estado.CANCELADA)
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

        value_pago_confirmed = qs_pagamentos.filter(
            status=Payment.Status.CONFIRMADO,
            paid_at__isnull=False,
            paid_at__gte=inicio,
            paid_at__lte=fim,
        ).aggregate(
            total=Coalesce(
                Sum(
                    "value",
                    output_field=DecimalField(max_digits=14, decimal_places=2),
                ),
                Value(Decimal("0.00")),
            )
        )["total"]

        internamentos_ativos = qs_internamentos.filter(active=True).count()
        camas_ocupadas = qs_internamentos.filter(active=True).values("bed_id").distinct().count()

        # =========================
        # EXAMES MAIS SOLICITADOS
        # =========================
        base_exams = LabRequestItem.objects.filter(
            deleted=False,
            created_at__gte=inicio,
            created_at__lte=fim,
        )
        if tenant is not None:
            base_exams = base_exams.filter(tenant=tenant)

        top_exams_lab = list(
            base_exams.filter(exam__isnull=False)
            .values("exam_id", "exam__name")
            .annotate(total=Count("id"))
            .order_by("-total")[:limit]
        )
        top_exams_medicos = list(
            base_exams.filter(medical_exam__isnull=False)
            .values("medical_exam_id", "medical_exam__name")
            .annotate(total=Count("id"))
            .order_by("-total")[:limit]
        )

        top_exams = [
            {
                "type": "laboratorial",
                "id": row["exam_id"],
                "name": row["exam__name"],
                "total": row["total"],
            }
            for row in top_exams_lab
        ] + [
            {
                "type": "doctor",
                "id": row["medical_exam_id"],
                "name": row["medical_exam__name"],
                "total": row["total"],
            }
            for row in top_exams_medicos
        ]

        top_exams = sorted(top_exams, key=lambda x: x["total"], reverse=True)[:limit]

        # =========================
        # PROCEDIMENTOS MAIS SOLICITADOS
        # =========================
        base_procs = ProcedureItem.objects.filter(
            deleted=False,
            created_at__gte=inicio,
            created_at__lte=fim,
            catalog__isnull=False,
        )
        if tenant is not None:
            base_procs = base_procs.filter(tenant=tenant)

        top_procedures = list(
            base_procs.values("catalog_id", "catalog__name").annotate(total=Count("id")).order_by("-total")[:limit]
        )

        # =========================
        # MEDICAMENTOS MAIS REQUISITADOS
        # =========================
        base_meds = SaleItem.objects.filter(
            deleted=False,
            created_at__gte=inicio,
            created_at__lte=fim,
            product__type=Product.TipoProduto.MEDICAMENTO,
        )
        if tenant is not None:
            base_meds = base_meds.filter(tenant=tenant)

        top_medicamentos = list(
            base_meds.values("product_id", "product__name")
            .annotate(total_quantity=Sum("quantity"), total_pedidos=Count("id"))
            .order_by("-total_quantity")[:limit]
        )

        # =========================
        # CONSULTAS MAIS MARCADAS
        # =========================
        base_cons = MedicalConsultation.objects.filter(
            deleted=False,
            created_at__gte=inicio,
            created_at__lte=fim,
        )
        if tenant is not None:
            base_cons = base_cons.filter(tenant=tenant)

        top_consultations = list(base_cons.values("type").annotate(total=Count("id")).order_by("-total")[:limit])

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
                "Consultas (no período)": consultations_total,
                "Faturas (no período)": faturas_total,
                "Faturas pagas (no período)": faturas_pagas,
                "Valor faturado (no período)": value_faturado,
                "Valor pago confirmed (no período)": value_pago_confirmed,
                "Internamentos ativos (agora)": internamentos_ativos,
                "Camas ocupadas (agora)": camas_ocupadas,
            },
            "top_exams": top_exams,
            "top_procedures": top_procedures,
            "top_medicamentos": top_medicamentos,
            "top_consultations": top_consultations,
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
                "type",
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
        - PDF (type=pdf)
        - CSV (type=csv)
        - Word (type=word)

        Nota: evitamos o query-param `format` porque o DRF usa esse name
        para content negotiation e pode responder 404 quando não existe
        renderer para o formato solicitado.
        """
        fmt = (
            request.query_params.get("type")
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
            for r in payload.get("top_exams") or []:
                writer.writerow([r.get("type"), r.get("name"), r.get("total")])

            writer.writerow([])
            writer.writerow(["Top Procedimentos", "Total"])
            for r in payload.get("top_procedures") or []:
                writer.writerow([r.get("catalog__name"), r.get("total")])

            writer.writerow([])
            writer.writerow(["Top Medicamentos", "Quantidade", "Pedidos"])
            for r in payload.get("top_medicamentos") or []:
                writer.writerow([r.get("product__name"), r.get("total_quantity"), r.get("total_pedidos")])

            writer.writerow([])
            writer.writerow(["Top Consultas", "Total"])
            for r in payload.get("top_consultations") or []:
                writer.writerow([r.get("type"), r.get("total")])

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
    {_table_rows([[r.get("type", ""), r.get("name", ""), str(r.get("total", 0))] for r in (payload.get("top_exams") or [])])}
  </table>

  <h2>Procedimentos Mais Solicitados</h2>
  <table>
    <tr><th>Procedimento</th><th>Total</th></tr>
    {_table_rows([[r.get("catalog__name", ""), str(r.get("total", 0))] for r in (payload.get("top_procedures") or [])])}
  </table>

  <h2>Medicamentos Mais Requisitados</h2>
  <table>
    <tr><th>Medicamento</th><th>Quantidade</th><th>Pedidos</th></tr>
    {_table_rows([[r.get("product__name", ""), str(r.get("total_quantity", 0)), str(r.get("total_pedidos", 0))] for r in (payload.get("top_medicamentos") or [])])}
  </table>

  <h2>Consultas Mais Marcadas</h2>
  <table>
    <tr><th>Consulta</th><th>Total</th></tr>
    {_table_rows([[r.get("type", ""), str(r.get("total", 0))] for r in (payload.get("top_consultations") or [])])}
  </table>
</body>
</html>
"""

            resp = HttpResponse(html.encode("utf-8"), content_type="application/msword")
            resp["Content-Disposition"] = "attachment; filename=relatorio_estatisticas.doc"
            return resp

        # PDF (default)
        from tasks.generate_pdf.analytics_pdf_generator import generate_analytics_pdf

        pdf_bytes, filename = generate_analytics_pdf(payload, request=request)
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
