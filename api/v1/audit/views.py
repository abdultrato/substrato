"""Views customizadas para relatórios de auditoria de actividades."""

from __future__ import annotations

from datetime import date, datetime, timedelta
from urllib.parse import urlparse

from django.db.models import Avg, Count, Q
from django.http import HttpResponse
from django.utils import timezone
from rest_framework.exceptions import ValidationError
from rest_framework.permissions import IsAuthenticated
from rest_framework.views import APIView

from api.utils.async_exports import queue_export_if_requested
from apps.audit_activities.models.user_activity import UserActivity
from tasks.generate_pdf.activity_reports_pdf_generator import generate_activity_report_pdf


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
        queued = queue_export_if_requested(
            request,
            export_key="activity_report_pdf",
            payload=payload,
            content_disposition="inline",
        )
        if queued is not None:
            return queued

        pdf_bytes, filename = generate_activity_report_pdf(payload, request=request)

        response = HttpResponse(pdf_bytes, content_type="application/pdf")
        response["Content-Disposition"] = f'inline; filename="{filename}"'
        response["X-Report-Scope"] = str(payload.get("scope") or "")
        response["X-Activity-Count"] = str((payload.get("summary") or {}).get("total_activities", 0))
        page_path = ((payload.get("page") or {}).get("path") or "").strip()
        if page_path:
            response["X-Page-Path"] = page_path
        return response
