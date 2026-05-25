from __future__ import annotations

from datetime import timedelta
import re
from typing import Any

from django.db.models import Count
from django.utils import timezone

from apps.clinical.models import LabRequest, Patient, ResultItem, Sample
from domain.clinical.result_state import ResultState
from security.permissions.rbac import GROUPS as RBAC_GROUPS

from .base import AiTool, AiToolContext
from .command_center import coerce_int

CLINICAL_GROUPS = (
    RBAC_GROUPS["ADMIN"],
    RBAC_GROUPS["MEDICINA"],
    RBAC_GROUPS["MEDICINA_OCUPACIONAL"],
    RBAC_GROUPS["LABORATORIO"],
    RBAC_GROUPS["ENFERMAGEM"],
    RBAC_GROUPS["RECEPCAO"],
)


def _request_code_from_text(text: str) -> str:
    match = re.search(r"\bREQ-[A-Za-z0-9-]+", text or "", flags=re.IGNORECASE)
    return match.group(0).upper() if match else ""


class ClinicalOperationalSummaryTool(AiTool):
    name = "get_clinical_operational_summary"
    description_pt = "Resume pacientes, requisições, resultados críticos e pendências clínicas."
    description_en = "Summarizes patients, requests, critical results and clinical pending work."
    required_groups = CLINICAL_GROUPS
    mode = "read"

    def run(self, context: AiToolContext) -> dict[str, Any]:
        tenant = context.tenant
        days = coerce_int(context.arguments.get("days"), default=7, min_value=1, max_value=365)
        since = timezone.now() - timedelta(days=days)

        requests_qs = LabRequest.objects.filter(tenant=tenant, deleted=False, created_at__gte=since)
        status_rows = list(requests_qs.values("status").annotate(total=Count("id")).order_by("-total", "status"))
        recent_requests = list(
            requests_qs.select_related("patient")
            .order_by("-created_at", "-id")
            .values("custom_id", "status", "type", "has_critical_result", "patient__custom_id")[:8]
        )

        return {
            "summary": {
                "title_pt": "Resumo clínico operacional",
                "title_en": "Clinical operational summary",
                "metrics": [
                    {"label_pt": "Pacientes registados", "label_en": "Registered patients", "value": Patient.objects.filter(tenant=tenant, deleted=False).count()},
                    {"label_pt": f"Requisições em {days} dia(s)", "label_en": f"Requests in {days} day(s)", "value": requests_qs.count()},
                    {"label_pt": "Aguardam validação", "label_en": "Awaiting validation", "value": requests_qs.filter(status=ResultState.AWAITING_VALIDATION).count()},
                    {"label_pt": "Com resultado crítico", "label_en": "With critical result", "value": requests_qs.filter(has_critical_result=True).count()},
                    {"label_pt": "Itens críticos", "label_en": "Critical items", "value": ResultItem.objects.filter(tenant=tenant, deleted=False, critical_alert=True, created_at__gte=since).count()},
                    {"label_pt": "Amostras configuradas", "label_en": "Configured samples", "value": Sample.objects.filter(tenant=tenant, deleted=False).count()},
                ],
                "status_rows": status_rows,
                "recent_requests": recent_requests,
            },
            "sources": [
                {"type": "model", "label": "LabRequest", "href": "/requests"},
                {"type": "model", "label": "ResultItem", "href": "/laboratory"},
                {"type": "model", "label": "Sample", "href": "/exams"},
            ],
        }


class LabRequestCollectionGuidanceTool(AiTool):
    name = "get_lab_request_collection_guidance"
    description_pt = "Mostra exames solicitados, opções de amostra, frasco/tubo e volume mínimo para colheita."
    description_en = "Shows requested exams, sample options, bottle/tube and minimum volume for collection."
    required_groups = CLINICAL_GROUPS
    mode = "read"

    def run(self, context: AiToolContext) -> dict[str, Any]:
        tenant = context.tenant
        raw_code = str(context.arguments.get("request_code") or "").strip()
        request_code = raw_code.upper() or _request_code_from_text(str(context.arguments.get("message") or ""))

        request = None
        if request_code:
            request = (
                LabRequest.objects.filter(tenant=tenant, deleted=False, type=LabRequest.Type.LABORATORY)
                .filter(custom_id__iexact=request_code)
                .select_related("patient")
                .first()
            )

        if request is None:
            recent = list(
                LabRequest.objects.filter(tenant=tenant, deleted=False, type=LabRequest.Type.LABORATORY)
                .order_by("-created_at", "-id")
                .values("custom_id", "status", "has_critical_result", "requires_fasting", "fasting_hours")[:8]
            )
            return {
                "summary": {
                    "title_pt": "Guia de colheita laboratorial",
                    "title_en": "Laboratory collection guidance",
                    "metrics": [
                        {"label_pt": "Requisição específica", "label_en": "Specific request", "value": "não indicada"},
                        {"label_pt": "Requisições recentes", "label_en": "Recent requests", "value": len(recent)},
                    ],
                    "recent_requests": recent,
                    "requires_request_code": True,
                },
                "sources": [{"type": "model", "label": "LabRequest", "href": "/requests"}],
            }

        guidance = request.build_collection_guidance()
        return {
            "summary": {
                "title_pt": f"Guia de colheita {request.custom_id}",
                "title_en": f"Collection guidance {request.custom_id}",
                "metrics": [
                    {"label_pt": "Exames solicitados", "label_en": "Requested exams", "value": len(guidance)},
                    {"label_pt": "Requer jejum", "label_en": "Requires fasting", "value": "sim" if request.requires_fasting else "não"},
                    {"label_pt": "Horas de jejum", "label_en": "Fasting hours", "value": int(request.fasting_hours or 0)},
                ],
                "request": {
                    "custom_id": request.custom_id,
                    "status": request.status,
                    "patient_code": getattr(request.patient, "custom_id", "") or "",
                },
                "collection_guidance": guidance,
            },
            "sources": [
                {"type": "model", "label": "LabRequest", "href": f"/requests/{request.id}"},
                {"type": "model", "label": "Sample", "href": "/exams"},
            ],
        }
