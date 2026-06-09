from datetime import date, datetime, timedelta
from decimal import Decimal
import hashlib
import json

from django.contrib.auth import get_user_model
from django.core.exceptions import ValidationError as DjangoValidationError
from django.db.models import Count, Q, Sum
from django.db.models.functions import Coalesce
from django.http import HttpResponse
from django.utils import timezone
from rest_framework.decorators import action
from rest_framework.exceptions import ValidationError
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.viewsets import ModelViewSet

from api.utils.async_exports import queue_export_if_requested
from api.v1.viewset_mixins import TenantScopedQuerysetMixin, ValidatedSearchOrderingMixin
from application.billing.commands import ConfirmPendingInvoicePaymentCommand, IssueInvoiceCommand
from application.billing.handlers import handle_confirm_pending_invoice_payment, handle_issue_invoice
from apps.billing.models.invoice import Invoice
from apps.billing.models.invoice_history import InvoiceHistory
from apps.billing.models.invoice_items import InvoiceItem
from apps.notifications.use_cases import send_paid_invoice_notification
from infrastructure.cache import CacheService

from ..filters import InvoiceFilter, InvoiceHistoryFilter, InvoiceItemFilter
from ..serializers import InvoiceHistorySerializer, InvoiceItemSerializer, InvoiceSerializer


