"""ViewSets da API v1 para check-in e fluxo de recepção."""

from django.core.exceptions import ValidationError as DjangoValidationError
from django.db import transaction
from django.shortcuts import get_object_or_404
from rest_framework import status
from rest_framework.decorators import action
from rest_framework.exceptions import ValidationError
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.viewsets import ModelViewSet, ViewSet

from api.v1.viewset_mixins import ValidatedSearchOrderingMixin
from application.reception.care_flow import get_care_summary
from application.reception.commands import (
    CreateInvoiceForCheckinCommand,
    CreateRequestForCheckinCommand,
    ExecuteFullFlowCommand,
    LinkInvoiceToCheckinCommand,
    LinkRequestToCheckinCommand,
    RegisterPaymentForCheckinCommand,
)
from application.reception.get_workspace import execute as get_workspace_date
from application.reception.handlers import (
    handle_create_invoice_for_checkin,
    handle_create_request_for_checkin,
    handle_execute_full_flow,
    handle_link_invoice_to_checkin,
    handle_link_request_to_checkin,
    handle_register_payment_for_checkin,
)
from apps.reception.models.reception_checkin import ReceptionCheckin
from drf_spectacular.utils import OpenApiParameter, OpenApiTypes, extend_schema

from ..filters import ReceptionCheckinFilter
from ..serializers import (
    CareFlowCreateSerializer,
    CreateReceptionInvoiceSerializer,
    CreateReceptionRequestSerializer,
    LinkInvoiceSerializer,
    LinkRequestSerializer,
    ReceptionCheckinSerializer,
    RegisterReceptionPaymentSerializer,
)


class TenantAwareMixin:
    """Mixin que garante tenant no request e converte validações para DRF errors."""

    permission_classes = [IsAuthenticated]

    def get_tenant(self):
        tenant = getattr(self.request, "tenant", None)
        if tenant is None:
            raise ValidationError("Tenant não identificado na requisição.")
        return tenant

    get_tenant = get_tenant

    def execute_safely(self, func, *args, **kwargs):
        try:
            return func(*args, **kwargs)
        except DjangoValidationError as exc:
            if hasattr(exc, "message_dict"):
                raise ValidationError(exc.message_dict) from exc
            if hasattr(exc, "messages"):
                raise ValidationError(exc.messages) from exc
            raise ValidationError(str(exc)) from exc



class ReceptionWorkspaceViewSet(ValidatedSearchOrderingMixin, TenantAwareMixin, ViewSet):
    """Retorna datas/intervalos de trabalho da recepção (read-only)."""
    http_method_names = ["get"]

    @extend_schema(responses={200: OpenApiTypes.OBJECT})
    def list(self, request):
        return Response(get_workspace_date(self.get_tenant()))


