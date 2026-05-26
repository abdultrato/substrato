from collections import defaultdict
from datetime import timedelta

from django.db.models import Avg, Count, Q
from django.db.models.functions import TruncDay, TruncHour
from django.http import HttpResponse
from django.urls import reverse
from django.utils import timezone
from rest_framework.decorators import action
from rest_framework.exceptions import NotFound
from rest_framework.permissions import IsAdminUser, IsAuthenticated  # Protege o endpoint
from rest_framework.response import Response
from rest_framework.viewsets import ModelViewSet, ViewSet

from api.v1.viewset_mixins import TenantScopedQuerysetMixin, ValidatedSearchOrderingMixin
from apps.audit_activities.models.user_activity import UserActivity
from apps.monitoring.models.outbox_event import TransactionalOutboxEvent
from apps.monitoring.models.system_error import SystemError
from events.runtime_bridge import get_runtime, runtime_enabled
from services.reports.async_exports import (
    can_access_export_job,
    get_export_job_result,
    get_export_job_state,
)
from substrato_os.cloud import CloudControlPlaneError

from ..filters import SystemErrorFilter
from ..serializers import SystemErrorSerializer


class SystemErrorViewSet(ValidatedSearchOrderingMixin, TenantScopedQuerysetMixin, ModelViewSet):
    queryset = SystemError.objects.select_related("user").all()
    serializer_class = SystemErrorSerializer
    filterset_class = SystemErrorFilter
    permission_classes = [IsAuthenticated]
    search_fields = [
        "custom_id",
        "path",
        "full_path",
        "exception_class",
        "message",
        "traceback",
        "view_basename",
        "view_action",
        "object_id",
        "user__username",
        "user__email",
    ]
    ordering_fields = [
        "created_at",
        "updated_at",
        "status_code",
        "duration_ms",
        "exception_class",
        "path",
        "method",
        "view_basename",
        "view_action",
    ]
    ordering = ["-created_at", "-id"]


def _coerce_int(value, *, default: int, min_value: int | None = None, max_value: int | None = None) -> int:
    try:
        parsed = int(value)
    except Exception:
        parsed = int(default)

    if min_value is not None and parsed < min_value:
        return int(min_value)
    if max_value is not None and parsed > max_value:
        return int(max_value)
    return parsed


def _coerce_float(value, *, default: float, min_value: float | None = None, max_value: float | None = None) -> float:
    try:
        parsed = float(value)
    except Exception:
        parsed = float(default)

    if min_value is not None and parsed < min_value:
        return float(min_value)
    if max_value is not None and parsed > max_value:
        return float(max_value)
    return parsed


def _client_ip_from_request(request) -> str | None:
    try:
        xff = (request.META.get("HTTP_X_FORWARDED_FOR") or "").split(",")[0].strip()
        if xff:
            return xff
        remote = (request.META.get("REMOTE_ADDR") or "").strip()
        return remote or None
    except Exception:
        return None


def _percent(part: int, whole: int) -> float:
    if whole <= 0:
        return 0.0
    return round((part / whole) * 100, 2)


def _next_report_run(now, frequency: str):
    local_now = timezone.localtime(now)
    if frequency == "daily":
        candidate = local_now.replace(hour=6, minute=0, second=0, microsecond=0)
        if candidate <= local_now:
            candidate += timedelta(days=1)
        return candidate

    if frequency == "weekly":
        candidate = local_now.replace(hour=6, minute=0, second=0, microsecond=0)
        days_until_monday = (7 - candidate.weekday()) % 7
        if days_until_monday == 0 and candidate <= local_now:
            days_until_monday = 7
        return candidate + timedelta(days=days_until_monday)

    year = local_now.year + (1 if local_now.month == 12 else 0)
    month = 1 if local_now.month == 12 else local_now.month + 1
    return local_now.replace(year=year, month=month, day=1, hour=6, minute=0, second=0, microsecond=0)


