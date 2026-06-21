"""ViewSets REST do fluxo comercial (cotações e proformas).

CRUD via ``ModelViewSet`` (com scoping de tenant) + ações de ciclo de vida e
conversão que delegam aos serviços de domínio
(``QuotationWorkflowService``/``ProformaWorkflowService``), preservando as regras
de negócio (transições válidas, recálculo de totais, bloqueios).
"""

from django.core.exceptions import ValidationError as DjangoValidationError
from django.http import HttpResponse
from rest_framework.decorators import action
from rest_framework.exceptions import PermissionDenied, ValidationError
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.viewsets import ModelViewSet

from api.v1.viewset_mixins import TenantScopedQuerysetMixin, ValidatedSearchOrderingMixin
from apps.cotacoes.models import (
    ProformaHistory,
    ProformaInvoice,
    ProformaItem,
    Quotation,
    QuotationItem,
    QuotationStatusHistory,
)
from apps.cotacoes.services import ProformaWorkflowService, QuotationWorkflowService

from ..filters import (
    ProformaHistoryFilter,
    ProformaInvoiceFilter,
    ProformaItemFilter,
    QuotationFilter,
    QuotationItemFilter,
    QuotationStatusHistoryFilter,
)
from ..serializers import (
    ProformaHistorySerializer,
    ProformaInvoiceSerializer,
    ProformaItemSerializer,
    QuotationItemSerializer,
    QuotationSerializer,
    QuotationStatusHistorySerializer,
)


def _actor(request) -> str:
    user = getattr(request, "user", None)
    if not user:
        return ""
    full = (getattr(user, "get_full_name", lambda: "")() or "").strip()
    return full or getattr(user, "username", "") or ""


def _run(callable_, *args, **kwargs):
    """Executa lógica de domínio convertendo ValidationError do Django em 400 DRF."""
    try:
        return callable_(*args, **kwargs)
    except DjangoValidationError as exc:
        raise ValidationError(getattr(exc, "messages", None) or str(exc)) from exc


class QuotationViewSet(ValidatedSearchOrderingMixin, TenantScopedQuerysetMixin, ModelViewSet):
    queryset = Quotation.objects.select_related("fiscal_client", "patient", "converted_proforma").prefetch_related(
        "items"
    )
    serializer_class = QuotationSerializer
    filterset_class = QuotationFilter
    permission_classes = [IsAuthenticated]
    search_fields = ["custom_id", "quotation_number", "fiscal_client_name", "fiscal_client_nuit", "status"]
    ordering_fields = ["custom_id", "quotation_number", "status", "issue_date", "expiry_date", "grand_total", "created_at"]
    ordering = ["-created_at"]

    def perform_create(self, serializer):
        tenant = getattr(self.request, "tenant", None)
        data = dict(serializer.validated_data)
        data.pop("tenant", None)
        serializer.instance = _run(QuotationWorkflowService.create_quotation, tenant=tenant, **data)

    @action(detail=True, methods=["post"], url_path="send")
    def send(self, request, pk=None):
        obj = _run(QuotationWorkflowService.send, self.get_object(), actor_name=_actor(request))
        return Response(self.get_serializer(obj).data)

    @action(detail=True, methods=["post"], url_path="accept")
    def accept(self, request, pk=None):
        obj = _run(QuotationWorkflowService.accept, self.get_object(), actor_name=_actor(request))
        return Response(self.get_serializer(obj).data)

    @action(detail=True, methods=["post"], url_path="reject")
    def reject(self, request, pk=None):
        obj = _run(
            QuotationWorkflowService.reject,
            self.get_object(),
            reason=request.data.get("reason", ""),
            actor_name=_actor(request),
        )
        return Response(self.get_serializer(obj).data)

    @action(detail=True, methods=["post"], url_path="cancel")
    def cancel(self, request, pk=None):
        obj = _run(QuotationWorkflowService.cancel, self.get_object(), actor_name=_actor(request))
        return Response(self.get_serializer(obj).data)

    @action(detail=True, methods=["post"], url_path="duplicate")
    def duplicate(self, request, pk=None):
        obj = _run(QuotationWorkflowService.duplicate, self.get_object(), actor_name=_actor(request))
        return Response(self.get_serializer(obj).data, status=201)

    @action(detail=True, methods=["post"], url_path="convert-to-proforma")
    def convert_to_proforma(self, request, pk=None):
        proforma = _run(QuotationWorkflowService.convert_to_proforma, self.get_object(), actor_name=_actor(request))
        return Response(ProformaInvoiceSerializer(proforma, context=self.get_serializer_context()).data, status=201)


class _LineItemViewSetMixin:
    """Encaminha create/update/destroy de itens para o serviço (lock + recálculo)."""

    parent_attr: str = ""
    service = None
    _parent_tenant_msg = "O documento pertence a outro tenant."

    def _assert_parent_tenant(self, parent):
        tenant = getattr(self.request, "tenant", None)
        if tenant is not None and getattr(parent, "tenant_id", None) != getattr(tenant, "id", None):
            raise PermissionDenied(self._parent_tenant_msg)

    def perform_create(self, serializer):
        data = dict(serializer.validated_data)
        parent = data.pop(self.parent_attr)
        self._assert_parent_tenant(parent)
        serializer.instance = _run(self.service.add_item, parent, **data)

    def perform_update(self, serializer):
        item = serializer.instance
        data = dict(serializer.validated_data)
        data.pop(self.parent_attr, None)
        serializer.instance = _run(self.service.update_item, item, **data)

    def perform_destroy(self, instance):
        _run(self.service.remove_item, instance)


