from rest_framework import serializers

from api.v1.compat import LegacyAliasSerializerMixin
from apps.accounting.models.account import Account
from apps.accounting.models.bank_account import BankAccount
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

    # Saldo materializado (snapshot atualizado ao confirmar/reabrir lançamentos).
    current_balance = serializers.SerializerMethodField()

    def get_current_balance(self, obj):
        try:
            saldo = obj.saldo
        except Exception:
            return None
        return str(saldo.current_balance) if saldo is not None else None

    class Meta:
        model = Account
        fields = "__all__"
        read_only_fields = (*CORE_READ_ONLY_FIELDS, "current_balance")


class BankAccountSerializer(LegacyAliasSerializerMixin, serializers.ModelSerializer):
    legacy_input_aliases = {
        "banco": "bank_name",
        "numero": "account_number",
        "número": "account_number",
        "agencia": "branch",
        "agência": "branch",
        "titular": "holder_name",
        "moeda": "currency",
        "tipo": "kind",
        "ativa": "active",
        "saldo": "current_balance",
        "observacoes": "notes",
        "observações": "notes",
        "conta": "account",
    }

    account_name = serializers.CharField(source="account.name", read_only=True, default=None)

    class Meta:
        model = BankAccount
        fields = "__all__"
        read_only_fields = (*CORE_READ_ONLY_FIELDS, "account_name")


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

    account_name = serializers.CharField(source="account.name", read_only=True, default=None)
    account_type = serializers.CharField(source="account.type", read_only=True, default=None)
    entry_code = serializers.CharField(source="entry.custom_id", read_only=True, default=None)

    class Meta:
        model = LegacyMovement
        fields = "__all__"
        read_only_fields = (*CORE_READ_ONLY_FIELDS, "account_name", "account_type", "entry_code")


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

    invoice_code = serializers.CharField(source="invoice.custom_id", read_only=True, default=None)

    class Meta:
        model = FinancialReconciliation
        fields = "__all__"
        read_only_fields = (*CORE_READ_ONLY_FIELDS, "discrepancy", "reconciled", "invoice_code")


SERIALIZER_MAP = {
    "account": AccountSerializer,
    "conciliacaofinanceira": FinancialReconciliationSerializer,
    "entry": LedgerEntrySerializer,
    "movimento": LedgerMovementSerializer,
}