COMMAND_CENTER_MODULES = (
    {
        "key": "clinical",
        "label_pt": "Clínico",
        "label_en": "Clinical",
        "prefixes": ("/api/v1/clinical/", "/clinical/"),
        "critical_paths": ("/api/v1/clinical/labrequest/", "/api/v1/clinical/resultitem/"),
    },
    {
        "key": "reception",
        "label_pt": "Recepção",
        "label_en": "Reception",
        "prefixes": ("/api/v1/reception/", "/reception/", "/api/v1/recepcao/", "/recepcao/"),
        "critical_paths": ("/api/v1/reception/checkin/", "/api/v1/reception/atendimento/"),
    },
    {
        "key": "equipment",
        "label_pt": "Equipamentos",
        "label_en": "Equipment",
        "prefixes": ("/api/v1/equipment/", "/equipment/"),
    },
    {
        "key": "entities",
        "label_pt": "Entidades",
        "label_en": "Entities",
        "prefixes": ("/api/v1/external_entities/", "/external_entities/", "/entities/"),
    },
    {
        "key": "billing",
        "label_pt": "Faturamento",
        "label_en": "Billing",
        "prefixes": ("/api/v1/billing/", "/billing/"),
    },
    {
        "key": "payments",
        "label_pt": "Pagamentos",
        "label_en": "Payments",
        "prefixes": ("/api/v1/payments/", "/payments/"),
    },
    {
        "key": "pharmacy",
        "label_pt": "Farmácia",
        "label_en": "Pharmacy",
        "prefixes": ("/api/v1/pharmacy/", "/pharmacy/"),
    },
    {
        "key": "bloodbank",
        "label_pt": "Banco de Sangue",
        "label_en": "Blood Bank",
        "prefixes": ("/api/v1/bloodbank/", "/bloodbank/"),
    },
    {
        "key": "nursing",
        "label_pt": "Enfermagem",
        "label_en": "Nursing",
        "prefixes": ("/api/v1/nursing/", "/nursing/", "/api/v1/enfermagem/", "/enfermagem/"),
    },
    {
        "key": "insurer",
        "label_pt": "Seguradora",
        "label_en": "Insurer",
        "prefixes": ("/api/v1/insurer/", "/insurer/", "/seguradora/"),
    },
    {
        "key": "accounting",
        "label_pt": "Contabilidade",
        "label_en": "Accounting",
        "prefixes": ("/api/v1/accounting/", "/accounting/", "/contabilidade/"),
    },
    {
        "key": "consultations",
        "label_pt": "Consultas",
        "label_en": "Consultations",
        "prefixes": ("/api/v1/consultations/", "/consultations/"),
    },
    {
        "key": "education",
        "label_pt": "Educação",
        "label_en": "Education",
        "prefixes": ("/api/v1/education/", "/education/"),
    },
    {
        "key": "tenants",
        "label_pt": "Inquilinos",
        "label_en": "Tenants",
        "prefixes": ("/api/v1/tenants/", "/tenants/"),
    },
    {
        "key": "notifications",
        "label_pt": "Notificações",
        "label_en": "Notifications",
        "prefixes": ("/api/v1/notifications/", "/notifications/", "/notificacoes/"),
    },
    {
        "key": "identity",
        "label_pt": "Identidade",
        "label_en": "Identity",
        "prefixes": ("/api/v1/identity/", "/identity/"),
    },
    {
        "key": "medical_records",
        "label_pt": "Prontuário",
        "label_en": "Medical Records",
        "prefixes": ("/api/v1/medical_records/", "/medical-records/", "/prontuario/"),
    },
    {
        "key": "maternity",
        "label_pt": "Maternidade",
        "label_en": "Maternity",
        "prefixes": ("/api/v1/maternity/", "/maternity/", "/maternidade/"),
    },
    {
        "key": "surgery",
        "label_pt": "Cirurgia",
        "label_en": "Surgery",
        "prefixes": ("/api/v1/surgery/", "/surgery/", "/cirurgia/"),
    },
    {
        "key": "human_resources",
        "label_pt": "Recursos Humanos",
        "label_en": "Human Resources",
        "prefixes": ("/api/v1/human_resources/", "/human-resources/", "/recursos-humanos/"),
    },
    {
        "key": "monitoring",
        "label_pt": "Monitoramento",
        "label_en": "Monitoring",
        "prefixes": ("/api/v1/monitoring/", "/monitoring/", "/monitoramento/"),
    },
    {
        "key": "audit",
        "label_pt": "Audit",
        "label_en": "Audit",
        "prefixes": ("/api/v1/audit/", "/audit/", "/auditoria/"),
    },
    {
        "key": "dashboard",
        "label_pt": "Dashboard",
        "label_en": "Dashboard",
        "prefixes": ("/api/v1/dashboard/", "/dashboard/"),
    },
)


