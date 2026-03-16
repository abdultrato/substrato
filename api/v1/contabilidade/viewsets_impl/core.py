from django.db import transaction
from rest_framework.exceptions import ValidationError
from rest_framework.permissions import IsAuthenticated
from rest_framework.viewsets import ModelViewSet

from api.v1.viewset_mixins import ValidatedSearchOrderingMixin
from aplicativos.contabilidade.modelos.conciliacao import ConciliacaoFinanceira
from aplicativos.contabilidade.modelos.contas import Conta
from aplicativos.contabilidade.modelos.lancamento import Lancamento
from aplicativos.contabilidade.modelos.movimento import Movimento

from ..filters import (
    ConciliacaoFinanceiraFilter,
    ContaFilter,
    LancamentoFilter,
    MovimentoFilter,
)
from ..serializers import (
    ConciliacaoFinanceiraSerializer,
    ContaSerializer,
    LancamentoSerializer,
    MovimentoSerializer,
)


class TenantOwnedViewSet(ValidatedSearchOrderingMixin, ModelViewSet):
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        queryset = super().get_queryset()
        inquilino = getattr(self.request, "inquilino", None)
        if inquilino is not None and hasattr(queryset.model, "inquilino_id"):
            queryset = queryset.filter(inquilino=inquilino)
        return queryset

    def _build_owner_fields(self):
        inquilino = getattr(self.request, "inquilino", None)
        if inquilino is None and hasattr(self.queryset.model, "inquilino_id"):
            raise ValidationError("Tenant não identificado na requisição.")

        payload = {}
        if hasattr(self.queryset.model, "inquilino_id"):
            payload["inquilino"] = inquilino
        if hasattr(self.queryset.model, "criado_por_id"):
            payload["criado_por"] = self.request.user
        if hasattr(self.queryset.model, "atualizado_por_id"):
            payload["atualizado_por"] = self.request.user
        return payload

    @transaction.atomic
    def perform_create(self, serializer):
        serializer.save(**self._build_owner_fields())

    @transaction.atomic
    def perform_update(self, serializer):
        payload = {}
        if hasattr(self.queryset.model, "atualizado_por_id"):
            payload["atualizado_por"] = self.request.user
        serializer.save(**payload)


class ContaViewSet(TenantOwnedViewSet):
    queryset = Conta.objects.all()
    serializer_class = ContaSerializer
    filterset_class = ContaFilter
    search_fields = ["id_custom", "nome", "tipo"]
    ordering_fields = [
        "id_custom",
        "nome",
        "tipo",
        "saldo",
        "criado_em",
        "atualizado_em",
    ]
    ordering = ["-criado_em"]


class LancamentoViewSet(TenantOwnedViewSet):
    queryset = Lancamento.objects.all()
    serializer_class = LancamentoSerializer
    filterset_class = LancamentoFilter
    search_fields = ["id_custom", "nome", "descricao", "referencia_externa"]
    ordering_fields = [
        "id_custom",
        "nome",
        "data",
        "confirmado",
        "criado_em",
        "atualizado_em",
    ]
    ordering = ["-criado_em"]


class MovimentoViewSet(TenantOwnedViewSet):
    queryset = Movimento.objects.select_related("conta", "lancamento").all()
    serializer_class = MovimentoSerializer
    filterset_class = MovimentoFilter
    search_fields = ["id_custom", "nome", "conta__id_custom"]
    ordering_fields = [
        "id_custom",
        "nome",
        "debito",
        "credito",
        "criado_em",
        "atualizado_em",
    ]
    ordering = ["-criado_em"]

    def perform_create(self, serializer):
        lancamento = serializer.validated_data.get("lancamento")
        conta = serializer.validated_data.get("conta")
        inquilino = getattr(self.request, "inquilino", None)

        if inquilino is None:
            raise ValidationError("Tenant não identificado na requisição.")
        if lancamento and lancamento.inquilino_id != inquilino.id:
            raise ValidationError("Lançamento não pertence ao tenant atual.")
        if conta and conta.inquilino_id != inquilino.id:
            raise ValidationError("Conta não pertence ao tenant atual.")

        serializer.save(
            inquilino=inquilino,
            criado_por=self.request.user,
            atualizado_por=self.request.user,
        )

    def perform_update(self, serializer):
        lancamento = serializer.validated_data.get("lancamento", serializer.instance.lancamento)
        conta = serializer.validated_data.get("conta", serializer.instance.conta)
        inquilino = getattr(self.request, "inquilino", None)

        if inquilino is None:
            raise ValidationError("Tenant não identificado na requisição.")
        if lancamento and lancamento.inquilino_id != inquilino.id:
            raise ValidationError("Lançamento não pertence ao tenant atual.")
        if conta and conta.inquilino_id != inquilino.id:
            raise ValidationError("Conta não pertence ao tenant atual.")

        serializer.save(atualizado_por=self.request.user)


class ConciliacaoFinanceiraViewSet(TenantOwnedViewSet):
    queryset = ConciliacaoFinanceira.objects.select_related("fatura").all()
    serializer_class = ConciliacaoFinanceiraSerializer
    filterset_class = ConciliacaoFinanceiraFilter
    search_fields = ["fatura__id_custom"]
    ordering_fields = ["fatura", "conciliado", "criado_em"]
    ordering = ["-criado_em"]

    def get_queryset(self):
        queryset = super().get_queryset()
        inquilino = getattr(self.request, "inquilino", None)
        if inquilino is not None:
            queryset = queryset.filter(fatura__inquilino=inquilino)
        return queryset


VIEWSET_MAP = {
    "conciliacaofinanceira": ConciliacaoFinanceiraViewSet,
    "conta": ContaViewSet,
    "lancamento": LancamentoViewSet,
    "movimento": MovimentoViewSet,
}

__all__ = [
    "VIEWSET_MAP",
    "ConciliacaoFinanceiraViewSet",
    "ContaViewSet",
    "LancamentoViewSet",
    "MovimentoViewSet",
]