class QuotationItemViewSet(_LineItemViewSetMixin, ValidatedSearchOrderingMixin, TenantScopedQuerysetMixin, ModelViewSet):
    queryset = QuotationItem.objects.select_related("quotation")
    serializer_class = QuotationItemSerializer
    filterset_class = QuotationItemFilter
    permission_classes = [IsAuthenticated]
    search_fields = ["custom_id", "description", "quotation__custom_id", "item_type"]
    ordering_fields = ["custom_id", "position", "line_total", "created_at"]
    ordering = ["position", "id"]
    parent_attr = "quotation"
    service = QuotationWorkflowService


class QuotationStatusHistoryViewSet(
    ValidatedSearchOrderingMixin, TenantScopedQuerysetMixin, ModelViewSet
):
    http_method_names = ["get", "head", "options"]
    queryset = QuotationStatusHistory.objects.select_related("quotation")
    serializer_class = QuotationStatusHistorySerializer
    filterset_class = QuotationStatusHistoryFilter
    permission_classes = [IsAuthenticated]
    search_fields = ["event_type", "summary", "quotation__custom_id"]
    ordering_fields = ["event_at", "created_at"]
    ordering = ["-event_at"]


class ProformaInvoiceViewSet(ValidatedSearchOrderingMixin, TenantScopedQuerysetMixin, ModelViewSet):
    queryset = ProformaInvoice.objects.select_related(
        "fiscal_client", "patient", "quotation", "converted_invoice"
    ).prefetch_related("items")
    serializer_class = ProformaInvoiceSerializer
    filterset_class = ProformaInvoiceFilter
    permission_classes = [IsAuthenticated]
    search_fields = ["custom_id", "proforma_number", "fiscal_client_name", "fiscal_client_nuit", "status"]
    ordering_fields = ["custom_id", "proforma_number", "status", "issue_date", "expiry_date", "grand_total", "created_at"]
    ordering = ["-created_at"]

    def perform_create(self, serializer):
        tenant = getattr(self.request, "tenant", None)
        data = dict(serializer.validated_data)
        data.pop("tenant", None)
        serializer.instance = _run(ProformaWorkflowService.create_proforma, tenant=tenant, **data)

    @action(detail=True, methods=["post"], url_path="send")
    def send(self, request, pk=None):
        obj = _run(ProformaWorkflowService.send, self.get_object(), actor_name=_actor(request))
        return Response(self.get_serializer(obj).data)

    @action(detail=True, methods=["post"], url_path="accept")
    def accept(self, request, pk=None):
        obj = _run(ProformaWorkflowService.accept, self.get_object(), actor_name=_actor(request))
        return Response(self.get_serializer(obj).data)

    @action(detail=True, methods=["post"], url_path="reject")
    def reject(self, request, pk=None):
        obj = _run(
            ProformaWorkflowService.reject,
            self.get_object(),
            reason=request.data.get("reason", ""),
            actor_name=_actor(request),
        )
        return Response(self.get_serializer(obj).data)

    @action(detail=True, methods=["post"], url_path="cancel")
    def cancel(self, request, pk=None):
        obj = _run(ProformaWorkflowService.cancel, self.get_object(), actor_name=_actor(request))
        return Response(self.get_serializer(obj).data)

    @action(detail=True, methods=["post"], url_path="convert-to-invoice")
    def convert_to_invoice(self, request, pk=None):
        from api.v1.billing.serializers import InvoiceSerializer

        invoice = _run(ProformaWorkflowService.convert_to_invoice, self.get_object(), actor_name=_actor(request))
        return Response(InvoiceSerializer(invoice, context=self.get_serializer_context()).data, status=201)

    @action(detail=True, methods=["get"], url_path="pdf", url_name="pdf")
    def pdf(self, request, pk=None):
        """Gera o PDF A5 da fatura proforma (duplicado: Original + Arquivo)."""
        proforma = self.get_object()
        from tasks.generate_pdf.proforma_pdf_generator import generate_proforma_pdf

        pdf_bytes, filename = generate_proforma_pdf(proforma, request=request)
        response = HttpResponse(pdf_bytes, content_type="application/pdf")
        response["Content-Disposition"] = f'inline; filename="{filename}"'
        return response


class ProformaItemViewSet(_LineItemViewSetMixin, ValidatedSearchOrderingMixin, TenantScopedQuerysetMixin, ModelViewSet):
    queryset = ProformaItem.objects.select_related("proforma")
    serializer_class = ProformaItemSerializer
    filterset_class = ProformaItemFilter
    permission_classes = [IsAuthenticated]
    search_fields = ["custom_id", "description", "proforma__custom_id", "item_type"]
    ordering_fields = ["custom_id", "position", "line_total", "created_at"]
    ordering = ["position", "id"]
    parent_attr = "proforma"
    service = ProformaWorkflowService


class ProformaHistoryViewSet(ValidatedSearchOrderingMixin, TenantScopedQuerysetMixin, ModelViewSet):
    http_method_names = ["get", "head", "options"]
    queryset = ProformaHistory.objects.select_related("proforma")
    serializer_class = ProformaHistorySerializer
    filterset_class = ProformaHistoryFilter
    permission_classes = [IsAuthenticated]
    search_fields = ["event_type", "summary", "proforma__custom_id"]
    ordering_fields = ["event_at", "created_at"]
    ordering = ["-event_at"]


VIEWSET_MAP = {
    "quotation": QuotationViewSet,
    "quotationitem": QuotationItemViewSet,
    "quotationhistory": QuotationStatusHistoryViewSet,
    "proforma": ProformaInvoiceViewSet,
    "proformaitem": ProformaItemViewSet,
    "proformahistory": ProformaHistoryViewSet,
}
