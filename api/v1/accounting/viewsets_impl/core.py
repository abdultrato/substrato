from django.db import transaction
from rest_framework.exceptions import ValidationError
from rest_framework.permissions import IsAuthenticated
from rest_framework.viewsets import ModelViewSet

from api.v1.viewset_mixins import ValidatedSearchOrderingMixin
from apps.accounting.models.account import Account
from apps.accounting.models.financial_reconciliation import FinancialReconciliation
from apps.accounting.models.legacy_entry import LegacyEntry
from apps.accounting.models.legacy_movement import LegacyMovement

from ..filters import (
    AccountFilter,
    FinancialReconciliationFilter,
    LedgerEntryFilter,
    LedgerMovementFilter,
)
from ..serializers import (
    AccountSerializer,
    FinancialReconciliationSerializer,
    LedgerEntrySerializer,
    LedgerMovementSerializer,
)


class TenantOwnedViewSet(ValidatedSearchOrderingMixin, ModelViewSet):
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        queryset = super().get_queryset()
        tenant = getattr(self.request, "tenant", None)
        if tenant is not None and hasattr(queryset.model, "tenant_id"):
            queryset = queryset.filter(tenant=tenant)
        return queryset

    def _build_owner_fields(self):
        tenant = getattr(self.request, "tenant", None)
        if tenant is None and hasattr(self.queryset.model, "tenant_id"):
            raise ValidationError("Tenant não identificado na requisição.")

        payload = {}
        if hasattr(self.queryset.model, "tenant_id"):
            payload["tenant"] = tenant
        if hasattr(self.queryset.model, "created_by_id"):
            payload["created_by"] = self.request.user
        if hasattr(self.queryset.model, "updated_by_id"):
            payload["updated_by"] = self.request.user
        return payload

    @transaction.atomic
    def perform_create(self, serializer):
        serializer.save(**self._build_owner_fields())

    @transaction.atomic
    def perform_update(self, serializer):
        payload = {}
        if hasattr(self.queryset.model, "updated_by_id"):
            payload["updated_by"] = self.request.user
        serializer.save(**payload)


class AccountViewSet(TenantOwnedViewSet):
    queryset = Account.objects.all()
    serializer_class = AccountSerializer
    filterset_class = AccountFilter
    search_fields = ["custom_id", "name", "type"]
    ordering_fields = [
        "custom_id",
        "name",
        "type",
        "saldo",
        "created_at",
        "updated_at",
    ]
    ordering = ["-created_at"]


class LedgerEntryViewSet(TenantOwnedViewSet):
    queryset = LegacyEntry.objects.all()
    serializer_class = LedgerEntrySerializer
    filterset_class = LedgerEntryFilter
    search_fields = ["custom_id", "name", "description", "external_reference"]
    ordering_fields = [
        "custom_id",
        "name",
        "date",
        "confirmed",
        "created_at",
        "updated_at",
    ]
    ordering = ["-created_at"]


class LedgerMovementViewSet(TenantOwnedViewSet):
    queryset = LegacyMovement.objects.select_related("account", "entry").all()
    serializer_class = LedgerMovementSerializer
    filterset_class = LedgerMovementFilter
    search_fields = ["custom_id", "name", "account__custom_id"]
    ordering_fields = [
        "custom_id",
        "name",
        "debit",
        "credit",
        "created_at",
        "updated_at",
    ]
    ordering = ["-created_at"]

    def perform_create(self, serializer):
        entry = serializer.validated_data.get("entry")
        account = serializer.validated_data.get("account")
        tenant = getattr(self.request, "tenant", None)

        if tenant is None:
            raise ValidationError("Tenant não identificado na requisição.")
        if entry and entry.tenant_id != tenant.id:
            raise ValidationError("Lançamento não pertence ao tenant atual.")
        if account and account.tenant_id != tenant.id:
            raise ValidationError("Conta não pertence ao tenant atual.")

        serializer.save(
            tenant=tenant,
            created_by=self.request.user,
            updated_by=self.request.user,
        )

    def perform_update(self, serializer):
        entry = serializer.validated_data.get("entry", serializer.instance.entry)
        account = serializer.validated_data.get("account", serializer.instance.account)
        tenant = getattr(self.request, "tenant", None)

        if tenant is None:
            raise ValidationError("Tenant não identificado na requisição.")
        if entry and entry.tenant_id != tenant.id:
            raise ValidationError("Lançamento não pertence ao tenant atual.")
        if account and account.tenant_id != tenant.id:
            raise ValidationError("Conta não pertence ao tenant atual.")

        serializer.save(updated_by=self.request.user)


class FinancialReconciliationViewSet(TenantOwnedViewSet):
    queryset = FinancialReconciliation.objects.select_related("invoice").all()
    serializer_class = FinancialReconciliationSerializer
    filterset_class = FinancialReconciliationFilter
    search_fields = ["invoice__custom_id"]
    ordering_fields = ["invoice", "reconciled", "created_at"]
    ordering = ["-created_at"]

    def get_queryset(self):
        queryset = super().get_queryset()
        tenant = getattr(self.request, "tenant", None)
        if tenant is not None:
            queryset = queryset.filter(invoice__tenant=tenant)
        return queryset


VIEWSET_MAP = {
    "conciliacaofinanceira": FinancialReconciliationViewSet,
    "account": AccountViewSet,
    "entry": LedgerEntryViewSet,
    "movimento": LedgerMovementViewSet,
}

__all__ = [
    "VIEWSET_MAP",
    "AccountViewSet",
    "FinancialReconciliationViewSet",
    "LedgerEntryViewSet",
    "LedgerMovementViewSet",
]