class TelemetryViewSet(ValidatedSearchOrderingMixin, ViewSet):
    http_method_names = ["get", "post", "head", "options"]
    permission_classes = [IsAdminUser]

    def get_permissions(self):
        # Ingestão de erros do frontend: qualquer usuário autenticado.
        if getattr(self, "action", "") == "create":
            return [IsAuthenticated()]
        # Leitura de agregados: somente administradores.
        return [IsAdminUser()]

    def create(self, request):
        tenant = getattr(request, "tenant", None)
        if tenant is None:
            return Response({"detail": "Tenant não identificado."}, status=400)

        payload = request.data if isinstance(request.data, dict) else {}
        message = str(payload.get("message") or "").strip()
        if not message:
            return Response({"detail": "message é obrigatório."}, status=400)

        status_code = _coerce_int(payload.get("status_code"), default=520, min_value=0, max_value=999)
        method = str(payload.get("method") or "FRONTEND").strip().upper()[:10] or "FRONTEND"
        path = str(payload.get("path") or payload.get("route") or "/frontend").strip()
        full_path = str(payload.get("url") or payload.get("full_path") or path).strip()
        event_type = str(payload.get("event_type") or "frontend.error").strip()

        duration_raw = payload.get("duration_ms")
        duration_ms = None
        if duration_raw not in (None, ""):
            duration_ms = _coerce_int(duration_raw, default=0, min_value=0, max_value=86_400_000)

        metadata_payload = payload.get("metadata") if isinstance(payload.get("metadata"), dict) else {}
        metadata = {
            "source": "frontend",
            "event_type": event_type,
            "route": str(payload.get("route") or "")[:500],
            "request_url": str(payload.get("request_url") or "")[:500],
            "request_method": str(payload.get("request_method") or "")[:20],
            "status_code": status_code,
            **metadata_payload,
        }

        user = getattr(request, "user", None)
        user = user if getattr(user, "is_authenticated", False) else None

        try:
            record = SystemError.objects.create(
                tenant=tenant,
                user=user,
                method=method,
                path=(path or "/frontend")[:255],
                full_path=full_path,
                status_code=status_code,
                duration_ms=duration_ms,
                ip=_client_ip_from_request(request),
                user_agent=(str(payload.get("user_agent") or request.META.get("HTTP_USER_AGENT") or ""))[:255],
                view_basename=(str(payload.get("view_basename") or "frontend"))[:120],
                view_action=(str(payload.get("view_action") or event_type))[:120],
                object_id=(str(payload.get("object_id") or ""))[:80],
                exception_class=(str(payload.get("error_name") or payload.get("exception_class") or "FrontendError"))[:120],
                message=message[:500],
                traceback=str(payload.get("stack") or payload.get("traceback") or ""),
                metadata=metadata,
            )
        except Exception:
            # Telemetria não deve quebrar o fluxo do utilizador.
            return Response({"accepted": False}, status=202)

        return Response(
            {
                "accepted": True,
                "id": record.id,
                "custom_id": record.custom_id,
            },
            status=201,
        )

    def _resolve_module_for_path(self, path: str):
        normalized = (path or "").strip().lower()
        if not normalized:
            return None
        for module in COMMAND_CENTER_MODULES:
            for prefix in module.get("prefixes", ()):
                if normalized.startswith(str(prefix).lower()):
                    return module
        return None

    def _empty_module_stats(self, module: dict) -> dict:
        return {
            "module_key": module.get("key"),
            "label_pt": module.get("label_pt"),
            "label_en": module.get("label_en"),
            "total_requests": 0,
            "success_count": 0,
            "client_4xx": 0,
            "server_5xx": 0,
            "error_4xx_5xx": 0,
            "success_rate": 0.0,
            "avg_duration_ms": 0.0,
            "slo_target": 0.0,
            "slo_gap": 0.0,
            "slo_state": "neutral",
        }

    def _aggregate_command_center_stats(self, *, tenant, range_start, now, slo_target: float):
        module_stats = {m["key"]: self._empty_module_stats(m) for m in COMMAND_CENTER_MODULES}
        weighted_duration_sum = defaultdict(float)

        activity_path_rows = list(
            UserActivity.objects.filter(
                tenant=tenant,
                deleted=False,
                created_at__gte=range_start,
                created_at__lte=now,
                status_code__gt=0,
            )
            .exclude(path="")
            .values("path")
            .annotate(
                total=Count("id"),
                success=Count("id", filter=Q(status_code__gte=200, status_code__lt=400)),
                client_4xx=Count("id", filter=Q(status_code__gte=400, status_code__lt=500)),
                server_5xx=Count("id", filter=Q(status_code__gte=500, status_code__lt=600)),
                avg_duration_ms=Avg("duration_ms"),
            )
            .order_by("-total")
        )

        unmapped = {
            "module_key": "unmapped",
            "label_pt": "Outros",
            "label_en": "Other",
            "total_requests": 0,
            "success_count": 0,
            "client_4xx": 0,
            "server_5xx": 0,
            "error_4xx_5xx": 0,
            "success_rate": 0.0,
            "avg_duration_ms": 0.0,
            "slo_target": float(slo_target),
            "slo_gap": 0.0,
            "slo_state": "neutral",
        }

        critical_path_by_module = {
            m["key"]: tuple(str(path).lower() for path in m.get("critical_paths", ()) if path)
            for m in COMMAND_CENTER_MODULES
        }
        critical_path_hits = defaultdict(int)
        route_5xx_totals = defaultdict(int)

        for row in activity_path_rows:
            path = row.get("path") or ""
            module = self._resolve_module_for_path(path)
            target = module_stats[module["key"]] if module else unmapped

            total = int(row.get("total") or 0)
            success = int(row.get("success") or 0)
            client_4xx = int(row.get("client_4xx") or 0)
            server_5xx = int(row.get("server_5xx") or 0)
            avg_duration = float(row.get("avg_duration_ms") or 0.0)

            target["total_requests"] += total
            target["success_count"] += success
            target["client_4xx"] += client_4xx
            target["server_5xx"] += server_5xx
            target["error_4xx_5xx"] += client_4xx + server_5xx
            weighted_duration_sum[target["module_key"]] += avg_duration * total

            normalized_path = str(path).strip()
            if server_5xx > 0 and normalized_path:
                route_5xx_totals[normalized_path] += server_5xx

            if module:
                critical_prefixes = critical_path_by_module.get(module["key"], ())
                if critical_prefixes and any(normalized_path.lower().startswith(prefix) for prefix in critical_prefixes):
                    critical_path_hits[module["key"]] += total

        system_error_5xx_rows = list(
            SystemError.objects.filter(
                tenant=tenant,
                created_at__gte=range_start,
                created_at__lte=now,
                status_code__gte=500,
                status_code__lt=600,
            )
            .exclude(path="")
            .values("path")
            .annotate(total=Count("id"))
        )
        for row in system_error_5xx_rows:
            route_5xx_totals[str(row.get("path") or "")] += int(row.get("total") or 0)

        module_rows = []
        for module in COMMAND_CENTER_MODULES:
            current = module_stats[module["key"]]
            total_requests = int(current["total_requests"])
            success_count = int(current["success_count"])
            success_rate = _percent(success_count, total_requests)
            avg_duration_ms = (
                round(weighted_duration_sum[current["module_key"]] / total_requests, 2)
                if total_requests
                else 0.0
            )
            gap = round(success_rate - slo_target, 2)
            if total_requests == 0:
                slo_state = "neutral"
            elif success_rate < max(0.0, slo_target - 5):
                slo_state = "critical"
            elif success_rate < slo_target:
                slo_state = "warning"
            else:
                slo_state = "healthy"

            module_rows.append(
                {
                    **current,
                    "success_rate": success_rate,
                    "avg_duration_ms": avg_duration_ms,
                    "slo_target": float(slo_target),
                    "slo_gap": gap,
                    "slo_state": slo_state,
                    "critical_path_hits": int(critical_path_hits.get(module["key"], 0)),
                }
            )

        if unmapped["total_requests"] > 0:
            total_requests = int(unmapped["total_requests"])
            success_rate = _percent(int(unmapped["success_count"]), total_requests)
            avg_duration_ms = round(weighted_duration_sum["unmapped"] / total_requests, 2) if total_requests else 0.0
            gap = round(success_rate - slo_target, 2)
            module_rows.append(
                {
                    **unmapped,
                    "success_rate": success_rate,
                    "avg_duration_ms": avg_duration_ms,
                    "slo_gap": gap,
                    "slo_state": "warning" if success_rate < slo_target else "healthy",
                    "critical_path_hits": 0,
                }
            )

        module_rows.sort(key=lambda row: (row.get("slo_state") != "critical", row.get("success_rate", 0.0), row.get("module_key")))

        global_total = sum(int(row.get("total_requests") or 0) for row in module_rows)
        global_success = sum(int(row.get("success_count") or 0) for row in module_rows)
        global_client_4xx = sum(int(row.get("client_4xx") or 0) for row in module_rows)
        global_server_5xx = sum(int(row.get("server_5xx") or 0) for row in module_rows)
        global_error_4xx_5xx = sum(int(row.get("error_4xx_5xx") or 0) for row in module_rows)
        global_success_rate = _percent(global_success, global_total)
        global_avg_duration_ms = (
            round(sum(weighted_duration_sum.values()) / global_total, 2) if global_total else 0.0
        )

        top_failing_routes = [
            {"path": path, "server_5xx": total}
            for path, total in sorted(route_5xx_totals.items(), key=lambda item: (-item[1], item[0]))[:10]
            if path
        ]

        return {
            "module_rows": module_rows,
            "global_totals": {
                "total_requests": global_total,
                "success_count": global_success,
                "client_4xx": global_client_4xx,
                "server_5xx": global_server_5xx,
                "error_4xx_5xx": global_error_4xx_5xx,
                "success_rate": global_success_rate,
                "avg_duration_ms": global_avg_duration_ms,
                "modules_below_slo": len(
                    [row for row in module_rows if row.get("total_requests") and row.get("success_rate", 0.0) < slo_target]
                ),
                "active_modules": len([row for row in module_rows if row.get("total_requests")]),
            },
            "top_failing_routes": top_failing_routes,
        }

    def _build_command_center_alerts(
        self,
        *,
        module_rows: list[dict],
        global_totals: dict,
        top_failing_routes: list[dict],
        slo_target: float,
        route_threshold: int,
        client_4xx_threshold: int,
        server_5xx_threshold: int,
        outbox_pending: int,
        outbox_failed: int,
    ) -> list[dict]:
        alerts: list[dict] = []

        global_success_rate = float(global_totals.get("success_rate") or 0.0)
        if global_totals.get("total_requests", 0) > 0 and global_success_rate < slo_target:
            severity = "critical" if global_success_rate < max(0.0, slo_target - 5.0) else "warning"
            alerts.append(
                {
                    "id": "global_slo_breach",
                    "severity": severity,
                    "category": "slo",
                    "title_pt": "SLO global abaixo da meta",
                    "title_en": "Global SLO below target",
                    "description_pt": f"Taxa de sucesso global em {global_success_rate}% (meta {slo_target}%).",
                    "description_en": f"Global success rate at {global_success_rate}% (target {slo_target}%).",
                    "value": global_success_rate,
                    "target": slo_target,
                }
            )

        client_4xx = int(global_totals.get("client_4xx") or 0)
        if client_4xx >= client_4xx_threshold:
            alerts.append(
                {
                    "id": "client_4xx_spike",
                    "severity": "warning",
                    "category": "http",
                    "title_pt": "Pico de erros do cliente (4xx)",
                    "title_en": "Client error spike (4xx)",
                    "description_pt": f"Foram registados {client_4xx} erros 4xx no período.",
                    "description_en": f"{client_4xx} HTTP 4xx errors were recorded in the period.",
                    "value": client_4xx,
                    "target": client_4xx_threshold,
                }
            )

        server_5xx = int(global_totals.get("server_5xx") or 0)
        if server_5xx >= server_5xx_threshold:
            alerts.append(
                {
                    "id": "server_5xx_spike",
                    "severity": "critical",
                    "category": "http",
                    "title_pt": "Pico de erros do servidor (5xx)",
                    "title_en": "Server error spike (5xx)",
                    "description_pt": f"Foram registados {server_5xx} erros 5xx no período.",
                    "description_en": f"{server_5xx} HTTP 5xx errors were recorded in the period.",
                    "value": server_5xx,
                    "target": server_5xx_threshold,
                }
            )

        for row in module_rows:
            if not row.get("total_requests"):
                continue
            success_rate = float(row.get("success_rate") or 0.0)
            if success_rate >= slo_target:
                continue
            severity = "critical" if success_rate < max(0.0, slo_target - 5.0) else "warning"
            alerts.append(
                {
                    "id": f"module_slo_{row.get('module_key')}",
                    "severity": severity,
                    "category": "module_slo",
                    "module_key": row.get("module_key"),
                    "title_pt": f"Módulo {row.get('label_pt')} abaixo da meta",
                    "title_en": f"Module {row.get('label_en')} below target",
                    "description_pt": f"Taxa de sucesso em {success_rate}% (meta {slo_target}%).",
                    "description_en": f"Success rate at {success_rate}% (target {slo_target}%).",
                    "value": success_rate,
                    "target": slo_target,
                }
            )

        for route in top_failing_routes:
            total_5xx = int(route.get("server_5xx") or 0)
            if total_5xx < route_threshold:
                continue
            alerts.append(
                {
                    "id": f"route_5xx_{route.get('path')}",
                    "severity": "critical",
                    "category": "critical_route",
                    "path": route.get("path"),
                    "title_pt": "Rota crítica com falhas 5xx",
                    "title_en": "Critical route with 5xx failures",
                    "description_pt": f"A rota {route.get('path')} registou {total_5xx} erros 5xx.",
                    "description_en": f"Route {route.get('path')} recorded {total_5xx} HTTP 5xx errors.",
                    "value": total_5xx,
                    "target": route_threshold,
                }
            )

        if outbox_pending > 0 or outbox_failed > 0:
            severity = "critical" if outbox_failed > 0 else "warning"
            alerts.append(
                {
                    "id": "outbox_backlog",
                    "severity": severity,
                    "category": "eventing",
                    "title_pt": "Backlog de eventos na outbox",
                    "title_en": "Outbox event backlog",
                    "description_pt": f"Pendente: {outbox_pending} | Falhados/dead-letter: {outbox_failed}.",
                    "description_en": f"Pending: {outbox_pending} | Failed/dead-letter: {outbox_failed}.",
                    "value": outbox_pending + outbox_failed,
                    "target": 0,
                }
            )

        alerts.sort(
            key=lambda item: (
                0 if item.get("severity") == "critical" else 1 if item.get("severity") == "warning" else 2,
                item.get("id") or "",
            )
        )
        return alerts

    @action(detail=False, methods=["get"], url_path="command_center", url_name="command-center")
    def command_center(self, request):
        tenant = getattr(request, "tenant", None)
        if tenant is None:
            return Response({"detail": "Tenant não identificado."}, status=400)

        now = timezone.now()
        days = _coerce_int(request.query_params.get("days"), default=30, min_value=1, max_value=365)
        slo_target = _coerce_float(request.query_params.get("slo_target"), default=99.0, min_value=80.0, max_value=100.0)
        route_threshold = _coerce_int(
            request.query_params.get("route_5xx_threshold"),
            default=3,
            min_value=1,
            max_value=500,
        )
        client_4xx_threshold = _coerce_int(
            request.query_params.get("client_4xx_threshold"),
            default=30,
            min_value=1,
            max_value=10000,
        )
        server_5xx_threshold = _coerce_int(
            request.query_params.get("server_5xx_threshold"),
            default=10,
            min_value=1,
            max_value=10000,
        )
        range_start = now - timedelta(days=days)

        aggregates = self._aggregate_command_center_stats(
            tenant=tenant,
            range_start=range_start,
            now=now,
            slo_target=slo_target,
        )

        outbox_qs = TransactionalOutboxEvent.objects.filter(
            occurred_at__gte=range_start,
            occurred_at__lte=now,
        )
        tenant_identifier = str(getattr(tenant, "identifier", "") or "").strip()
        if tenant_identifier:
            outbox_qs = outbox_qs.filter(tenant_identifier=tenant_identifier)

        outbox_pending = outbox_qs.filter(status=TransactionalOutboxEvent.Status.PENDING).count()
        outbox_failed = outbox_qs.filter(
            status__in=[
                TransactionalOutboxEvent.Status.FAILED,
                TransactionalOutboxEvent.Status.DEAD_LETTER,
            ]
        ).count()

        alerts = self._build_command_center_alerts(
            module_rows=aggregates["module_rows"],
            global_totals=aggregates["global_totals"],
            top_failing_routes=aggregates["top_failing_routes"],
            slo_target=slo_target,
            route_threshold=route_threshold,
            client_4xx_threshold=client_4xx_threshold,
            server_5xx_threshold=server_5xx_threshold,
            outbox_pending=outbox_pending,
            outbox_failed=outbox_failed,
        )

        now_iso = now.isoformat()
        scheduled_reports = [
            {
                "key": "executive_snapshot",
                "label_pt": "Resumo executivo",
                "label_en": "Executive snapshot",
                "frequency": "daily",
                "next_run_at": _next_report_run(now, "daily").isoformat(),
                "delivery": "email|dashboard",
                "active": True,
            },
            {
                "key": "module_slo_review",
                "label_pt": "Revisão de SLO por módulo",
                "label_en": "Module SLO review",
                "frequency": "weekly",
                "next_run_at": _next_report_run(now, "weekly").isoformat(),
                "delivery": "dashboard",
                "active": True,
            },
            {
                "key": "governance_audit",
                "label_pt": "Auditoria de governança",
                "label_en": "Governance audit",
                "frequency": "monthly",
                "next_run_at": _next_report_run(now, "monthly").isoformat(),
                "delivery": "dashboard|pdf",
                "active": True,
            },
        ]

        return Response(
            {
                "generated_at": now_iso,
                "range": {
                    "start": range_start.isoformat(),
                    "end": now_iso,
                    "days": days,
                },
                "thresholds": {
                    "slo_target": slo_target,
                    "route_5xx_threshold": route_threshold,
                    "client_4xx_threshold": client_4xx_threshold,
                    "server_5xx_threshold": server_5xx_threshold,
                },
                "global_totals": aggregates["global_totals"],
                "modules": aggregates["module_rows"],
                "top_failing_routes": aggregates["top_failing_routes"],
                "alerts": alerts,
                "outbox": {
                    "pending": outbox_pending,
                    "failed_or_dead_letter": outbox_failed,
                },
                "scheduled_reports": scheduled_reports,
            }
        )

    def list(self, request):
        tenant = getattr(request, "tenant", None)
        if tenant is None:
            return Response({"detail": "Tenant não identificado."}, status=400)

        now = timezone.now()
        days = _coerce_int(request.query_params.get("days"), default=7, min_value=1, max_value=365)
        top = _coerce_int(request.query_params.get("top"), default=8, min_value=3, max_value=25)
        bucket_param = str(request.query_params.get("bucket") or "auto").strip().lower()
        bucket = "hour" if (bucket_param == "hour" or (bucket_param == "auto" and days <= 2)) else "day"
        range_start = now - timedelta(days=days)

        errors_qs = SystemError.objects.filter(
            tenant=tenant,
            created_at__gte=range_start,
            created_at__lte=now,
        )

        frontend_filter = Q(method="FRONTEND")
        total_errors = errors_qs.count()
        frontend_errors = errors_qs.filter(frontend_filter).count()
        backend_errors = max(0, total_errors - frontend_errors)
        client_4xx = errors_qs.filter(status_code__gte=400, status_code__lt=500).count()
        server_5xx = errors_qs.filter(status_code__gte=500, status_code__lt=600).count()
        unique_paths = errors_qs.exclude(path="").values("path").distinct().count()

        activity_errors_qs = UserActivity.objects.filter(
            tenant=tenant,
            deleted=False,
            created_at__gte=range_start,
            created_at__lte=now,
            status_code__gte=400,
        )
        activity_error_total = activity_errors_qs.count()
        activity_client_4xx = activity_errors_qs.filter(status_code__lt=500).count()
        activity_server_5xx = activity_errors_qs.filter(status_code__gte=500, status_code__lt=600).count()
        activity_unique_paths = activity_errors_qs.exclude(path="").values("path").distinct().count()

        by_status = list(
            errors_qs.values("status_code")
            .annotate(total=Count("id"))
            .order_by("-total", "status_code")[:top]
        )
        by_exception = list(
            errors_qs.exclude(exception_class="")
            .values("exception_class")
            .annotate(total=Count("id"))
            .order_by("-total", "exception_class")[:top]
        )
        by_path = list(
            errors_qs.exclude(path="")
            .values("path")
            .annotate(total=Count("id"))
            .order_by("-total", "path")[:top]
        )
        by_method = list(
            errors_qs.values("method")
            .annotate(total=Count("id"))
            .order_by("-total", "method")[:top]
        )

        bucket_expr = TruncHour("created_at") if bucket == "hour" else TruncDay("created_at")
        timeline_rows = list(
            errors_qs.annotate(bucket_value=bucket_expr)
            .values("bucket_value")
            .annotate(
                total=Count("id"),
                frontend=Count("id", filter=frontend_filter),
                backend=Count("id", filter=~frontend_filter),
                client_4xx=Count("id", filter=Q(status_code__gte=400, status_code__lt=500)),
                server_5xx=Count("id", filter=Q(status_code__gte=500, status_code__lt=600)),
            )
            .order_by("bucket_value")
        )
        timeline = [
            {
                "bucket": row["bucket_value"].isoformat() if row.get("bucket_value") else None,
                "total": row["total"],
                "frontend": row["frontend"],
                "backend": row["backend"],
                "client_4xx": row["client_4xx"],
                "server_5xx": row["server_5xx"],
            }
            for row in timeline_rows
        ]

        outbox_qs = TransactionalOutboxEvent.objects.filter(
            occurred_at__gte=range_start,
            occurred_at__lte=now,
        )
        tenant_identifier = str(getattr(tenant, "identifier", "") or "").strip()
        if tenant_identifier:
            outbox_qs = outbox_qs.filter(tenant_identifier=tenant_identifier)

        outbox_total = outbox_qs.count()
        outbox_status_rows = list(outbox_qs.values("status").annotate(total=Count("id")).order_by("-total", "status"))
        outbox_status_totals = {row["status"]: row["total"] for row in outbox_status_rows}
        outbox_event_rows = list(
            outbox_qs.values("event_type").annotate(total=Count("id")).order_by("-total", "event_type")[:top]
        )
        outbox_recent_failures = list(
            outbox_qs.filter(
                status__in=[
                    TransactionalOutboxEvent.Status.FAILED,
                    TransactionalOutboxEvent.Status.DEAD_LETTER,
                ]
            )
            .order_by("-updated_at", "-id")
            .values(
                "event_id",
                "event_type",
                "status",
                "attempts",
                "available_at",
                "last_error",
            )[:20]
        )

        recent_rows = list(
            errors_qs.select_related("user")
            .order_by("-created_at", "-id")
            .values(
                "id",
                "custom_id",
                "created_at",
                "method",
                "path",
                "status_code",
                "exception_class",
                "message",
                "user__username",
            )[:20]
        )
        recent_events = [
            {
                "id": row["id"],
                "custom_id": row["custom_id"],
                "created_at": row["created_at"].isoformat() if row.get("created_at") else None,
                "method": row["method"],
                "path": row["path"],
                "status_code": row["status_code"],
                "exception_class": row["exception_class"],
                "message": row["message"],
                "user": row["user__username"] or "",
            }
            for row in recent_rows
        ]

        return Response(
            {
                "range": {
                    "start": range_start.isoformat(),
                    "end": now.isoformat(),
                    "days": days,
                    "bucket": bucket,
                },
                "totals": {
                    "errors_total": total_errors,
                    "frontend_errors": frontend_errors,
                    "backend_errors": backend_errors,
                    "client_4xx": client_4xx,
                    "server_5xx": server_5xx,
                    "unique_paths": unique_paths,
                    "unique_exception_classes": errors_qs.exclude(exception_class="")
                    .values("exception_class")
                    .distinct()
                    .count(),
                    "unique_users": errors_qs.exclude(user__isnull=True).values("user").distinct().count(),
                },
                "activity_totals": {
                    "errors_total": activity_error_total,
                    "client_4xx": activity_client_4xx,
                    "server_5xx": activity_server_5xx,
                    "unique_paths": activity_unique_paths,
                },
                "by_status": by_status,
                "by_exception": by_exception,
                "by_path": by_path,
                "by_method": by_method,
                "timeline": timeline,
                "outbox": {
                    "total": outbox_total,
                    "pending": outbox_status_totals.get(TransactionalOutboxEvent.Status.PENDING, 0),
                    "delivered": outbox_status_totals.get(TransactionalOutboxEvent.Status.DELIVERED, 0),
                    "failed": outbox_status_totals.get(TransactionalOutboxEvent.Status.FAILED, 0),
                    "dead_letter": outbox_status_totals.get(TransactionalOutboxEvent.Status.DEAD_LETTER, 0),
                    "by_status": outbox_status_rows,
                    "by_event_type": outbox_event_rows,
                    "recent_failures": [
                        {
                            **row,
                            "event_id": str(row["event_id"]) if row.get("event_id") else "",
                            "available_at": row["available_at"].isoformat() if row.get("available_at") else None,
                        }
                        for row in outbox_recent_failures
                    ],
                },
                "recent_events": recent_events,
            }
        )


