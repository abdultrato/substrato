from api.core.filters import SafeFilterSet
from apps.reception.models.reception_checkin import ReceptionCheckin


class ReceptionCheckinFilter(SafeFilterSet):
    class Meta:
        model = ReceptionCheckin
        fields = [
            "tenant",
            "patient",
            "request",
            "invoice",
            "attendant",
            "priority",
            "status",
            "arrived_at",
            "called_at",
            "completed_at",
            "created_at",
        ]


FILTER_MAP = {
    "checkin": ReceptionCheckinFilter,
}


CheckinRecepcaoFilter = ReceptionCheckinFilter
