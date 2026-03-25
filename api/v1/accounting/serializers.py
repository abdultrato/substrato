from rest_framework import serializers

from apps.accounting.models.account import Account
from apps.accounting.models.financial_reconciliation import FinancialReconciliation
from apps.accounting.models.legacy_entry import LegacyEntry
from apps.accounting.models.legacy_movement import LegacyMovement

CORE_READ_ONLY_FIELDS = (
    "custom_id",
    "tenant",
    "created_by",
    "updated_by",
    "created_at",
    "updated_at",
    "deleted",
    "deleted_at",
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
            "created_at",
            "value_registrado",
            "discrepancy",
            "reconciled",
        )


SERIALIZER_MAP = {
    "account": AccountSerializer,
    "conciliacaofinanceira": FinancialReconciliationSerializer,
    "entry": LedgerEntrySerializer,
    "movimento": LedgerMovementSerializer,
}
