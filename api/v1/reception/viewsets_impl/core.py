from django.core.exceptions import ValidationError as DjangoValidationError
from django.db import transaction
from django.shortcuts import get_object_or_404
from drf_spectacular.utils import OpenApiParameter, OpenApiTypes, extend_schema
from rest_framework import status
from rest_framework.decorators import action
from rest_framework.exceptions import ValidationError
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.viewsets import ModelViewSet, ViewSet

from api.v1.viewset_mixins import ValidatedSearchOrderingMixin
from application.reception.care_flow import (
    criar_invoice_para_checkin as create_invoice_for_checkin,
    criar_request_para_checkin as create_request_for_checkin,
    executar_fluxo_completo as execute_full_flow,
    obter_resumo_atendimento as get_care_summary,
    registrar_payment_para_checkin as register_payment_for_checkin,
)
from application.reception.get_workspace import execute as get_workspace_date
from apps.billing.models.invoice import Invoice
from apps.clinical.models.lab_request import LabRequest
from apps.reception.models.reception_checkin import ReceptionCheckin

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

    executar_seguro = execute_safely


class ReceptionWorkspaceViewSet(ValidatedSearchOrderingMixin, TenantAwareMixin, ViewSet):
    http_method_names = ["get"]

    @extend_schema(responses={200: OpenApiTypes.OBJECT})
    def list(self, request):
        return Response(get_workspace_date(self.get_tenant()))


class ReceptionCheckinViewSet(ValidatedSearchOrderingMixin, TenantAwareMixin, ModelViewSet):
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
        self.execute_safely(checkin.concluir)
        return Response(self.get_serializer(checkin).data)

    @action(detail=True, methods=["post"], url_path="cancelar", url_name="cancelar")
    def cancel(self, request, pk=None):
        checkin = self.get_object()
        self.execute_safely(checkin.cancelar)
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
            create_request_for_checkin,
            checkin=checkin,
            exam_ids=payload.validated_data["exams_ids"],
            clinical_status=payload.validated_data.get("clinical_status"),
        )
        return Response(get_care_summary(checkin))

    @transaction.atomic
    @action(detail=True, methods=["post"], url_path="criar_invoice", url_name="criar-invoice")
    def create_invoice(self, request, pk=None):
        payload = CreateReceptionInvoiceSerializer(data=request.data)
        payload.is_valid(raise_exception=True)

        checkin = self.get_object()
        self.execute_safely(
            create_invoice_for_checkin,
            checkin=checkin,
            issue=payload.validated_data.get("issue", True),
        )
        return Response(get_care_summary(checkin))

    @transaction.atomic
    @action(detail=True, methods=["post"], url_path="registrar_payment", url_name="registrar-payment")
    def register_payment(self, request, pk=None):
        payload = RegisterReceptionPaymentSerializer(data=request.data)
        payload.is_valid(raise_exception=True)

        checkin = self.get_object()
        self.execute_safely(
            register_payment_for_checkin,
            checkin=checkin,
            value=payload.validated_data.get("value"),
            method=payload.validated_data.get("method"),
            external_reference=payload.validated_data.get("external_reference", ""),
            insurer_id=payload.validated_data.get("insurer_id"),
            coverage_plan_id=payload.validated_data.get("coverage_plan_id"),
            authorization_number=payload.validated_data.get("authorization_number", ""),
            insurance_date=payload.validated_data.get("insurance_date"),
            confirm=payload.validated_data.get("confirm", True),
        )
        return Response(get_care_summary(checkin))

    @action(detail=True, methods=["post"], url_path="vincular_request", url_name="vincular-request")
    def link_request(self, request, pk=None):
        payload = LinkRequestSerializer(data=request.data)
        payload.is_valid(raise_exception=True)

        checkin = self.get_object()
        lab_request = get_object_or_404(
            LabRequest.objects.filter(tenant=self.get_tenant()),
            pk=payload.validated_data["request_id"],
        )

        self.execute_safely(checkin.register_request, lab_request)
        return Response(self.get_serializer(checkin).data)

    @action(detail=True, methods=["post"], url_path="vincular_invoice", url_name="vincular-invoice")
    def link_invoice(self, request, pk=None):
        payload = LinkInvoiceSerializer(data=request.data)
        payload.is_valid(raise_exception=True)

        checkin = self.get_object()
        invoice = get_object_or_404(
            Invoice.objects.filter(tenant=self.get_tenant()),
            pk=payload.validated_data["invoice_id"],
        )

        self.execute_safely(checkin.register_invoice, invoice)
        return Response(self.get_serializer(checkin).data)


class ReceptionCareViewSet(ValidatedSearchOrderingMixin, TenantAwareMixin, ViewSet):
    http_method_names = ["get", "post"]

    @transaction.atomic
    @extend_schema(request=CareFlowCreateSerializer, responses={201: OpenApiTypes.OBJECT})
    def create(self, request):
        payload = CareFlowCreateSerializer(data=request.data)
        payload.is_valid(raise_exception=True)

        summary = self.execute_safely(
            execute_full_flow,
            tenant=self.get_tenant(),
            user=request.user,
            **payload.validated_data,
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


WorkspaceRecepcaoViewSet = ReceptionWorkspaceViewSet
CheckinRecepcaoViewSet = ReceptionCheckinViewSet
AtendimentoRecepcaoViewSet = ReceptionCareViewSet
