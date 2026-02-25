from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from frontend.api.serializers import (
    RequisicaoCreateSerializer as rcs,
    RequisicaoDetailSerializer as rds,
    RequisicaoListSerializer as rls,
    RequisicaoUpdateSerializer as rus,
)
from frontend.billing.models import RequisicaoAnalise as rq

from .permissions import (
    IsAdmin,
    IsAdminTech,
    IsLabTechnician,
    IsMedico,
    IsNurse,
    IsRecepcionista,
)


class RequisicaoViewSet(viewsets.ModelViewSet):
    queryset = rq.objects.prefetch_related(
        "itens",
        "exames",
        "resultados",
    ).select_related("paciente")

    permission_classes = [IsAuthenticated]

    # =========================
    # SERIALIZERS
    # =========================

    def get_serializer_class(self):
        if self.action == "list":
            return rls
        if self.action == "retrieve":
            return rds
        if self.action == "create":
            return rcs
        if self.action in ["update", "partial_update"]:
            return rus
        return rds

    # =========================
    # PERMISSIONS
    # =========================

    def get_permissions(self):

        # criação / edição / exclusão
        if self.action in ["create", "update", "partial_update", "destroy"]:
            return [IsAdmin()]

        # visualização
        if self.action in ["list", "retrieve"]:
            return [IsAdmin() | IsRecepcionista() | IsAdminTech() | IsMedico() | IsNurse() | IsLabTechnician()]

        # validar resultados
        if self.action == "validar_resultados":
            return [IsLabTechnician() | IsAdmin()]

        # cancelar requisição
        if self.action == "cancelar":
            return [IsAdmin() | IsAdminTech()]

        return super().get_permissions()

    # =========================
    # VALIDAR RESULTADOS
    # =========================

    @action(detail=True, methods=["post"])
    def validar_resultados(self, request, pk=None):
        requisicao = self.get_object()
        requisicao.resultados.update(validado=True)
        requisicao.status = "VAL"
        requisicao.save(update_fields=["status"])

        return Response({"status": "resultados validados"})

    # =========================
    # CANCELAR
    # =========================

    @action(detail=True, methods=["post"])
    def cancelar(self, request, pk=None):
        requisicao = self.get_object()
        requisicao.status = "CANCELADO"
        requisicao.save(update_fields=["status"])

        return Response({"status": "requisição cancelada"})
