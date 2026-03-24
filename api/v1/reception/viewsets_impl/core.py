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
    criar_fatura_para_checkin as create_invoice_for_checkin,
    criar_requisicao_para_checkin as create_request_for_checkin,
    executar_fluxo_completo as execute_full_flow,
    obter_resumo_atendimento as get_care_summary,
    registrar_pagamento_para_checkin as register_payment_for_checkin,
)
from application.reception.get_workspace import execute as get_workspace_data
from apps.clinical.models.lab_request import LabRequest
from apps.billing.models.invoice import Invoice
from apps.reception.models.checkin_recepcao import CheckinRecepcao

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
        tenant = getattr(self.request, "inquilino", None)
        if tenant is None:
            raise ValidationError("Tenant não identificado na requisição.")
        return tenant

    get_inquilino = get_tenant

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
        return Response(get_workspace_data(self.get_tenant()))


class ReceptionCheckinViewSet(ValidatedSearchOrderingMixin, TenantAwareMixin, ModelViewSet):
    queryset = CheckinRecepcao.objects.select_related(
        "paciente",
        "requisicao",
        "fatura",
        "atendente",
    ).all()
    serializer_class = ReceptionCheckinSerializer
    filterset_class = ReceptionCheckinFilter
    search_fields = [
        "id_custom",
        "paciente__id_custom",
        "paciente__nome",
        "motivo",
        "observacoes",
    ]
    ordering_fields = [
        "id_custom",
        "prioridade",
        "estado",
        "chegou_em",
        "chamado_em",
        "concluido_em",
        "criado_em",
    ]
    ordering = ["-chegou_em"]

    def get_queryset(self):
        return super().get_queryset().filter(inquilino=self.get_tenant())

    @transaction.atomic
    def perform_create(self, serializer):
        serializer.save(
            inquilino=self.get_tenant(),
            criado_por=self.request.user,
            atualizado_por=self.request.user,
        )

    @transaction.atomic
    def perform_update(self, serializer):
        serializer.save(atualizado_por=self.request.user)

    @action(detail=True, methods=["post"], url_path="iniciar_atendimento", url_name="iniciar-atendimento")
    def start_care(self, request, pk=None):
        checkin = self.get_object()
        self.execute_safely(checkin.iniciar_atendimento, atendente=request.user)
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
    @action(detail=True, methods=["post"], url_path="criar_requisicao", url_name="criar-requisicao")
    def create_request(self, request, pk=None):
        payload = CreateReceptionRequestSerializer(data=request.data)
        payload.is_valid(raise_exception=True)

        checkin = self.get_object()
        self.execute_safely(
            create_request_for_checkin,
            checkin=checkin,
            exame_ids=payload.validated_data["exames_ids"],
            status_clinico=payload.validated_data.get("status_clinico"),
        )
        return Response(get_care_summary(checkin))

    @transaction.atomic
    @action(detail=True, methods=["post"], url_path="criar_fatura", url_name="criar-fatura")
    def create_invoice(self, request, pk=None):
        payload = CreateReceptionInvoiceSerializer(data=request.data)
        payload.is_valid(raise_exception=True)

        checkin = self.get_object()
        self.execute_safely(
            create_invoice_for_checkin,
            checkin=checkin,
            emitir=payload.validated_data.get("emitir", True),
        )
        return Response(get_care_summary(checkin))

    @transaction.atomic
    @action(detail=True, methods=["post"], url_path="registrar_pagamento", url_name="registrar-pagamento")
    def register_payment(self, request, pk=None):
        payload = RegisterReceptionPaymentSerializer(data=request.data)
        payload.is_valid(raise_exception=True)

        checkin = self.get_object()
        self.execute_safely(
            register_payment_for_checkin,
            checkin=checkin,
            valor=payload.validated_data.get("valor"),
            metodo=payload.validated_data.get("metodo"),
            referencia_externa=payload.validated_data.get("referencia_externa", ""),
            seguradora_id=payload.validated_data.get("seguradora_id"),
            plano_cobertura_id=payload.validated_data.get("plano_cobertura_id"),
            numero_autorizacao=payload.validated_data.get("numero_autorizacao", ""),
            dados_seguro=payload.validated_data.get("dados_seguro"),
            confirmar=payload.validated_data.get("confirmar", True),
        )
        return Response(get_care_summary(checkin))

    @action(detail=True, methods=["post"], url_path="vincular_requisicao", url_name="vincular-requisicao")
    def link_request(self, request, pk=None):
        payload = LinkRequestSerializer(data=request.data)
        payload.is_valid(raise_exception=True)

        checkin = self.get_object()
        lab_request = get_object_or_404(
            LabRequest.objects.filter(inquilino=self.get_tenant()),
            pk=payload.validated_data["requisicao_id"],
        )

        self.execute_safely(checkin.registrar_requisicao, lab_request)
        return Response(self.get_serializer(checkin).data)

    @action(detail=True, methods=["post"], url_path="vincular_fatura", url_name="vincular-fatura")
    def link_invoice(self, request, pk=None):
        payload = LinkInvoiceSerializer(data=request.data)
        payload.is_valid(raise_exception=True)

        checkin = self.get_object()
        invoice = get_object_or_404(
            Invoice.objects.filter(inquilino=self.get_tenant()),
            pk=payload.validated_data["fatura_id"],
        )

        self.execute_safely(checkin.registrar_fatura, invoice)
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
            inquilino=self.get_tenant(),
            usuario=request.user,
            **payload.validated_data,
        )
        return Response(summary, status=status.HTTP_201_CREATED)

    @extend_schema(
        parameters=[OpenApiParameter("id", OpenApiTypes.INT, OpenApiParameter.PATH, description="ID do check-in")],
        responses={200: OpenApiTypes.OBJECT},
    )
    def retrieve(self, request, pk=None):
        checkin = get_object_or_404(
            CheckinRecepcao.objects.filter(inquilino=self.get_tenant()),
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
