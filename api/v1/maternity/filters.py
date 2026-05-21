from api.core.filters import SafeFilterSet  # Base com saneamento
from apps.maternity.models.pregnancy import Pregnancy


class PregnancyFilter(SafeFilterSet):
    class Meta:
        model = Pregnancy
        fields = [
            "tenant",
            "custom_id",
            "deleted",
            "deleted_at",
            "created_by",
            "updated_by",
            "patient",
            "responsible_doctor",
            "last_menstrual_period_date",
            "status",
            "nursery",
            "maternity_bed",
            "expected_delivery_date",
            "created_at",
            "updated_at",
        ]


FILTER_MAP = {
    "gestacao": PregnancyFilter,
}

