from api.core.filters import SafeFilterSet
from apps.surgery.models.surgery import Surgery
from apps.surgery.models.surgical_procedure import SurgicalProcedure


class SurgeryFilter(SafeFilterSet):
    class Meta:
        model = Surgery
        fields = [
            "patient",
            "surgeon",
            "status",
            "scheduled_for",
            "created_at",
        ]


class SurgicalProcedureFilter(SafeFilterSet):
    class Meta:
        model = SurgicalProcedure
        fields = [
            "name",
            "active",
            "created_at",
        ]


FILTER_MAP = {
    "surgery": SurgeryFilter,
    "procedimentocirurgico": SurgicalProcedureFilter,
}

CirurgiaFilter = SurgeryFilter
ProcedimentoCirurgicoFilter = SurgicalProcedureFilter
