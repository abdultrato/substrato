from rest_framework import serializers

from apps.accounting.models.financial_reconciliation import FinancialReconciliation
from apps.accounting.models.account import Account
from apps.accounting.models.legacy_entry import LegacyEntry
from apps.accounting.models.legacy_movement import LegacyMovement

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


class AccountSerializer(serializers.ModelSerializer):
    class Meta:
        model = Account
        fields = "__all__"
        read_only_fields = CORE_READ_ONLY_FIELDS


class LedgerEntrySerializer(serializers.ModelSerializer):
    class Meta:
        model = LegacyEntry
        fields = "__all__"
        read_only_fields = CORE_READ_ONLY_FIELDS


class LedgerMovementSerializer(serializers.ModelSerializer):
    class Meta:
        model = LegacyMovement
        fields = "__all__"
        read_only_fields = CORE_READ_ONLY_FIELDS


class FinancialReconciliationSerializer(serializers.ModelSerializer):
    class Meta:
        model = FinancialReconciliation
        fields = "__all__"
        read_only_fields = (
            "criado_em",
            "valor_registrado",
            "divergencia",
            "conciliado",
        )


SERIALIZER_MAP = {
    "conta": AccountSerializer,
    "conciliacaofinanceira": FinancialReconciliationSerializer,
    "lancamento": LedgerEntrySerializer,
    "movimento": LedgerMovementSerializer,
}
