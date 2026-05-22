"""Views customizadas para relatórios de auditoria."""

from __future__ import annotations

from datetime import date, datetime, timedelta
import re
from urllib.parse import urlparse

from django.db.models import Avg, Count, Max, Min, Q
from django.db.models.fields import DateField, DateTimeField
from django.utils import timezone
from rest_framework.exceptions import PermissionDenied, ValidationError
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from api.utils.async_exports import enqueue_export_job_response
from api.v1.routing.routes import VIEWSET_GROUPS
from apps.audit_activities.models.user_activity import UserActivity


class ActivityReportPdfView(APIView):
    """Gera PDF de actividade da página atual por janela temporal."""

    permission_classes = [IsAuthenticated]

    PERIOD_ALIASES = {
        "daily": "daily",
        "diario": "daily",
        "day": "daily",
        "weekly": "weekly",
        "semanal": "weekly",
        "week": "weekly",
        "monthly": "monthly",
        "mensal": "monthly",
        "month": "monthly",
        "quarterly": "quarterly",
        "trimestral": "quarterly",
        "quarter": "quarterly",
        "annual": "annual",
        "anual": "annual",
        "year": "annual",
    }
    PERIOD_DAYS = {
        "daily": 1,
        "weekly": 7,
        "monthly": 30,
        "quarterly": 90,
        "annual": 365,
    }
    PERIOD_LABELS = {
        "daily": "Diário (1 dia)",
        "weekly": "Semanal (7 dias)",
        "monthly": "Mensal (30 dias)",
        "quarterly": "Trimestral (90 dias)",
        "annual": "Anual (365 dias)",
    }
    MODE_ALIASES = {
        "general": "general",
        "geral": "general",
        "activity": "activity",
        "atividade": "activity",
        "complete": "complete",
        "completo": "complete",
        "full": "complete",
    }

    @staticmethod
    def _user_display_name(user) -> str:
        if not user:
            return "Sem utilizador"
        first_name = (getattr(user, "first_name", "") or "").strip()
        last_name = (getattr(user, "last_name", "") or "").strip()
        full_name = f"{first_name} {last_name}".strip()
        if full_name:
            return full_name
        username = (getattr(user, "username", "") or "").strip()
        if username:
            return username
        email = (getattr(user, "email", "") or "").strip()
        return email or "Sem utilizador"

    @staticmethod
    def _activity_label(method: str, path: str, view_basename: str, view_action: str) -> str:
        view = (view_basename or "").strip()
        action = (view_action or "").strip()
        method_name = (method or "").strip().upper() or "REQ"
        route = (path or "").strip() or "—"

        if view and action:
            return f"{view}:{action}"
        if view:
            return view
        return f"{method_name} {route}"

    @staticmethod
    def _parse_int(
        raw_value,
        *,
        field_name: str,
        min_value: int,
        max_value: int,
        default: int,
    ) -> int:
        value = default if raw_value in (None, "") else raw_value
        try:
            parsed = int(value)
        except Exception as exc:
            raise ValidationError({field_name: "Valor numérico inválido."}) from exc
        if parsed < min_value or parsed > max_value:
            raise ValidationError({field_name: f"Valor deve estar entre {min_value} e {max_value}."})
        return parsed

    @staticmethod
    def _normalize_page_path(raw_value: str) -> str:
        raw = (raw_value or "").strip()
        if not raw:
            return ""

        parsed = urlparse(raw)
        path = parsed.path if (parsed.scheme or parsed.netloc) else raw
        path = path.strip()
        if not path:
            return ""
        if not path.startswith("/"):
            path = f"/{path}"
        normalized = path.rstrip("/")
        return normalized or "/"

    @staticmethod
    def _is_admin_user(user) -> bool:
        if not user or not getattr(user, "is_authenticated", False):
            return False
        if getattr(user, "is_superuser", False):
            return True
        try:
            return user.groups.filter(name__iexact="Administrador").exists()
        except Exception:
            return False

    def _resolve_period(self, request):
        now = timezone.localtime()

        raw_period = (request.query_params.get("period") or "daily").strip().lower()
        period = self.PERIOD_ALIASES.get(raw_period)
        if not period:
            raise ValidationError({"period": "Use: daily, weekly, monthly, quarterly ou annual."})

        raw_date = (request.query_params.get("date") or "").strip()
        if raw_date:
            try:
                date_ref = date.fromisoformat(raw_date)
            except ValueError as exc:
                raise ValidationError({"date": "Use o formato YYYY-MM-DD."}) from exc
        else:
            date_ref = now.date()

        tz = timezone.get_current_timezone()
        end = datetime(date_ref.year, date_ref.month, date_ref.day, 0, 0, 0, tzinfo=tz) + timedelta(days=1)
        days = self.PERIOD_DAYS[period]
        start = end - timedelta(days=days)

        label = self.PERIOD_LABELS[period]
        filters = {"date": date_ref.isoformat(), "days": days}
        return period, start, end, label, filters

    def _resolve_mode(self, request) -> str:
        raw_mode = (request.query_params.get("mode") or "complete").strip().lower()
        mode = self.MODE_ALIASES.get(raw_mode)
        if not mode:
            raise ValidationError({"mode": "Use: general, activity ou complete."})
        return mode

    def _build_payload(self, request) -> dict:
        tenant = getattr(request, "tenant", None)
        if tenant is None:
            raise ValidationError({"tenant": "Tenant não resolvido na requisição."})

        period_key, start_dt, end_dt, period_label, period_filters = self._resolve_period(request)
        mode = self._resolve_mode(request)
        page_path = self._normalize_page_path(
            request.query_params.get("page_path") or request.META.get("HTTP_REFERER") or ""
        )
        limit = self._parse_int(
            request.query_params.get("limit"),
            field_name="limit",
            min_value=1,
            max_value=2000,
            default=300,
        )

        is_admin = self._is_admin_user(getattr(request, "user", None))

        activities_qs = UserActivity.objects.filter(
            tenant=tenant,
            deleted=False,
            created_at__gte=start_dt,
            created_at__lt=end_dt,
        ).select_related("user")

        if page_path:
            activities_qs = activities_qs.filter(metadata__referer__icontains=page_path)

        if not is_admin:
            activities_qs = activities_qs.filter(user=request.user)

        grouped_rows = (
            activities_qs.values(
                "method",
                "path",
                "view_basename",
                "view_action",
            )
            .annotate(
                total=Count("id"),
                success_count=Count("id", filter=Q(status_code__gte=200, status_code__lt=400)),
                error_count=Count("id", filter=Q(status_code__gte=400)),
                average_duration_ms=Avg("duration_ms"),
            )
            .order_by("-total", "path")
        )

        activities = []
        for row in grouped_rows:
            activity_name = self._activity_label(
                row.get("method") or "",
                row.get("path") or "",
                row.get("view_basename") or "",
                row.get("view_action") or "",
            )
            avg_duration = row.get("average_duration_ms")
            activities.append(
                {
                    "activity": activity_name,
                    "method": row.get("method") or "—",
                    "path": row.get("path") or "—",
                    "view_basename": row.get("view_basename") or "",
                    "view_action": row.get("view_action") or "",
                    "total": int(row.get("total") or 0),
                    "success_count": int(row.get("success_count") or 0),
                    "error_count": int(row.get("error_count") or 0),
                    "average_duration_ms": round(float(avg_duration), 2) if avg_duration is not None else None,
                }
            )

        summary_raw = activities_qs.aggregate(
            total_activities=Count("id"),
            success_count=Count("id", filter=Q(status_code__gte=200, status_code__lt=400)),
            error_count=Count("id", filter=Q(status_code__gte=400)),
            unique_users=Count("user", distinct=True),
            average_duration_ms=Avg("duration_ms"),
        )

        detail_rows = activities_qs.order_by("-created_at").values(
            "created_at",
            "method",
            "path",
            "status_code",
            "duration_ms",
            "view_basename",
            "view_action",
            "user__username",
            "user__first_name",
            "user__last_name",
            "metadata",
        )[:limit]

        entries = []
        for row in detail_rows:
            first_name = (row.get("user__first_name") or "").strip()
            last_name = (row.get("user__last_name") or "").strip()
            full_name = f"{first_name} {last_name}".strip()
            username = (row.get("user__username") or "").strip()
            user_name = full_name or username or "Sem utilizador"
            metadata = row.get("metadata") or {}
            referer = ""
            if isinstance(metadata, dict):
                referer = str(metadata.get("referer") or "")
            entries.append(
                {
                    "created_at": row.get("created_at").isoformat() if row.get("created_at") else None,
                    "user_name": user_name,
                    "method": row.get("method") or "—",
                    "path": row.get("path") or "—",
                    "status_code": row.get("status_code"),
                    "duration_ms": row.get("duration_ms"),
                    "activity": self._activity_label(
                        row.get("method") or "",
                        row.get("path") or "",
                        row.get("view_basename") or "",
                        row.get("view_action") or "",
                    ),
                    "referer": referer,
                }
            )

        avg_duration = summary_raw.get("average_duration_ms")
        summary = {
            "total_activities": int(summary_raw.get("total_activities") or 0),
            "total_activity_types": len(activities),
            "success_count": int(summary_raw.get("success_count") or 0),
            "error_count": int(summary_raw.get("error_count") or 0),
            "unique_users": int(summary_raw.get("unique_users") or 0),
            "average_duration_ms": round(float(avg_duration), 2) if avg_duration is not None else None,
        }

        return {
            "scope": "tenant" if is_admin else "user",
            "target_user": {
                "id": getattr(request.user, "id", None),
                "display_name": self._user_display_name(getattr(request, "user", None)),
            },
            "mode": mode,
            "page": {
                "path": page_path or "",
                "label": page_path or "Todas as páginas",
            },
            "period": {
                "key": period_key,
                "label": period_label,
                "start": start_dt.isoformat(),
                "end": end_dt.isoformat(),
                **period_filters,
            },
            "summary": summary,
            "activities": activities,
            "entries": entries,
        }

    def get(self, request):
        payload = self._build_payload(request)
        return enqueue_export_job_response(
            request,
            export_key="activity_report_pdf",
            payload=payload,
            content_disposition="inline",
        )


