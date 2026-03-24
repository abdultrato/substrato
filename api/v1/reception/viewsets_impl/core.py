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
from application.reception.fluxo_atendimento import (
    criar_fatura_para_checkin,
    criar_requisicao_para_checkin,
    executar_fluxo_completo,
    obter_resumo_atendimento,
    registrar_pagamento_para_checkin,
)
from application.reception.obter_area_trabalho import executar as obter_area_trabalho
from apps.clinical.models.lab_request import LabRequest
from apps.billing.models.invoice import Invoice
from apps.reception.models.checkin_recepcao import CheckinRecepcao

from ..filters import CheckinRecepcaoFilter
from ..serializers import (
    CheckinRecepcaoSerializer,
    CriarFaturaRecepcaoSerializer,
    CriarRequisicaoRecepcaoSerializer,
    FluxoAtendimentoCreateSerializer,
    RegistrarPagamentoRecepcaoSerializer,
    VincularFaturaSerializer,
    VincularRequisicaoSerializer,
)


class TenantAwareMixin:
    permission_classes = [IsAuthenticated]

    def get_inquilino(self):
        inquilino = getattr(self.request, "inquilino", None)
        if inquilino is None:
            raise ValidationError("Tenant não identificado na requisição.")
        return inquilino

    def executar_seguro(self, func, *args, **kwargs):
        try:
            return func(*args, **kwargs)
        except DjangoValidationError as exc:
            if hasattr(exc, "message_dict"):
                raise ValidationError(exc.message_dict) from exc
            if hasattr(exc, "messages"):
                raise ValidationError(exc.messages) from exc
            raise ValidationError(str(exc)) from exc


class WorkspaceRecepcaoViewSet(ValidatedSearchOrderingMixin, TenantAwareMixin, ViewSet):
    http_method_names = ["get"]

    @extend_schema(responses={200: OpenApiTypes.OBJECT})
    def list(self, request):
        return Response(obter_area_trabalho(self.get_inquilino()))


class CheckinRecepcaoViewSet(ValidatedSearchOrderingMixin, TenantAwareMixin, ModelViewSet):
    queryset = CheckinRecepcao.objects.select_related(
        "paciente",
        "requisicao",
        "fatura",
        "atendente",
    ).all()
    serializer_class = CheckinRecepcaoSerializer
    filterset_class = CheckinRecepcaoFilter
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
        return super().get_queryset().filter(inquilino=self.get_inquilino())

    @transaction.atomic
    def perform_create(self, serializer):
        serializer.save(
            inquilino=self.get_inquilino(),
            criado_por=self.request.user,
            atualizado_por=self.request.user,
        )

    @transaction.atomic
    def perform_update(self, serializer):
        serializer.save(atualizado_por=self.request.user)

    @action(detail=True, methods=["post"])
    def iniciar_atendimento(self, request, pk=None):
        checkin = self.get_object()
        self.executar_seguro(checkin.iniciar_atendimento, atendente=request.user)
        return Response(self.get_serializer(checkin).data)

    @action(detail=True, methods=["post"])
    def concluir(self, request, pk=None):
        checkin = self.get_object()
        self.executar_seguro(checkin.concluir)
        return Response(self.get_serializer(checkin).data)

    @action(detail=True, methods=["post"])
    def cancelar(self, request, pk=None):
        checkin = self.get_object()
        self.executar_seguro(checkin.cancelar)
        return Response(self.get_serializer(checkin).data)

    @action(detail=True, methods=["get"])
    def atendimento(self, request, pk=None):
        checkin = self.get_object()
        return Response(obter_resumo_atendimento(checkin))

    @transaction.atomic
    @action(detail=True, methods=["post"])
    def criar_requisicao(self, request, pk=None):
        payload = CriarRequisicaoRecepcaoSerializer(data=request.data)
        payload.is_valid(raise_exception=True)

        checkin = self.get_object()
        self.executar_seguro(
            criar_requisicao_para_checkin,
            checkin=checkin,
            exame_ids=payload.validated_data["exames_ids"],
            status_clinico=payload.validated_data.get("status_clinico"),
        )
        return Response(obter_resumo_atendimento(checkin))

    @transaction.atomic
    @action(detail=True, methods=["post"])
    def criar_fatura(self, request, pk=None):
        payload = CriarFaturaRecepcaoSerializer(data=request.data)
        payload.is_valid(raise_exception=True)

        checkin = self.get_object()
        self.executar_seguro(
            criar_fatura_para_checkin,
            checkin=checkin,
            emitir=payload.validated_data.get("emitir", True),
        )
        return Response(obter_resumo_atendimento(checkin))

    @transaction.atomic
    @action(detail=True, methods=["post"])
    def registrar_pagamento(self, request, pk=None):
        payload = RegistrarPagamentoRecepcaoSerializer(data=request.data)
        payload.is_valid(raise_exception=True)

        checkin = self.get_object()
        self.executar_seguro(
            registrar_pagamento_para_checkin,
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
        return Response(obter_resumo_atendimento(checkin))

    @action(detail=True, methods=["post"])
    def vincular_requisicao(self, request, pk=None):
        payload = VincularRequisicaoSerializer(data=request.data)
        payload.is_valid(raise_exception=True)

        checkin = self.get_object()
        requisicao = get_object_or_404(
            LabRequest.objects.filter(inquilino=self.get_inquilino()),
            pk=payload.validated_data["requisicao_id"],
        )

        self.executar_seguro(checkin.registrar_requisicao, requisicao)
        return Response(self.get_serializer(checkin).data)

    @action(detail=True, methods=["post"])
    def vincular_fatura(self, request, pk=None):
        payload = VincularFaturaSerializer(data=request.data)
        payload.is_valid(raise_exception=True)

        checkin = self.get_object()
        fatura = get_object_or_404(
            Invoice.objects.filter(inquilino=self.get_inquilino()),
            pk=payload.validated_data["fatura_id"],
        )

        self.executar_seguro(checkin.registrar_fatura, fatura)
        return Response(self.get_serializer(checkin).data)


class AtendimentoRecepcaoViewSet(ValidatedSearchOrderingMixin, TenantAwareMixin, ViewSet):
    http_method_names = ["get", "post"]

    @transaction.atomic
    @extend_schema(request=FluxoAtendimentoCreateSerializer, responses={201: OpenApiTypes.OBJECT})
    def create(self, request):
        payload = FluxoAtendimentoCreateSerializer(data=request.data)
        payload.is_valid(raise_exception=True)

        resumo = self.executar_seguro(
            executar_fluxo_completo,
            inquilino=self.get_inquilino(),
            usuario=request.user,
            **payload.validated_data,
        )
        return Response(resumo, status=status.HTTP_201_CREATED)

    @extend_schema(
        parameters=[OpenApiParameter("id", OpenApiTypes.INT, OpenApiParameter.PATH, description="ID do check-in")],
        responses={200: OpenApiTypes.OBJECT},
    )
    def retrieve(self, request, pk=None):
        checkin = get_object_or_404(
            CheckinRecepcao.objects.filter(inquilino=self.get_inquilino()),
            pk=pk,
        )
        return Response(obter_resumo_atendimento(checkin))


VIEWSET_MAP = {
    "atendimento": AtendimentoRecepcaoViewSet,
    "checkin": CheckinRecepcaoViewSet,
    "workspace": WorkspaceRecepcaoViewSet,
}

__all__ = [
    "VIEWSET_MAP",
    "AtendimentoRecepcaoViewSet",
    "CheckinRecepcaoViewSet",
    "WorkspaceRecepcaoViewSet",
]