class ExportJobViewSet(ValidatedSearchOrderingMixin, ViewSet):
    permission_classes = [IsAuthenticated]
    http_method_names = ["get", "head", "options"]

    def _get_job_or_404(self, request, pk: str) -> dict:
        state = get_export_job_state(pk)
        if not state:
            raise NotFound("Job de exportação não encontrado.")

        user = getattr(request, "user", None)
        tenant = getattr(request, "tenant", None)
        can_access = can_access_export_job(
            state,
            tenant_id=getattr(tenant, "id", None),
            user_id=getattr(user, "id", None),
            is_superuser=bool(getattr(user, "is_superuser", False)),
        )
        if not can_access:
            raise NotFound("Job de exportação não encontrado.")

        return state

    def _serialize_job(self, request, state: dict) -> dict:
        job_id = state.get("id")
        try:
            status_path = reverse("monitoring-export_job-detail", kwargs={"pk": job_id})
            download_path = reverse("monitoring-export_job-download", kwargs={"pk": job_id})
        except Exception:
            status_path = f"/api/v1/monitoring/export_job/{job_id}/"
            download_path = f"/api/v1/monitoring/export_job/{job_id}/download/"

        return {
            "id": job_id,
            "status": state.get("status"),
            "export_key": state.get("export_key"),
            "created_at": state.get("created_at"),
            "updated_at": state.get("updated_at"),
            "started_at": state.get("started_at"),
            "finished_at": state.get("finished_at"),
            "filename": state.get("filename"),
            "content_type": state.get("content_type"),
            "error": state.get("error"),
            "status_url": request.build_absolute_uri(status_path),
            "download_url": request.build_absolute_uri(download_path),
        }

    def retrieve(self, request, pk=None):
        state = self._get_job_or_404(request, pk)
        return Response(self._serialize_job(request, state))

    @action(detail=True, methods=["get"], url_path="download", url_name="download")
    def download(self, request, pk=None):
        state = self._get_job_or_404(request, pk)
        if state.get("status") != "ready":
            return Response(
                {
                    "detail": "Exportação ainda não está pronta.",
                    "status": state.get("status"),
                    "error": state.get("error"),
                },
                status=409,
            )

        result = get_export_job_result(pk)
        if not result:
            raise NotFound("Arquivo de exportação não disponível.")

        file_bytes, filename, content_type = result
        response = HttpResponse(file_bytes, content_type=content_type)
        disposition = (state.get("content_disposition") or "inline").strip().lower()
        if disposition not in {"inline", "attachment"}:
            disposition = "inline"
        response["Content-Disposition"] = f'{disposition}; filename="{filename}"'
        return response


