from rest_framework.permissions import IsAuthenticated
from rest_framework.viewsets import ModelViewSet

from api.v1.viewset_mixins import TenantScopedQuerysetMixin, ValidatedSearchOrderingMixin
from apps.clinical.models.sample_rejection import SampleRejectionReason

from ..serializers import SampleRejectionReasonSerializer


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