class ReceptionCheckinViewSet(ValidatedSearchOrderingMixin, TenantAwareMixin, ModelViewSet):
    """CRUD de check-ins, com ações para request, invoice e pagamento."""
    queryset = ReceptionCheckin.objects.select_related(
        "patient",
        "request",
        "invoice",
        "attendant",
    ).all()
    serializer_class = ReceptionCheckinSerializer
    filterset_class = ReceptionCheckinFilter
    search_fields = [
        "custom_id",
        "patient__custom_id",
        "patient__name",
        "reason",
        "notes",
    ]
    ordering_fields = [
        "custom_id",
        "priority",
        "status",
        "arrived_at",
        "called_at",
        "completed_at",
        "created_at",
    ]
    ordering = ["-arrived_at"]

    def get_queryset(self):
        return super().get_queryset().filter(tenant=self.get_tenant())

    @transaction.atomic
    def perform_create(self, serializer):
        serializer.save(
            tenant=self.get_tenant(),
            created_by=self.request.user,
            updated_by=self.request.user,
        )

    @transaction.atomic
    def perform_update(self, serializer):
        serializer.save(updated_by=self.request.user)

    @action(detail=True, methods=["post"], url_path="iniciar_atendimento", url_name="iniciar-atendimento")
    def start_care(self, request, pk=None):
        checkin = self.get_object()
        self.execute_safely(checkin.start_care, attendant=request.user)
        return Response(self.get_serializer(checkin).data)

    @action(detail=True, methods=["post"], url_path="concluir", url_name="concluir")
    def complete(self, request, pk=None):
        checkin = self.get_object()
        self.execute_safely(checkin.complete)
        return Response(self.get_serializer(checkin).data)

    @action(detail=True, methods=["post"], url_path="cancelar", url_name="cancelar")
    def cancel(self, request, pk=None):
        checkin = self.get_object()
        self.execute_safely(checkin.cancel)
        return Response(self.get_serializer(checkin).data)

    @action(detail=True, methods=["get"], url_path="atendimento", url_name="atendimento")
    def care(self, request, pk=None):
        checkin = self.get_object()
        return Response(get_care_summary(checkin))

    @transaction.atomic
    @action(detail=True, methods=["post"], url_path="criar_request", url_name="criar-request")
    def create_request(self, request, pk=None):
        payload = CreateReceptionRequestSerializer(data=request.data)
        payload.is_valid(raise_exception=True)

        checkin = self.get_object()
        self.execute_safely(
            handle_create_request_for_checkin,
            CreateRequestForCheckinCommand(
                checkin=checkin,
                exam_ids=payload.validated_data["exams_ids"],
                clinical_status=payload.validated_data.get("clinical_status"),
                idempotent=True,
            ),
        )
        return Response(get_care_summary(checkin))

    @transaction.atomic
    @action(detail=True, methods=["post"], url_path="criar_invoice", url_name="criar-invoice")
    def create_invoice(self, request, pk=None):
        payload = CreateReceptionInvoiceSerializer(data=request.data)
        payload.is_valid(raise_exception=True)

        checkin = self.get_object()
        self.execute_safely(
            handle_create_invoice_for_checkin,
            CreateInvoiceForCheckinCommand(
                checkin=checkin,
                issue=payload.validated_data.get("issue", True),
                idempotent=True,
            ),
        )
        return Response(get_care_summary(checkin))

    @transaction.atomic
    @action(detail=True, methods=["post"], url_path="registrar_payment", url_name="registrar-payment")
    def register_payment(self, request, pk=None):
        payload = RegisterReceptionPaymentSerializer(data=request.data)
        payload.is_valid(raise_exception=True)

        checkin = self.get_object()
        self.execute_safely(
            handle_register_payment_for_checkin,
            RegisterPaymentForCheckinCommand(
                checkin=checkin,
                value=payload.validated_data.get("value"),
                method=payload.validated_data.get("method"),
                external_reference=payload.validated_data.get("external_reference", ""),
                insurer_id=payload.validated_data.get("insurer_id"),
                coverage_plan_id=payload.validated_data.get("coverage_plan_id"),
                authorization_number=payload.validated_data.get("authorization_number", ""),
                insurance_date=payload.validated_data.get("insurance_date"),
                confirm=payload.validated_data.get("confirm", True),
                idempotent=True,
            ),
        )
        return Response(get_care_summary(checkin))

    @action(detail=True, methods=["post"], url_path="vincular_request", url_name="vincular-request")
    def link_request(self, request, pk=None):
        payload = LinkRequestSerializer(data=request.data)
        payload.is_valid(raise_exception=True)

        checkin = self.get_object()
        self.execute_safely(
            handle_link_request_to_checkin,
            LinkRequestToCheckinCommand(
                checkin=checkin,
                tenant=self.get_tenant(),
                request_id=payload.validated_data["request_id"],
            ),
        )
        return Response(self.get_serializer(checkin).data)

    @action(detail=True, methods=["post"], url_path="vincular_invoice", url_name="vincular-invoice")
    def link_invoice(self, request, pk=None):
        payload = LinkInvoiceSerializer(data=request.data)
        payload.is_valid(raise_exception=True)

        checkin = self.get_object()
        self.execute_safely(
            handle_link_invoice_to_checkin,
            LinkInvoiceToCheckinCommand(
                checkin=checkin,
                tenant=self.get_tenant(),
                invoice_id=payload.validated_data["invoice_id"],
            ),
        )
        return Response(self.get_serializer(checkin).data)


class ReceptionCareViewSet(ValidatedSearchOrderingMixin, TenantAwareMixin, ViewSet):
    """Ações avulsas do fluxo de cuidado (pagar, criar requisição/fatura)."""
    http_method_names = ["get", "post"]

    @transaction.atomic
    @extend_schema(request=CareFlowCreateSerializer, responses={201: OpenApiTypes.OBJECT})
    def create(self, request):
        payload = CareFlowCreateSerializer(data=request.data)
        payload.is_valid(raise_exception=True)

        summary = self.execute_safely(
            handle_execute_full_flow,
            ExecuteFullFlowCommand(
                tenant=self.get_tenant(),
                user=request.user,
                **payload.validated_data,
            ),
        )
        return Response(summary, status=status.HTTP_201_CREATED)

    @extend_schema(
        parameters=[OpenApiParameter("id", OpenApiTypes.INT, OpenApiParameter.PATH, description="ID do check-in")],
        responses={200: OpenApiTypes.OBJECT},
    )
    def retrieve(self, request, pk=None):
        checkin = get_object_or_404(
            ReceptionCheckin.objects.filter(tenant=self.get_tenant()),
            pk=pk,
        )
        return Response(get_care_summary(checkin))


VIEWSET_MAP = {
    "atendimento": ReceptionCareViewSet,
    "checkin": ReceptionCheckinViewSet,
    "workspace": ReceptionWorkspaceViewSet,
}

__all__ = [
    "VIEWSET_MAP",
    "ReceptionCareViewSet",
    "ReceptionCheckinViewSet",
    "ReceptionWorkspaceViewSet",
]


