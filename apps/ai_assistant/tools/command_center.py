from __future__ import annotations

from collections import defaultdict
from datetime import timedelta
from typing import Any

from django.db.models import Avg, Count, Q
from django.utils import timezone

from apps.audit_activities.models.user_activity import UserActivity
from apps.monitoring.models.outbox_event import TransactionalOutboxEvent
from apps.monitoring.models.system_error import SystemError
from security.permissions.rbac import GROUPS as RBAC_GROUPS

from .base import AiTool, AiToolContext

MODULES = (
    {"key": "clinical", "label_pt": "Clínico", "label_en": "Clinical", "prefixes": ("/api/v1/clinical/", "/clinical/")},
    {"key": "reception", "label_pt": "Recepção", "label_en": "Reception", "prefixes": ("/api/v1/reception/", "/reception/")},
    {"key": "equipment", "label_pt": "Equipamentos", "label_en": "Equipment", "prefixes": ("/api/v1/equipment/", "/equipment/")},
    {"key": "billing", "label_pt": "Faturamento", "label_en": "Billing", "prefixes": ("/api/v1/billing/", "/billing/")},
    {"key": "payments", "label_pt": "Pagamentos", "label_en": "Payments", "prefixes": ("/api/v1/payments/", "/payments/")},
    {"key": "pharmacy", "label_pt": "Farmácia", "label_en": "Pharmacy", "prefixes": ("/api/v1/pharmacy/", "/pharmacy/")},
    {"key": "bloodbank", "label_pt": "Banco de Sangue", "label_en": "Blood Bank", "prefixes": ("/api/v1/bloodbank/", "/bloodbank/")},
    {"key": "nursing", "label_pt": "Enfermagem", "label_en": "Nursing", "prefixes": ("/api/v1/nursing/", "/nursing/")},
    {"key": "consultations", "label_pt": "Consultas", "label_en": "Consultations", "prefixes": ("/api/v1/consultations/", "/consultations/")},
    {"key": "education", "label_pt": "Educação", "label_en": "Education", "prefixes": ("/api/v1/education/", "/education/")},
    {"key": "accounting", "label_pt": "Contabilidade", "label_en": "Accounting", "prefixes": ("/api/v1/accounting/", "/accounting/")},
    {"key": "identity", "label_pt": "Identidade", "label_en": "Identity", "prefixes": ("/api/v1/identity/", "/identity/")},
    {"key": "medical_records", "label_pt": "Prontuário", "label_en": "Medical Records", "prefixes": ("/api/v1/medical_records/", "/medical-records/")},
    {"key": "monitoring", "label_pt": "Monitoramento", "label_en": "Monitoring", "prefixes": ("/api/v1/monitoring/", "/monitoring/")},
    {"key": "audit", "label_pt": "Auditoria", "label_en": "Audit", "prefixes": ("/api/v1/audit/", "/audit/")},
)


def coerce_int(value: Any, *, default: int, min_value: int, max_value: int) -> int:
    try:
        parsed = int(value)
    except Exception:
        parsed = default
    return max(min_value, min(max_value, parsed))


def percent(part: int, whole: int) -> float:
    if whole <= 0:
        return 0.0
    return round((part / whole) * 100, 2)


def resolve_module(path: str) -> dict[str, Any] | None:
    normalized = (path or "").strip().lower()
    if not normalized:
        return None
    for module in MODULES:
        for prefix in module["prefixes"]:
            if normalized.startswith(str(prefix).lower()):
                return module
    return None


