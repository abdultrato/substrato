from api.core.filters import SafeFilterSet  # Base com saneamento
from apps.maternity.models.pregnancy import Pregnancy


class PregnancyFilter(SafeFilterSet):
    class Meta:
        model = Pregnancy
        fields = [
            "patient",
            "responsible_doctor",
            "status",
            "expected_delivery_date",
            "created_at",
        ]


FILTER_MAP = {
    "gestacao": PregnancyFilter,
}

