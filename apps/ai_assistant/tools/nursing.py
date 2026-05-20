from __future__ import annotations

from datetime import timedelta
from typing import Any

from django.utils import timezone

from apps.clinical.models import LabRequest
from apps.nursing.models import Procedure, WardAdmission
from domain.clinical.result_state import ResultState
from security.permissions.rbac import GROUPS as RBAC_GROUPS

from .base import AiTool, AiToolContext
from .command_center import coerce_int


class NursingPendingWorkTool(AiTool):
    name = "get_nursing_pending_work"
    description_pt = "Resume colheitas laboratoriais, procedimentos e internamentos pendentes para enfermagem."
    description_en = "Summarizes laboratory collections, procedures and admissions pending for nursing."
    required_groups = (RBAC_GROUPS["ADMIN"], RBAC_GROUPS["ENFERMAGEM"], RBAC_GROUPS["MEDICINA"])
    mode = "read"

    def run(self, context: AiToolContext) -> dict[str, Any]:
        tenant = context.tenant
        days = coerce_int(context.arguments.get("days"), default=7, min_value=1, max_value=365)
        since = timezone.now() - timedelta(days=days)

        collections_qs = LabRequest.objects.filter(
            tenant=tenant,
            deleted=False,
            type=LabRequest.Type.LABORATORY,
            status__in=[ResultState.PENDING, ResultState.IN_ANALYSIS, ResultState.AWAITING_VALIDATION],
        )
        procedures_qs = Procedure.objects.filter(
            tenant=tenant,
            deleted=False,
            workflow_status__in=[Procedure.WorkflowStatus.REQUESTED, Procedure.WorkflowStatus.PARTIAL],
            created_at__gte=since,
        )
        admissions_qs = WardAdmission.objects.filter(tenant=tenant, deleted=False, discharged_at__isnull=True)

        return {
            "summary": {
                "title_pt": "Trabalho pendente de enfermagem",
                "title_en": "Nursing pending work",
                "metrics": [
                    {"label_pt": "Colheitas laboratoriais", "label_en": "Laboratory collections", "value": collections_qs.count()},
                    {"label_pt": "Procedimentos pendentes", "label_en": "Pending procedures", "value": procedures_qs.count()},
                    {"label_pt": "Internamentos activos", "label_en": "Active admissions", "value": admissions_qs.count()},
                ],
                "recent_collections": list(collections_qs.order_by("-created_at").values("custom_id", "status", "requires_fasting", "fasting_hours")[:8]),
            },
            "sources": [
                {"type": "model", "label": "LabRequest", "href": "/nursing"},
                {"type": "model", "label": "Procedure", "href": "/nursing"},
                {"type": "model", "label": "WardAdmission", "href": "/nursing"},
            ],
        }
