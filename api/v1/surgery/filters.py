"""FilterSets para recursos de Cirurgia na API v1."""

from api.core.filters import SafeFilterSet
from apps.surgery.models.surgery import LargeSurgery, SmallSurgery, Surgery
from apps.surgery.models.surgical_procedure import SurgicalProcedure


class SurgeryFilter(SafeFilterSet):
    class Meta:
        model = Surgery
        fields = [
            "patient",
            "surgeon",
            "status",
            "surgery_size",
            "scheduled_for",
            "created_at",
        ]


class SmallSurgeryFilter(SafeFilterSet):
    class Meta:
        model = SmallSurgery
        fields = SurgeryFilter.Meta.fields


class LargeSurgeryFilter(SafeFilterSet):
    class Meta:
        model = LargeSurgery
        fields = SurgeryFilter.Meta.fields


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
    "small_surgery": SmallSurgeryFilter,
    "large_surgery": LargeSurgeryFilter,
    "surgical_procedure": SurgicalProcedureFilter,
}