class CommandCenterAlertsTool(AiTool):
    name = "get_command_center_alerts"
    description_pt = "Resume alertas activos, erros 4xx/5xx, saúde por módulo e estado da outbox."
    description_en = "Summarizes active alerts, 4xx/5xx errors, module health and outbox state."
    required_groups = (RBAC_GROUPS["ADMIN"],)
    mode = "read"

    def run(self, context: AiToolContext) -> dict[str, Any]:
        tenant = context.tenant
        now = timezone.now()
        days = coerce_int(context.arguments.get("days"), default=7, min_value=1, max_value=365)
        top = coerce_int(context.arguments.get("top"), default=8, min_value=3, max_value=25)
        range_start = now - timedelta(days=days)

        errors_qs = SystemError.objects.filter(
            tenant=tenant,
            deleted=False,
            created_at__gte=range_start,
            created_at__lte=now,
        )
        activity_qs = UserActivity.objects.filter(
            tenant=tenant,
            deleted=False,
            created_at__gte=range_start,
            created_at__lte=now,
        )

        error_totals = errors_qs.aggregate(
            total=Count("id"),
            client_4xx=Count("id", filter=Q(status_code__gte=400, status_code__lt=500)),
            server_5xx=Count("id", filter=Q(status_code__gte=500, status_code__lt=600)),
        )
        activity_totals = activity_qs.aggregate(
            total_requests=Count("id"),
            success_count=Count("id", filter=Q(status_code__gte=200, status_code__lt=400)),
            client_4xx=Count("id", filter=Q(status_code__gte=400, status_code__lt=500)),
            server_5xx=Count("id", filter=Q(status_code__gte=500, status_code__lt=600)),
            avg_duration_ms=Avg("duration_ms"),
        )

        activity_rows = list(
            activity_qs.exclude(path="")
            .values("path")
            .annotate(
                total=Count("id"),
                success=Count("id", filter=Q(status_code__gte=200, status_code__lt=400)),
                client_4xx=Count("id", filter=Q(status_code__gte=400, status_code__lt=500)),
                server_5xx=Count("id", filter=Q(status_code__gte=500, status_code__lt=600)),
                avg_duration_ms=Avg("duration_ms"),
            )
            .order_by("-total", "path")[:500]
        )
        system_route_rows = list(
            errors_qs.exclude(path="")
            .values("path")
            .annotate(
                total=Count("id"),
                client_4xx=Count("id", filter=Q(status_code__gte=400, status_code__lt=500)),
                server_5xx=Count("id", filter=Q(status_code__gte=500, status_code__lt=600)),
            )
            .order_by("-total", "path")[:500]
        )

        module_totals: dict[str, dict[str, Any]] = {
            module["key"]: {
                "module_key": module["key"],
                "label_pt": module["label_pt"],
                "label_en": module["label_en"],
                "total_requests": 0,
                "success_count": 0,
                "client_4xx": 0,
                "server_5xx": 0,
                "system_errors": 0,
                "success_rate": 0.0,
                "avg_duration_ms": 0.0,
                "slo_target": 99.0,
                "slo_gap": 0.0,
                "slo_state": "neutral",
            }
            for module in MODULES
        }
        weighted_duration = defaultdict(float)
        route_5xx_totals = defaultdict(int)

        for row in activity_rows:
            path = row.get("path") or ""
            module = resolve_module(path)
            if module:
                target = module_totals[module["key"]]
                total = int(row.get("total") or 0)
                success = int(row.get("success") or 0)
                client_4xx = int(row.get("client_4xx") or 0)
                server_5xx = int(row.get("server_5xx") or 0)
                target["total_requests"] += total
                target["success_count"] += success
                target["client_4xx"] += client_4xx
                target["server_5xx"] += server_5xx
                weighted_duration[module["key"]] += float(row.get("avg_duration_ms") or 0) * total
            if int(row.get("server_5xx") or 0) > 0:
                route_5xx_totals[path] += int(row.get("server_5xx") or 0)

        for row in system_route_rows:
            path = row.get("path") or ""
            module = resolve_module(path)
            if module:
                module_totals[module["key"]]["system_errors"] += int(row.get("total") or 0)
            if int(row.get("server_5xx") or 0) > 0:
                route_5xx_totals[path] += int(row.get("server_5xx") or 0)

        module_rows = []
        for item in module_totals.values():
            total = int(item["total_requests"])
            success_rate = percent(int(item["success_count"]), total)
            item["success_rate"] = success_rate
            item["avg_duration_ms"] = round(weighted_duration[item["module_key"]] / total, 2) if total else 0.0
            item["slo_gap"] = round(99.0 - success_rate, 2) if total else 0.0
            if total == 0 and not item["system_errors"]:
                item["slo_state"] = "neutral"
            elif success_rate < 95 or item["server_5xx"] >= 3 or item["system_errors"] >= 3:
                item["slo_state"] = "critical"
            elif success_rate < 99 or item["server_5xx"] > 0 or item["system_errors"] > 0:
                item["slo_state"] = "warning"
            else:
                item["slo_state"] = "healthy"
            module_rows.append(item)

        module_rows.sort(
            key=lambda row: (
                {"critical": 0, "warning": 1, "healthy": 2, "neutral": 3}.get(row["slo_state"], 4),
                -int(row["server_5xx"]),
                -int(row["system_errors"]),
                row["label_pt"],
            )
        )

        top_failing_routes = [
            {"path": path, "server_5xx": count}
            for path, count in sorted(route_5xx_totals.items(), key=lambda item: (-item[1], item[0]))[:top]
        ]

        outbox_qs = TransactionalOutboxEvent.objects.filter(
            occurred_at__gte=range_start,
            occurred_at__lte=now,
        )
        tenant_identifier = str(getattr(tenant, "identifier", "") or "").strip()
        if tenant_identifier:
            outbox_qs = outbox_qs.filter(tenant_identifier=tenant_identifier)
        outbox_pending = outbox_qs.filter(status=TransactionalOutboxEvent.Status.PENDING).count()
        outbox_failed = outbox_qs.filter(
            status__in=[TransactionalOutboxEvent.Status.FAILED, TransactionalOutboxEvent.Status.DEAD_LETTER]
        ).count()

        active_alerts = self._build_alerts(
            server_5xx=int(error_totals.get("server_5xx") or 0) + int(activity_totals.get("server_5xx") or 0),
            client_4xx=int(error_totals.get("client_4xx") or 0) + int(activity_totals.get("client_4xx") or 0),
            module_rows=module_rows,
            top_failing_routes=top_failing_routes,
            outbox_pending=outbox_pending,
            outbox_failed=outbox_failed,
        )

        return {
            "range": {"start": range_start.isoformat(), "end": now.isoformat(), "days": days},
            "global_totals": {
                "system_errors": int(error_totals.get("total") or 0),
                "total_requests": int(activity_totals.get("total_requests") or 0),
                "success_count": int(activity_totals.get("success_count") or 0),
                "client_4xx": int(error_totals.get("client_4xx") or 0) + int(activity_totals.get("client_4xx") or 0),
                "server_5xx": int(error_totals.get("server_5xx") or 0) + int(activity_totals.get("server_5xx") or 0),
                "avg_duration_ms": round(float(activity_totals.get("avg_duration_ms") or 0), 2),
                "modules_below_slo": sum(1 for row in module_rows if row["slo_state"] in {"warning", "critical"}),
            },
            "modules": module_rows[:top],
            "top_failing_routes": top_failing_routes,
            "alerts": active_alerts,
            "outbox": {"pending": outbox_pending, "failed_or_dead_letter": outbox_failed},
            "sources": [
                {"type": "page", "label": "Centro de comando", "href": f"/monitoring/command-center?days={days}"},
                {"type": "model", "label": "SystemError", "href": "/monitoring/errors"},
                {"type": "model", "label": "UserActivity", "href": "/audit"},
                {"type": "model", "label": "TransactionalOutboxEvent", "href": "/admin/monitoring/transactionaloutboxevent/"},
            ],
        }

    def _build_alerts(
        self,
        *,
        server_5xx: int,
        client_4xx: int,
        module_rows: list[dict[str, Any]],
        top_failing_routes: list[dict[str, Any]],
        outbox_pending: int,
        outbox_failed: int,
    ) -> list[dict[str, Any]]:
        alerts: list[dict[str, Any]] = []
        if server_5xx > 0:
            alerts.append(
                {
                    "severity": "critical",
                    "category": "server_errors",
                    "title_pt": "Falhas 5xx detectadas",
                    "title_en": "5xx failures detected",
                    "description_pt": f"Foram detectadas {server_5xx} falhas de servidor no período.",
                    "description_en": f"{server_5xx} server failures were detected in the selected range.",
                    "value": server_5xx,
                    "target": 0,
                }
            )
        if client_4xx >= 20:
            alerts.append(
                {
                    "severity": "warning",
                    "category": "client_errors",
                    "title_pt": "Volume elevado de erros 4xx",
                    "title_en": "High volume of 4xx errors",
                    "description_pt": f"Foram detectados {client_4xx} erros de cliente; pode haver problema de navegação, permissões ou formulários.",
                    "description_en": f"{client_4xx} client errors were detected; navigation, permissions or forms may need review.",
                    "value": client_4xx,
                    "target": 20,
                }
            )
        for route in top_failing_routes[:3]:
            alerts.append(
                {
                    "severity": "critical" if int(route["server_5xx"]) >= 3 else "warning",
                    "category": "critical_route",
                    "title_pt": "Rota com falhas 5xx",
                    "title_en": "Route with 5xx failures",
                    "description_pt": f"{route['path']} registou {route['server_5xx']} falhas 5xx.",
                    "description_en": f"{route['path']} registered {route['server_5xx']} 5xx failures.",
                    "value": int(route["server_5xx"]),
                    "target": 0,
                }
            )
        for module in module_rows[:5]:
            if module["slo_state"] in {"critical", "warning"}:
                label_pt = module["label_pt"]
                label_en = module["label_en"]
                alerts.append(
                    {
                        "severity": module["slo_state"],
                        "category": "module_slo",
                        "title_pt": f"{label_pt} abaixo da meta operacional",
                        "title_en": f"{label_en} below operational target",
                        "description_pt": f"Taxa de sucesso {module['success_rate']}%, erros 5xx {module['server_5xx']} e erros registados {module['system_errors']}.",
                        "description_en": f"Success rate {module['success_rate']}%, 5xx errors {module['server_5xx']} and recorded errors {module['system_errors']}.",
                        "value": module["success_rate"],
                        "target": module["slo_target"],
                    }
                )
        if outbox_failed > 0:
            alerts.append(
                {
                    "severity": "critical",
                    "category": "outbox",
                    "title_pt": "Eventos de outbox falhados",
                    "title_en": "Failed outbox events",
                    "description_pt": f"Há {outbox_failed} eventos falhados ou em dead letter.",
                    "description_en": f"There are {outbox_failed} failed or dead-letter outbox events.",
                    "value": outbox_failed,
                    "target": 0,
                }
            )
        elif outbox_pending >= 10:
            alerts.append(
                {
                    "severity": "warning",
                    "category": "outbox",
                    "title_pt": "Backlog de outbox",
                    "title_en": "Outbox backlog",
                    "description_pt": f"Há {outbox_pending} eventos pendentes na outbox.",
                    "description_en": f"There are {outbox_pending} pending outbox events.",
                    "value": outbox_pending,
                    "target": 10,
                }
            )
        return alerts
