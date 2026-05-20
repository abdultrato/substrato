from rest_framework import serializers

from api.v1.compat import LegacyAliasSerializerMixin
from apps.accounting.models.account import Account
from apps.accounting.models.financial_reconciliation import FinancialReconciliation
from apps.accounting.models.legacy_entry import LegacyEntry
from apps.accounting.models.legacy_movement import LegacyMovement

CORE_READ_ONLY_FIELDS = (
    "id",
    "custom_id",
    "tenant",
    "created_by",
    "updated_by",
    "created_at",
    "updated_at",
    "deleted",
    "deleted_at",
    "deleted_by",
    "version",
)


class AccountSerializer(LegacyAliasSerializerMixin, serializers.ModelSerializer):
    legacy_input_aliases = {
        "nome": "name",
        "tipo": "type",
    }

    class Meta:
        model = Account
        fields = "__all__"
        read_only_fields = CORE_READ_ONLY_FIELDS


class LedgerEntrySerializer(LegacyAliasSerializerMixin, serializers.ModelSerializer):
    legacy_input_aliases = {
        "nome": "name",
        "descricao": "description",
        "descrição": "description",
        "data": "date",
        "referencia": "external_reference",
        "referência": "external_reference",
        "referencia_externa": "external_reference",
        "referência_externa": "external_reference",
        "confirmado": "confirmed",
    }

    class Meta:
        model = LegacyEntry
        fields = "__all__"
        read_only_fields = CORE_READ_ONLY_FIELDS


class LedgerMovementSerializer(LegacyAliasSerializerMixin, serializers.ModelSerializer):
    legacy_input_aliases = {
        "nome": "name",
        "lancamento": "entry",
        "lançamento": "entry",
        "conta": "account",
        "debito": "debit",
        "débito": "debit",
        "credito": "credit",
        "crédito": "credit",
    }

    class Meta:
        model = LegacyMovement
        fields = "__all__"
        read_only_fields = CORE_READ_ONLY_FIELDS


class FinancialReconciliationSerializer(LegacyAliasSerializerMixin, serializers.ModelSerializer):
    legacy_input_aliases = {
        "nome": "name",
        "fatura": "invoice",
        "factura": "invoice",
        "referencia": "external_reference",
        "referência": "external_reference",
        "referencia_externa": "external_reference",
        "referência_externa": "external_reference",
        "valor_contabil": "accounting_value",
        "valor_contábil": "accounting_value",
        "valor_recebido": "received_amount",
    }

    class Meta:
        model = FinancialReconciliation
        fields = "__all__"
        read_only_fields = CORE_READ_ONLY_FIELDS + ("discrepancy", "reconciled")


SERIALIZER_MAP = {
    "account": AccountSerializer,
    "conciliacaofinanceira": FinancialReconciliationSerializer,
    "entry": LedgerEntrySerializer,
    "movimento": LedgerMovementSerializer,
}