class InvoiceViewSet(ValidatedSearchOrderingMixin, TenantScopedQuerysetMixin, ModelViewSet):
    queryset = Invoice.objects.select_related(
        "patient",
        "request",
        "sale",
        "consultation",
        "created_by",
        "created_by__perfil_professional",
    ).prefetch_related(
        "items",
        "items__exam",
        "items__medical_exam",
        "items__consultation__specialty",
    )
    serializer_class = InvoiceSerializer
    filterset_class = InvoiceFilter
    permission_classes = [IsAuthenticated]
    search_fields = [
        "custom_id",
        "patient__custom_id",
        "patient__name",
        "request__custom_id",
        "consultation__custom_id",
        "sale__number",
        "status",
        "origin",
    ]
    ordering_fields = [
        "tenant",
        "custom_id",
        "deleted",
        "deleted_at",
        "created_at",
        "updated_at",
        "created_by",
        "updated_by",
        "request",
        "patient",
        "consultation",
        "sale",
        "origin",
        "subtotal",
        "vat_amount",
        "total",
        "insurance_amount",
        "patient_amount",
        "status",
        "version",
    ]
    ordering = ["-created_at"]

    PERIOD_ALIASES = {
        "daily": "daily",
        "diario": "daily",
        "day": "daily",
        "monthly": "monthly",
        "mensal": "monthly",
        "month": "monthly",
        "quarterly": "quarterly",
        "trimestral": "quarterly",
        "quarter": "quarterly",
        "semiannual": "semiannual",
        "semestral": "semiannual",
        "semester": "semiannual",
        "annual": "annual",
        "anual": "annual",
        "year": "annual",
    }
    SCOPE_ALIASES = {
        "user": "user",
        "usuario": "user",
        "utilizador": "user",
        "all": "all",
        "geral": "all",
        "todos": "all",
    }
    billing_history_cache_ttl_seconds = 60

    def _billing_history_cache_key(self, request) -> str:
        tenant = getattr(request, "tenant", None)
        tenant_part = getattr(tenant, "id", None) or "global"
        query_params = getattr(request, "query_params", {})
        try:
            pairs = sorted((k, tuple(query_params.getlist(k))) for k in query_params)
        except Exception:
            pairs = sorted((k, str(v)) for k, v in dict(query_params).items())
        digest = hashlib.sha256(json.dumps(pairs, sort_keys=True, default=str).encode("utf-8")).hexdigest()
        return f"billing:history:{tenant_part}:{digest}"

    @staticmethod
    def _full_name_or_username(user) -> str:
        if not user:
            return "Sem utilizador"
        first_name = (getattr(user, "first_name", "") or "").strip()
        last_name = (getattr(user, "last_name", "") or "").strip()
        full = f"{first_name} {last_name}".strip()
        if full:
            return full
        username = (getattr(user, "username", "") or "").strip()
        if username:
            return username
        email = (getattr(user, "email", "") or "").strip()
        return email or "Sem utilizador"

    @staticmethod
    def _money(value) -> str:
        try:
            return str(Decimal(value or 0).quantize(Decimal("0.01")))
        except Exception:
            return "0.00"

    def _parse_int(self, raw_value, *, field_name: str, min_value: int, max_value: int, default: int) -> int:
        value = default if raw_value in (None, "") else raw_value
        try:
            parsed = int(value)
        except Exception as exc:
            raise ValidationError({field_name: "Valor numérico inválido."}) from exc
        if parsed < min_value or parsed > max_value:
            raise ValidationError({field_name: f"Valor deve estar entre {min_value} e {max_value}."})
        return parsed

    @staticmethod
    def _aware_midnight(year: int, month: int, day: int) -> datetime:
        return datetime(year, month, day, 0, 0, 0, tzinfo=timezone.get_current_timezone())

    def _resolve_period(self, request):
        now = timezone.localtime()

        raw_period = (request.query_params.get("period") or "annual").strip().lower()
        period = self.PERIOD_ALIASES.get(raw_period)
        if not period:
            raise ValidationError({"period": "Use: daily, monthly, quarterly, semiannual ou annual."})

        year = self._parse_int(
            request.query_params.get("year"),
            field_name="year",
            min_value=2000,
            max_value=2100,
            default=now.year,
        )

        if period == "daily":
            raw_date = (request.query_params.get("date") or "").strip()
            if raw_date:
                try:
                    date_ref = date.fromisoformat(raw_date)
                except ValueError as exc:
                    raise ValidationError({"date": "Use o formato YYYY-MM-DD."}) from exc
            else:
                date_ref = now.date()

            start = self._aware_midnight(date_ref.year, date_ref.month, date_ref.day)
            end = start + timedelta(days=1)
            label = f"Diário {date_ref.strftime('%d/%m/%Y')}"
            filters = {"date": date_ref.isoformat(), "year": date_ref.year}
            return period, start, end, label, filters

        if period == "monthly":
            month = self._parse_int(
                request.query_params.get("month"),
                field_name="month",
                min_value=1,
                max_value=12,
                default=now.month,
            )
            start = self._aware_midnight(year, month, 1)
            end = self._aware_midnight(year + 1, 1, 1) if month == 12 else self._aware_midnight(year, month + 1, 1)
            label = f"Mensal {month:02d}/{year}"
            filters = {"year": year, "month": month}
            return period, start, end, label, filters

        if period == "quarterly":
            default_quarter = ((now.month - 1) // 3) + 1
            quarter = self._parse_int(
                request.query_params.get("quarter"),
                field_name="quarter",
                min_value=1,
                max_value=4,
                default=default_quarter,
            )
            month_start = ((quarter - 1) * 3) + 1
            month_end = month_start + 3
            start = self._aware_midnight(year, month_start, 1)
            end = self._aware_midnight(year + 1, 1, 1) if month_end > 12 else self._aware_midnight(year, month_end, 1)
            label = f"Trimestral T{quarter}/{year}"
            filters = {"year": year, "quarter": quarter}
            return period, start, end, label, filters

        if period == "semiannual":
            default_semester = 1 if now.month <= 6 else 2
            semester = self._parse_int(
                request.query_params.get("semester"),
                field_name="semester",
                min_value=1,
                max_value=2,
                default=default_semester,
            )
            month_start = 1 if semester == 1 else 7
            month_end = 7 if semester == 1 else 13
            start = self._aware_midnight(year, month_start, 1)
            end = self._aware_midnight(year + 1, 1, 1) if month_end == 13 else self._aware_midnight(year, month_end, 1)
            label = f"Semestral S{semester}/{year}"
            filters = {"year": year, "semester": semester}
            return period, start, end, label, filters

        start = self._aware_midnight(year, 1, 1)
        end = self._aware_midnight(year + 1, 1, 1)
        label = f"Anual {year}"
        filters = {"year": year}
        return period, start, end, label, filters

    def _resolve_scope_and_user(self, request):
        raw_scope = (request.query_params.get("scope") or "").strip().lower()
        raw_user_id = (request.query_params.get("user_id") or request.query_params.get("usuario") or "").strip()

        scope = self.SCOPE_ALIASES.get(raw_scope) if raw_scope else None
        if scope is None:
            scope = "user" if raw_user_id else "all"

        if scope == "user":
            user_id = self._parse_int(
                raw_user_id if raw_user_id else getattr(getattr(request, "user", None), "id", None),
                field_name="user_id",
                min_value=1,
                max_value=999999999,
                default=0,
            )
            user_model = get_user_model()
            qs = user_model.objects.filter(pk=user_id)
            tenant = getattr(request, "tenant", None)
            request_user = getattr(request, "user", None)
            if (
                tenant is not None
                and not getattr(request_user, "is_superuser", False)
                and hasattr(user_model, "tenant")
            ):
                qs = qs.filter(tenant=tenant)
            target_user = qs.first()
            if not target_user:
                raise ValidationError({"user_id": "Utilizador não encontrado no tenant."})
            return scope, target_user

        return scope, None

    def _build_billing_history_payload(self, request):
        refresh_cache = str(request.query_params.get("refresh") or "").strip().lower() in {"1", "true", "t", "sim"}
        cache_key = self._billing_history_cache_key(request)
        if not refresh_cache:
            cached = CacheService.get(cache_key)
            if isinstance(cached, dict):
                return cached

        period_key, start_dt, end_dt, period_label, period_filters = self._resolve_period(request)
        scope, target_user = self._resolve_scope_and_user(request)

        limit_default = 200 if scope == "user" else 300
        limit = self._parse_int(
            request.query_params.get("limit"),
            field_name="limit",
            min_value=1,
            max_value=1000,
            default=limit_default,
        )

        invoices_qs = (
            self.get_queryset()
            .filter(deleted=False, created_at__gte=start_dt, created_at__lt=end_dt)
            .select_related("created_by", "patient")
        )
        if target_user is not None:
            invoices_qs = invoices_qs.filter(created_by=target_user)

        summary_raw = invoices_qs.aggregate(
            invoice_count=Count("id"),
            subtotal=Coalesce(Sum("subtotal"), Decimal("0.00")),
            vat_amount=Coalesce(Sum("vat_amount"), Decimal("0.00")),
            total_amount=Coalesce(Sum("total"), Decimal("0.00")),
            paid_total=Coalesce(Sum("total", filter=Q(status=Invoice.Status.PAID)), Decimal("0.00")),
            pending_total=Coalesce(
                Sum("total", filter=Q(status__in=[Invoice.Status.DRAFT, Invoice.Status.ISSUED])),
                Decimal("0.00"),
            ),
            canceled_total=Coalesce(Sum("total", filter=Q(status=Invoice.Status.CANCELED)), Decimal("0.00")),
            issued_count=Count("id", filter=Q(status=Invoice.Status.ISSUED)),
            paid_count=Count("id", filter=Q(status=Invoice.Status.PAID)),
            canceled_count=Count("id", filter=Q(status=Invoice.Status.CANCELED)),
            draft_count=Count("id", filter=Q(status=Invoice.Status.DRAFT)),
        )

        users_grouped = (
            invoices_qs.values(
                "created_by",
                "created_by__username",
                "created_by__first_name",
                "created_by__last_name",
            )
            .annotate(
                invoice_count=Count("id"),
                total_amount=Coalesce(Sum("total"), Decimal("0.00")),
                paid_total=Coalesce(Sum("total", filter=Q(status=Invoice.Status.PAID)), Decimal("0.00")),
                pending_total=Coalesce(
                    Sum("total", filter=Q(status__in=[Invoice.Status.DRAFT, Invoice.Status.ISSUED])),
                    Decimal("0.00"),
                ),
                issued_count=Count("id", filter=Q(status=Invoice.Status.ISSUED)),
                paid_count=Count("id", filter=Q(status=Invoice.Status.PAID)),
                canceled_count=Count("id", filter=Q(status=Invoice.Status.CANCELED)),
                draft_count=Count("id", filter=Q(status=Invoice.Status.DRAFT)),
            )
            .order_by("-total_amount", "created_by__username")
        )

        users_payload = []
        for row in users_grouped:
            first_name = (row.get("created_by__first_name") or "").strip()
            last_name = (row.get("created_by__last_name") or "").strip()
            full_name = f"{first_name} {last_name}".strip()
            username = (row.get("created_by__username") or "").strip()
            display_name = full_name or username or "Sem utilizador"
            users_payload.append(
                {
                    "user_id": row.get("created_by"),
                    "username": username or None,
                    "display_name": display_name,
                    "invoice_count": int(row.get("invoice_count") or 0),
                    "total": self._money(row.get("total_amount")),
                    "paid_total": self._money(row.get("paid_total")),
                    "pending_total": self._money(row.get("pending_total")),
                    "issued_count": int(row.get("issued_count") or 0),
                    "paid_count": int(row.get("paid_count") or 0),
                    "canceled_count": int(row.get("canceled_count") or 0),
                    "draft_count": int(row.get("draft_count") or 0),
                }
            )

        invoice_rows = invoices_qs.order_by("-created_at").values(
            "id",
            "custom_id",
            "status",
            "origin",
            "subtotal",
            "vat_amount",
            "total",
            "created_at",
            "created_by",
            "created_by__username",
            "created_by__first_name",
            "created_by__last_name",
            "patient__name",
        )[:limit]

        invoices_payload = []
        for row in invoice_rows:
            first_name = (row.get("created_by__first_name") or "").strip()
            last_name = (row.get("created_by__last_name") or "").strip()
            full_name = f"{first_name} {last_name}".strip()
            username = (row.get("created_by__username") or "").strip()
            created_by_name = full_name or username or "Sem utilizador"
            invoices_payload.append(
                {
                    "id": row.get("id"),
                    "custom_id": row.get("custom_id"),
                    "status": row.get("status"),
                    "origin": row.get("origin"),
                    "subtotal": self._money(row.get("subtotal")),
                    "vat_amount": self._money(row.get("vat_amount")),
                    "total": self._money(row.get("total")),
                    "created_at": row.get("created_at").isoformat() if row.get("created_at") else None,
                    "created_by_id": row.get("created_by"),
                    "created_by_name": created_by_name,
                    "patient_name": row.get("patient__name") or "—",
                }
            )

        target_user_payload = None
        if target_user is not None:
            target_user_payload = {
                "id": target_user.id,
                "username": getattr(target_user, "username", "") or None,
                "display_name": self._full_name_or_username(target_user),
            }

        payload = {
            "scope": scope,
            "period": {
                "key": period_key,
                "label": period_label,
                "start": start_dt.isoformat(),
                "end": end_dt.isoformat(),
                **period_filters,
            },
            "target_user": target_user_payload,
            "summary": {
                "invoice_count": int(summary_raw.get("invoice_count") or 0),
                "subtotal": self._money(summary_raw.get("subtotal")),
                "vat_amount": self._money(summary_raw.get("vat_amount")),
                "total": self._money(summary_raw.get("total_amount")),
                "paid_total": self._money(summary_raw.get("paid_total")),
                "pending_total": self._money(summary_raw.get("pending_total")),
                "canceled_total": self._money(summary_raw.get("canceled_total")),
                "issued_count": int(summary_raw.get("issued_count") or 0),
                "paid_count": int(summary_raw.get("paid_count") or 0),
                "canceled_count": int(summary_raw.get("canceled_count") or 0),
                "draft_count": int(summary_raw.get("draft_count") or 0),
            },
            "users": users_payload,
            "invoices": invoices_payload,
        }
        CacheService.set(cache_key, payload, timeout=self.billing_history_cache_ttl_seconds)
        return payload

    def _execute_command(self, handler, command):
        try:
            return handler(command)
        except DjangoValidationError as exc:
            if hasattr(exc, "message_dict"):
                raise ValidationError(exc.message_dict) from exc
            raise ValidationError(exc.messages) from exc
        except Exception as exc:
            raise ValidationError(str(exc)) from exc

    @action(detail=True, methods=["post"], url_path="issue", url_name="issue")
    def issue(self, request, pk=None):
        invoice = self._execute_command(
            handle_issue_invoice,
            IssueInvoiceCommand(
                invoice=self.get_object(),
                idempotent=True,
            ),
        )
        return Response(self.get_serializer(invoice).data)

    @action(detail=True, methods=["post"], url_path="void", url_name="void")
    def void(self, request, pk=None):
        invoice = self.get_object()
        if invoice.status != Invoice.Status.CANCELED:
            invoice.status = Invoice.Status.CANCELED
            invoice.save(update_fields=["status"])
            try:
                history_lines = [
                    f"Origem: {invoice.get_origin_display()}",
                    f"Paciente: {getattr(invoice.patient, 'name', '-')}",
                    f"Total com IVA: {getattr(invoice, 'total', 0):.2f}",
                ]
                invoice.register_history("CANCELAMENTO", "Fatura cancelada", linhas=history_lines)
            except Exception:
                pass
        return Response(self.get_serializer(invoice).data)

    @action(
        detail=True,
        methods=["post"],
        url_path="confirm-payment",
        url_name="confirm-payment",
    )
    def confirm_payment(self, request, pk=None):
        invoice = self._execute_command(
            handle_confirm_pending_invoice_payment,
            ConfirmPendingInvoicePaymentCommand(
                invoice=self.get_object(),
                idempotent=True,
            ),
        )
        return Response(self.get_serializer(invoice).data)

    @action(
        detail=True,
        methods=["post"],
        url_path="send-notification",
        url_name="send-notification",
    )
    def send_notification(self, request, pk=None):
        try:
            payload = send_paid_invoice_notification(
                self.get_object(),
                payload=request.data or {},
            )
        except DjangoValidationError as exc:
            if hasattr(exc, "message_dict"):
                raise ValidationError(exc.message_dict) from exc
            raise ValidationError(exc.messages) from exc
        return Response(payload)

    @action(detail=True, methods=["get"])
    def pdf(self, request, pk=None):
        """Gera o PDF da fatura.

        Mesmo padrão dos restantes documentos (recibo, resultados, procedimento,
        históricos): síncrono por defeito — devolve o PDF inline para o frontend
        fazer apiFetch(blob) + window.open — e assíncrono apenas com ?async=true.
        """
        invoice = self.get_object()

        queued = queue_export_if_requested(
            request,
            export_key="invoice_pdf",
            payload={"invoice_id": invoice.id},
            content_disposition="inline",
        )
        if queued is not None:
            return queued

        from tasks.generate_pdf.invoice_pdf_generator import generate_invoice_pdf

        pdf_bytes, filename = generate_invoice_pdf(invoice, request=request)
        response = HttpResponse(pdf_bytes, content_type="application/pdf")
        response["Content-Disposition"] = f'inline; filename="{filename}"'
        return response

    @action(detail=False, methods=["get"], url_path="billing-history", url_name="billing-history")
    def billing_history(self, request):
        """Retorna histórico agregado de faturamento por utilizador."""
        payload = self._build_billing_history_payload(request)
        return Response(payload)

    @action(detail=False, methods=["get"], url_path="billing-history/pdf", url_name="billing-history-pdf")
    def billing_history_pdf(self, request):
        """Emite PDF do histórico agregado de faturamento por utilizador."""
        payload = self._build_billing_history_payload(request)
        queued = queue_export_if_requested(
            request,
            export_key="billing_history_pdf",
            payload=payload,
            content_disposition="inline",
        )
        if queued is not None:
            return queued

        from tasks.generate_pdf.billing_invoice_user_history_pdf_generator import generate_billing_user_history_pdf

        pdf_bytes, filename = generate_billing_user_history_pdf(payload, request=request)
        response = HttpResponse(pdf_bytes, content_type="application/pdf")
        response["Content-Disposition"] = f'inline; filename="{filename}"'
        return response


class InvoiceItemViewSet(ValidatedSearchOrderingMixin, TenantScopedQuerysetMixin, ModelViewSet):
    queryset = InvoiceItem.objects.select_related(
        "invoice",
        "exam",
        "medical_exam",
        "consultation__specialty",
        "sale_item__product",
        "procedure_item__catalog",
        "procedure_material__product",
    )
    serializer_class = InvoiceItemSerializer
    filterset_class = InvoiceItemFilter
    permission_classes = [IsAuthenticated]
    search_fields = [
        "custom_id",
        "description",
        "invoice__custom_id",
        "exam__name",
        "medical_exam__name",
        "sale_item__name",
        "item_type",
    ]
    ordering_fields = [
        "tenant",
        "custom_id",
        "position",
        "deleted",
        "deleted_at",
        "created_at",
        "updated_at",
        "created_by",
        "updated_by",
        "invoice",
        "exam",
        "medical_exam",
        "sale_item",
        "procedure_item",
        "procedure_material",
        "description",
        "quantity",
        "unit_price",
        "vat_percentage",
        "item_type",
        "version",
    ]
    ordering = ["invoice", "position", "id"]


class InvoiceHistoryViewSet(ValidatedSearchOrderingMixin, TenantScopedQuerysetMixin, ModelViewSet):
    queryset = InvoiceHistory.objects.all()
    serializer_class = InvoiceHistorySerializer
    filterset_class = InvoiceHistoryFilter
    permission_classes = [IsAuthenticated]
    search_fields = ["description", "event_type"]
    ordering_fields = ["invoice", "description", "event_type", "created_at"]
    ordering = ["-created_at"]


VIEWSET_MAP = {
    "invoice": InvoiceViewSet,
    "invoicehistory": InvoiceHistoryViewSet,
    "invoiceitem": InvoiceItemViewSet,
}

__all__ = [
    "VIEWSET_MAP",
    "InvoiceHistoryViewSet",
    "InvoiceItemViewSet",
    "InvoiceViewSet",
]