class CloudControlViewSet(ValidatedSearchOrderingMixin, ViewSet):
    permission_classes = [IsAdminUser]
    http_method_names = ["get", "post", "head", "options"]

    def list(self, request):
        runtime = self._runtime_or_none()
        if runtime is None:
            return Response({"detail": "SUBSTRATO OS runtime desativado."}, status=503)

        resource = (request.query_params.get("resource") or "overview").strip().lower()
        try:
            if resource == "clusters":
                status_filter = request.query_params.get("status")
                clusters = runtime.list_cloud_clusters(status=status_filter)
                return Response({"clusters": [self._serialize_cluster(cluster) for cluster in clusters]})

            if resource == "deployments":
                cluster_id = request.query_params.get("cluster_id")
                status_filter = request.query_params.get("status")
                deployments = runtime.list_cluster_deployments(
                    cluster_id=cluster_id,
                    status=status_filter,
                )
                return Response(
                    {
                        "deployments": [
                            self._serialize_deployment(deployment)
                            for deployment in deployments
                        ]
                    }
                )

            if resource == "nodes":
                cluster_id = request.query_params.get("cluster_id")
                if not cluster_id:
                    return Response({"detail": "cluster_id é obrigatório para resource=nodes."}, status=400)
                nodes = runtime.list_cluster_nodes(cluster_id)
                return Response({"nodes": [self._serialize_cluster_node(node) for node in nodes]})

            if resource == "overview":
                clusters = runtime.list_cloud_clusters()
                deployments = runtime.list_cluster_deployments()
                return Response(
                    {
                        "clusters_total": len(clusters),
                        "clusters_active": len([item for item in clusters if item.status == "active"]),
                        "deployments_total": len(deployments),
                        "deployments_completed": len([item for item in deployments if item.status == "completed"]),
                        "deployments_rolling_out": len([item for item in deployments if item.status == "rolling_out"]),
                    }
                )
        except CloudControlPlaneError as exc:
            return Response({"detail": str(exc)}, status=400)

        return Response({"detail": f"resource inválido: {resource}"}, status=400)

    def create(self, request):
        runtime = self._runtime_or_none()
        if runtime is None:
            return Response({"detail": "SUBSTRATO OS runtime desativado."}, status=503)

        action_name = (request.data.get("action") or "").strip().lower()
        try:
            if action_name == "register_cluster":
                cluster = runtime.register_cloud_cluster(
                    cluster_id=self._required(request, "cluster_id"),
                    region=self._required(request, "region"),
                    control_plane_endpoint=request.data.get("control_plane_endpoint") or "",
                    status=request.data.get("status") or "active",
                    metadata=request.data.get("metadata") or {},
                )
                return Response({"cluster": self._serialize_cluster(cluster)}, status=201)

            if action_name == "assign_node":
                cluster_id = self._required(request, "cluster_id")
                node_id = self._required(request, "node_id")
                node_role = request.data.get("node_role") or "worker"
                node_region = request.data.get("node_region")

                if node_region:
                    runtime.register_edge_node(
                        node_id=node_id,
                        region=str(node_region),
                        role=node_role,
                    )
                assignment = runtime.assign_edge_node_to_cluster(
                    cluster_id=cluster_id,
                    node_id=node_id,
                    node_role=node_role,
                )
                return Response({"assignment": self._serialize_cluster_node(assignment)}, status=201)

            if action_name == "deploy_module":
                deployment = runtime.deploy_module_to_cluster(
                    cluster_id=self._required(request, "cluster_id"),
                    module_key=self._required(request, "module_key"),
                    module_version=self._required(request, "module_version"),
                    desired_replicas=self._required_int(request, "desired_replicas", min_value=1),
                    strategy=request.data.get("strategy") or "rolling",
                )
                return Response({"deployment": self._serialize_deployment(deployment)}, status=201)

            if action_name == "reconcile_deployment":
                queue_name = request.data.get("queue_name") or "cloud.rollout"
                lease_seconds = self._optional_int(request, "lease_seconds", default=60, min_value=1)
                tasks = runtime.reconcile_cluster_deployment(
                    self._required(request, "deployment_id"),
                    queue_name=queue_name,
                    lease_seconds=lease_seconds,
                )
                return Response({"tasks_enqueued": len(tasks)})

            if action_name == "report_progress":
                deployment = runtime.report_cluster_deployment_progress(
                    deployment_id=self._required(request, "deployment_id"),
                    ready_replicas=self._required_int(request, "ready_replicas", min_value=0),
                    status=request.data.get("status"),
                    last_error=request.data.get("last_error"),
                )
                return Response({"deployment": self._serialize_deployment(deployment)})

            if action_name == "failover_cluster":
                queue_name = request.data.get("queue_name") or "cloud.rollout"
                lease_seconds = self._optional_int(request, "lease_seconds", default=60, min_value=1)
                result = runtime.auto_failover_cluster(
                    self._required(request, "source_cluster_id"),
                    target_cluster_id=request.data.get("target_cluster_id"),
                    queue_name=queue_name,
                    lease_seconds=lease_seconds,
                )
                return Response(
                    {
                        "result": {
                            "source_cluster_id": result.source_cluster_id,
                            "target_cluster_id": result.target_cluster_id,
                            "migrated_deployments": result.migrated_deployments,
                            "tasks_enqueued": result.tasks_enqueued,
                            "source_status": result.source_status,
                            "target_status": result.target_status,
                        }
                    }
                )

            if action_name == "set_cluster_status":
                updated = runtime.set_cloud_cluster_status(
                    cluster_id=self._required(request, "cluster_id"),
                    status=self._required(request, "status"),
                )
                return Response({"updated": bool(updated)})
        except CloudControlPlaneError as exc:
            return Response({"detail": str(exc)}, status=400)
        except ValueError as exc:
            return Response({"detail": str(exc)}, status=400)

        return Response({"detail": "action inválida."}, status=400)

    def _runtime_or_none(self):
        if not runtime_enabled(force=False):
            return None
        return get_runtime()

    def _required(self, request, key: str) -> str:
        value = request.data.get(key)
        if value in (None, ""):
            raise ValueError(f"{key} é obrigatório.")
        return str(value)

    def _required_int(self, request, key: str, *, min_value: int | None = None) -> int:
        value = request.data.get(key)
        if value in (None, ""):
            raise ValueError(f"{key} é obrigatório.")
        try:
            parsed = int(value)
        except Exception as exc:
            raise ValueError(f"{key} deve ser inteiro.") from exc
        if min_value is not None and parsed < min_value:
            raise ValueError(f"{key} deve ser >= {min_value}.")
        return parsed

    def _optional_int(
        self,
        request,
        key: str,
        *,
        default: int,
        min_value: int | None = None,
    ) -> int:
        value = request.data.get(key)
        if value in (None, ""):
            return default
        try:
            parsed = int(value)
        except Exception as exc:
            raise ValueError(f"{key} deve ser inteiro.") from exc
        if min_value is not None and parsed < min_value:
            raise ValueError(f"{key} deve ser >= {min_value}.")
        return parsed

    def _serialize_cluster(self, cluster) -> dict:
        return {
            "cluster_id": cluster.cluster_id,
            "region": cluster.region,
            "control_plane_endpoint": cluster.control_plane_endpoint,
            "status": cluster.status,
            "metadata": cluster.metadata,
            "created_at": cluster.created_at.isoformat(),
            "updated_at": cluster.updated_at.isoformat(),
        }

    def _serialize_cluster_node(self, node) -> dict:
        return {
            "cluster_id": node.cluster_id,
            "node_id": node.node_id,
            "node_role": node.node_role,
            "assigned_at": node.assigned_at.isoformat(),
        }

    def _serialize_deployment(self, deployment) -> dict:
        return {
            "deployment_id": deployment.deployment_id,
            "cluster_id": deployment.cluster_id,
            "module_key": deployment.module_key,
            "module_version": deployment.module_version,
            "desired_replicas": deployment.desired_replicas,
            "ready_replicas": deployment.ready_replicas,
            "strategy": deployment.strategy,
            "status": deployment.status,
            "last_error": deployment.last_error,
            "created_at": deployment.created_at.isoformat(),
            "updated_at": deployment.updated_at.isoformat(),
        }


VIEWSET_MAP = {
    "error": SystemErrorViewSet,
    "telemetry": TelemetryViewSet,
    "export_job": ExportJobViewSet,
    "cloud_control": CloudControlViewSet,
}

__all__ = [
    "VIEWSET_MAP",
    "CloudControlViewSet",
    "ExportJobViewSet",
    "SystemErrorViewSet",
    "TelemetryViewSet",
]