class ModelActivityReportPdfView(APIView):
    """Gera relatório PDF operacional para qualquer recurso/modelo da API."""

    permission_classes = [IsAuthenticated]

    PERIOD_ALIASES = {
        "daily": "daily",
        "diario": "daily",
        "weekly": "weekly",
        "semanal": "weekly",
        "monthly": "monthly",
        "mensal": "monthly",
        "quarterly": "quarterly",
        "trimestral": "quarterly",
        "annual": "annual",
        "anual": "annual",
    }
    PERIOD_DAYS = {
        "daily": 1,
        "weekly": 7,
        "monthly": 30,
        "quarterly": 90,
        "annual": 365,
    }
    MODE_ALIASES = {
        "summary": "summary",
        "resumo": "summary",
        "executive": "summary",
        "operational": "operational",
        "operacional": "operational",
        "activity": "operational",
        "complete": "complete",
        "completo": "complete",
        "full": "complete",
    }
    STATUS_FIELD_CANDIDATES = (
        "status",
        "estado",
        "workflow_status",
        "billing_status",
        "state",
        "active",
    )
    DATE_FIELD_CANDIDATES = (
        "created_at",
        "updated_at",
        "date",
        "scheduled_for",
        "performed_date",
        "requested_at",
        "moved_at",
        "collected_at",
        "care_start_at",
        "occurred_at",
        "paid_at",
    )
    LABEL_FIELD_CANDIDATES = (
        "name",
        "nome",
        "title",
        "descricao",
        "description",
        "custom_id",
        "id_custom",
        "code",
        "codigo",
    )
    OWNER_FIELD_CANDIDATES = (
        "created_by",
        "updated_by",
        "user",
        "professional",
        "responsible",
    )

    @staticmethod
    def _title_from_slug(value: str) -> str:
        return " ".join(part.capitalize() for part in re.split(r"[_-]+", str(value or "")) if part) or value

    @staticmethod
    def _parse_int(
        raw_value,
        *,
        field_name: str,
        min_value: int,
        max_value: int,
        default: int,
    ) -> int:
        value = default if raw_value in (None, "") else raw_value
        try:
            parsed = int(value)
        except Exception as exc:
            raise ValidationError({field_name: "Valor numérico inválido."}) from exc
        if parsed < min_value or parsed > max_value:
            raise ValidationError({field_name: f"Valor deve estar entre {min_value} e {max_value}."})
        return parsed

    @staticmethod
    def _truthy(raw_value) -> bool:
        return str(raw_value or "").strip().lower() in {"1", "true", "t", "sim", "yes"}

    @staticmethod
    def _normalize_endpoint(raw_value: str) -> tuple[str, str, str]:
        raw = (raw_value or "").strip()
        if not raw:
            raise ValidationError({"endpoint": "Informe o endpoint do recurso (ex: /billing/invoice/)."})

        parsed = urlparse(raw)
        path = parsed.path if (parsed.scheme or parsed.netloc) else raw
        path = path.strip()
        if not path:
            raise ValidationError({"endpoint": "Endpoint inválido."})
        if not path.startswith("/"):
            path = f"/{path}"
        if path.startswith("/api/v1/"):
            path = path[len("/api/v1") :]
        clean = f"/{'/'.join([part for part in path.split('/') if part])}/"
        parts = [part for part in clean.split("/") if part]
        if len(parts) < 2:
            raise ValidationError({"endpoint": "Endpoint deve conter grupo e recurso."})
        group_key, resource_key = parts[0], parts[1]
        return clean, group_key, resource_key

    def _resolve_period(self, request) -> tuple[date, date, datetime, datetime, str]:
        now_local = timezone.localtime()
        tz = timezone.get_current_timezone()

        raw_period = (request.query_params.get("period") or "monthly").strip().lower()
        period_key = self.PERIOD_ALIASES.get(raw_period, "monthly")
        default_days = self.PERIOD_DAYS[period_key]

        raw_from = (request.query_params.get("date_from") or "").strip()
        raw_to = (request.query_params.get("date_to") or "").strip()

        try:
            start_date = date.fromisoformat(raw_from) if raw_from else None
        except ValueError as exc:
            raise ValidationError({"date_from": "Use o formato YYYY-MM-DD."}) from exc
        try:
            end_date = date.fromisoformat(raw_to) if raw_to else None
        except ValueError as exc:
            raise ValidationError({"date_to": "Use o formato YYYY-MM-DD."}) from exc

        today = now_local.date()
        if start_date is None and end_date is None:
            end_date = today
            start_date = end_date - timedelta(days=default_days - 1)
        elif start_date is None and end_date is not None:
            start_date = end_date - timedelta(days=default_days - 1)
        elif start_date is not None and end_date is None:
            end_date = today

        if start_date is None or end_date is None:
            raise ValidationError({"period": "Não foi possível calcular o período."})
        if start_date > end_date:
            raise ValidationError({"period": "date_from não pode ser maior que date_to."})

        start_dt = timezone.make_aware(datetime.combine(start_date, datetime.min.time()), timezone=tz)
        end_dt = timezone.make_aware(datetime.combine(end_date + timedelta(days=1), datetime.min.time()), timezone=tz)
        return start_date, end_date, start_dt, end_dt, period_key

    def _resolve_mode(self, request) -> str:
        raw_mode = (request.query_params.get("mode") or "complete").strip().lower()
        mode = self.MODE_ALIASES.get(raw_mode)
        if not mode:
            raise ValidationError({"mode": "Use: summary, operational ou complete."})
        return mode

    def _resolve_viewset(self, request, group_key: str, resource_key: str):
        group_map = VIEWSET_GROUPS.get(group_key)
        if not group_map:
            raise ValidationError({"endpoint": f"Grupo '{group_key}' não encontrado."})

        viewset_cls = group_map.get(resource_key)
        if not viewset_cls:
            raise ValidationError({"endpoint": f"Recurso '{group_key}/{resource_key}' não encontrado."})

        viewset = viewset_cls()
        viewset.request = request
        viewset.action = "list"
        viewset.kwargs = {}
        viewset.format_kwarg = None

        for permission_class in getattr(viewset_cls, "permission_classes", []):
            permission = permission_class()
            if not permission.has_permission(request, viewset):
                raise PermissionDenied("Sem permissão para gerar relatório deste recurso.")

        return viewset

    def _resolve_date_field(self, model):
        for name in self.DATE_FIELD_CANDIDATES:
            try:
                field = model._meta.get_field(name)
            except Exception:
                continue
            if isinstance(field, (DateTimeField, DateField)):
                return name, field

        for field in model._meta.concrete_fields:
            if isinstance(field, (DateTimeField, DateField)):
                return field.name, field
        return None, None

    def _resolve_status_field(self, model):
        for name in self.STATUS_FIELD_CANDIDATES:
            try:
                field = model._meta.get_field(name)
            except Exception:
                continue
            return name, field
        return None, None

    def _resolve_label_field_name(self, model) -> str:
        for name in self.LABEL_FIELD_CANDIDATES:
            try:
                model._meta.get_field(name)
                return name
            except Exception:
                continue
        return "id"

    def _resolve_owner_field_name(self, model) -> str | None:
        for name in self.OWNER_FIELD_CANDIDATES:
            try:
                field = model._meta.get_field(name)
                if not getattr(field, "is_relation", False):
                    continue
                if getattr(field, "many_to_many", False):
                    continue
                return name
            except Exception:
                continue
        return None

    def _apply_search_filter(self, queryset, search_term: str):
        value = (search_term or "").strip()
        if not value:
            return queryset

        model = queryset.model
        predicates = Q()
        for field in model._meta.concrete_fields:
            if field.name in {"id"}:
                continue
            internal_type = field.get_internal_type()
            if internal_type in {"CharField", "TextField", "EmailField", "SlugField"}:
                predicates |= Q(**{f"{field.name}__icontains": value})
        if value.isdigit():
            predicates |= Q(pk=int(value))
        return queryset.filter(predicates) if predicates.children else queryset

    def _apply_status_filter(self, queryset, field_name: str | None, field, status_value: str):
        raw = (status_value or "").strip()
        if not raw or not field_name or field is None:
            return queryset

        internal_type = field.get_internal_type()
        if internal_type == "BooleanField":
            return queryset.filter(**{field_name: self._truthy(raw)})

        return queryset.filter(**{f"{field_name}__iexact": raw})

    @staticmethod
    def _owner_label(obj, field_name: str | None) -> str:
        if not field_name:
            return "—"
        owner = getattr(obj, field_name, None)
        if owner is None:
            return "—"
        for attr in ("get_full_name",):
            callable_attr = getattr(owner, attr, None)
            if callable(callable_attr):
                value = str(callable_attr() or "").strip()
                if value:
                    return value
        for attr in ("name", "username", "email", "custom_id"):
            value = str(getattr(owner, attr, "") or "").strip()
            if value:
                return value
        return str(owner)

    @staticmethod
    def _text_value(obj, field_name: str) -> str:
        value = getattr(obj, field_name, None)
        if value is None:
            return "—"
        text = str(value).strip()
        return text if text else "—"

    @staticmethod
    def _date_value(value) -> str:
        if value is None:
            return "—"
        if isinstance(value, datetime):
            if timezone.is_aware(value):
                value = timezone.localtime(value)
            return value.strftime("%Y-%m-%d %H:%M")
        if isinstance(value, date):
            return value.strftime("%Y-%m-%d")
        return str(value)

    def _build_payload(self, request) -> dict:
        tenant = getattr(request, "tenant", None)
        if tenant is None:
            raise ValidationError({"tenant": "Tenant não resolvido na requisição."})

        endpoint, group_key, resource_key = self._normalize_endpoint(
            request.query_params.get("endpoint") or request.query_params.get("resource_endpoint") or ""
        )
        group_label = (
            request.query_params.get("group_label")
            or self._title_from_slug(group_key)
        )
        resource_label = (
            request.query_params.get("resource_label")
            or self._title_from_slug(resource_key)
        )

        mode = self._resolve_mode(request)
        start_date, end_date, start_dt, end_dt, period_key = self._resolve_period(request)
        limit = self._parse_int(
            request.query_params.get("limit"),
            field_name="limit",
            min_value=1,
            max_value=1000,
            default=200,
        )
        search_term = (request.query_params.get("search") or "").strip()
        status_filter = (request.query_params.get("status") or "").strip()

        viewset = self._resolve_viewset(request, group_key, resource_key)
        queryset = viewset.get_queryset()
        model = queryset.model

        queryset = self._apply_search_filter(queryset, search_term)
        status_field_name, status_field = self._resolve_status_field(model)
        queryset = self._apply_status_filter(queryset, status_field_name, status_field, status_filter)

        date_field_name, date_field = self._resolve_date_field(model)
        if not date_field_name or date_field is None:
            raise ValidationError({"endpoint": "Modelo sem campo temporal para filtro por intervalo."})

        records_total = queryset.count()
        if isinstance(date_field, DateTimeField):
            period_qs = queryset.filter(
                **{
                    f"{date_field_name}__gte": start_dt,
                    f"{date_field_name}__lt": end_dt,
                }
            )
        else:
            period_qs = queryset.filter(
                **{
                    f"{date_field_name}__gte": start_date,
                    f"{date_field_name}__lte": end_date,
                }
            )

        records_in_period = period_qs.count()
        extrema = period_qs.aggregate(first_record_at=Min(date_field_name), last_record_at=Max(date_field_name))

        status_breakdown = []
        if status_field_name:
            for row in period_qs.values(status_field_name).annotate(total=Count("id")).order_by("-total", status_field_name)[:25]:
                status_breakdown.append(
                    {
                        "status": str(row.get(status_field_name) if row.get(status_field_name) not in (None, "") else "—"),
                        "total": int(row.get("total") or 0),
                    }
                )

        label_field_name = self._resolve_label_field_name(model)
        owner_field_name = self._resolve_owner_field_name(model)
        ordered_qs = period_qs.order_by(f"-{date_field_name}", "-id")
        if owner_field_name:
            ordered_qs = ordered_qs.select_related(owner_field_name)

        entries = []
        for obj in ordered_qs[:limit]:
            identifier = getattr(obj, "custom_id", None) or getattr(obj, "id_custom", None) or getattr(obj, "pk", None)
            entries.append(
                {
                    "date": self._date_value(getattr(obj, date_field_name, None)),
                    "identifier": str(identifier),
                    "label": self._text_value(obj, label_field_name),
                    "status": self._text_value(obj, status_field_name) if status_field_name else "—",
                    "owner": self._owner_label(obj, owner_field_name),
                }
            )

        coverage = round((records_in_period / records_total) * 100, 2) if records_total > 0 else 0.0
        summary = {
            "records_total": records_total,
            "records_in_period": records_in_period,
            "distinct_status_count": len(status_breakdown),
            "first_record_at": self._date_value(extrema.get("first_record_at")),
            "last_record_at": self._date_value(extrema.get("last_record_at")),
            "period_coverage_percent": coverage,
            "date_field": date_field_name,
        }

        return {
            "mode": mode,
            "model": {
                "group_key": group_key,
                "group_label": group_label,
                "resource_key": resource_key,
                "resource_label": resource_label,
                "endpoint": endpoint,
                "app_label": model._meta.app_label,
                "model_name": model._meta.model_name,
                "model_verbose_name": str(model._meta.verbose_name),
                "model_verbose_name_plural": str(model._meta.verbose_name_plural),
            },
            "period": {
                "key": period_key,
                "start": start_date.isoformat(),
                "end": end_date.isoformat(),
                "start_at": start_dt.isoformat(),
                "end_at": end_dt.isoformat(),
            },
            "filters": {
                "search": search_term,
                "status": status_filter,
            },
            "summary": summary,
            "status_breakdown": status_breakdown,
            "entries": entries,
        }

    def get(self, request):
        payload = self._build_payload(request)
        return enqueue_export_job_response(
            request,
            export_key="model_activity_pdf",
            payload=payload,
            content_disposition="inline",
        )
