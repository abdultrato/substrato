from rest_framework.permissions import IsAuthenticated  # Protege endpoints
from rest_framework.viewsets import ModelViewSet  # CRUD base DRF

from api.v1.viewset_mixins import TenantScopedQuerysetMixin, ValidatedSearchOrderingMixin
from apps.maternity.models.pregnancy import Pregnancy

from ..filters import PregnancyFilter
from ..serializers import PregnancySerializer


class PregnancyViewSet(ValidatedSearchOrderingMixin, TenantScopedQuerysetMixin, ModelViewSet):
    queryset = Pregnancy.objects.select_related("patient", "responsible_doctor").all()
    serializer_class = PregnancySerializer
    filterset_class = PregnancyFilter
    permission_classes = [IsAuthenticated]
    search_fields = [
        "custom_id",
        "patient__name",
        "patient__document_number",
        "responsible_doctor__name",
        "responsible_doctor__document_number",
        "nursery",
        "maternity_bed",
        "notes",
    ]
    ordering_fields = [
        "created_at",
        "updated_at",
        "status",
        "expected_delivery_date",
        "last_menstrual_period_date",
        "total_deliveries",
        "normal_deliveries",
        "cesareans",
    ]
    ordering = ["-created_at", "-id"]


VIEWSET_MAP = {
    "gestacao": PregnancyViewSet,
}

__all__ = [
    "VIEWSET_MAP",
    "PregnancyViewSet",
]

