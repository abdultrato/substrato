from rest_framework import serializers

from aplicativos.contabilidade.modelos.conciliacao import ConciliacaoFinanceira
from aplicativos.contabilidade.modelos.contas import Conta
from aplicativos.contabilidade.modelos.lancamento import Lancamento
from aplicativos.contabilidade.modelos.movimento import Movimento

CORE_READ_ONLY_FIELDS = (
    "id_custom",
    "inquilino",
    "criado_por",
    "atualizado_por",
    "criado_em",
    "atualizado_em",
    "deletado",
    "deletado_em",
)


class ContaSerializer(serializers.ModelSerializer):
    class Meta:
        model = Conta
        fields = "__all__"
        read_only_fields = CORE_READ_ONLY_FIELDS


class LancamentoSerializer(serializers.ModelSerializer):
    class Meta:
        model = Lancamento
        fields = "__all__"
        read_only_fields = CORE_READ_ONLY_FIELDS


class MovimentoSerializer(serializers.ModelSerializer):
    class Meta:
        model = Movimento
        fields = "__all__"
        read_only_fields = CORE_READ_ONLY_FIELDS


class ConciliacaoFinanceiraSerializer(serializers.ModelSerializer):
    class Meta:
        model = ConciliacaoFinanceira
        fields = "__all__"
        read_only_fields = (
            "criado_em",
            "valor_registrado",
            "divergencia",
            "conciliado",
        )


SERIALIZER_MAP = {
    "conta": ContaSerializer,
    "conciliacaofinanceira": ConciliacaoFinanceiraSerializer,
    "lancamento": LancamentoSerializer,
    "movimento": MovimentoSerializer,
}
