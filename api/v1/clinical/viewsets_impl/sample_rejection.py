from rest_framework.permissions import IsAuthenticated
from rest_framework.viewsets import ModelViewSet

from api.v1.viewset_mixins import TenantScopedQuerysetMixin, ValidatedSearchOrderingMixin
from apps.clinical.models.sample_rejection import SampleRejectionRecord, SampleRejectionReason

from ..serializers import SampleRejectionReasonSerializer, SampleRejectionSerializer


class SampleRejectionReasonViewSet(ValidatedSearchOrderingMixin, TenantScopedQuerysetMixin, ModelViewSet):
    """Catálogo de motivos de rejeição de amostra (receção do laboratório)."""

    queryset = SampleRejectionReason.objects.all()
    serializer_class = SampleRejectionReasonSerializer
    permission_classes = [IsAuthenticated]
    search_fields = ["custom_id", "name", "code"]
    ordering_fields = ["name", "code", "active", "created_at"]
    ordering = ["name"]

    def get_queryset(self):
        qs = super().get_queryset()
        tenant = getattr(self.request, "tenant", None)
        # Garante o catálogo padrão para tenants criados após a seed migration.
        if tenant is not None and not qs.exists():
            for code, name in SampleRejectionReason.Code.choices:
                SampleRejectionReason.objects.get_or_create(tenant=tenant, code=code, defaults={"name": name})
            qs = super().get_queryset()
        return qs


class SampleRejectionViewSet(ValidatedSearchOrderingMixin, TenantScopedQuerysetMixin, ModelViewSet):
    """Registos de rejeição de amostra (pendentes vs resolvidas)."""

    queryset = SampleRejectionRecord.objects.all()
    serializer_class = SampleRejectionSerializer
    permission_classes = [IsAuthenticated]
    filterset_fields = ["status", "request"]
    search_fields = ["custom_id", "request__custom_id", "request__patient__name", "reasons_text", "note"]
    ordering_fields = ["created_at", "resolved_at", "status"]
    ordering = ["-created_at", "-id"]

    def get_queryset(self):
        return (
            super()
            .get_queryset()
            .select_related("request", "request__patient", "request_item", "request_item__exam", "request_item__medical_exam")
        )
