from api.core.filters import SafeFilterSet
from apps.dental.models import (
    DentalAppointment,
    DentalOdontogramEntry,
    DentalPatientTreatmentPlan,
    DentalProcedure,
    DentalProsthesisLabOrder,
    DentalRecord,
    DentalTreatmentPlan,
    DentalTreatmentPlanItem,
)


class DentalProcedureFilter(SafeFilterSet):
    class Meta:
        model = DentalProcedure
        fields = ["tenant", "custom_id", "deleted", "code", "category", "requires_prosthesis_lab", "active", "created_at"]


class DentalAppointmentFilter(SafeFilterSet):
    class Meta:
        model = DentalAppointment
        fields = [
            "tenant",
            "custom_id",
            "deleted",
            "patient",
            "dentist",
            "consultation",
            "status",
            "scheduled_start",
            "scheduled_end",
            "created_at",
        ]


class DentalRecordFilter(SafeFilterSet):
    class Meta:
        model = DentalRecord
        fields = [
            "tenant",
            "custom_id",
            "deleted",
            "patient",
            "dentist",
            "appointment",
            "status",
            "opened_at",
            "closed_at",
            "created_at",
        ]


class DentalOdontogramEntryFilter(SafeFilterSet):
    class Meta:
        model = DentalOdontogramEntry
        fields = ["tenant", "custom_id", "deleted", "record", "tooth_number", "surface", "condition", "procedure", "created_at"]


class DentalTreatmentPlanFilter(SafeFilterSet):
    class Meta:
        model = DentalTreatmentPlan
        fields = [
            "tenant",
            "custom_id",
            "deleted",
            "patient",
            "dentist",
            "record",
            "status",
            "planned_start",
            "planned_end",
            "created_at",
        ]


class DentalTreatmentPlanItemFilter(SafeFilterSet):
    class Meta:
        model = DentalTreatmentPlanItem
        fields = [
            "tenant",
            "custom_id",
            "deleted",
            "treatment_plan",
            "procedure",
            "appointment",
            "tooth_number",
            "status",
            "scheduled_date",
            "lab_required",
            "created_at",
        ]


class DentalPatientTreatmentPlanFilter(SafeFilterSet):
    class Meta:
        model = DentalPatientTreatmentPlan
        fields = [
            "tenant",
            "custom_id",
            "deleted",
            "patient",
            "treatment_plan",
            "dentist",
            "record",
            "status",
            "assigned_at",
            "valid_from",
            "valid_until",
            "created_at",
        ]


class DentalProsthesisLabOrderFilter(SafeFilterSet):
    class Meta:
        model = DentalProsthesisLabOrder
        fields = [
            "tenant",
            "custom_id",
            "deleted",
            "patient",
            "dentist",
            "treatment_item",
            "lab_company",
            "prosthesis_type",
            "status",
            "due_date",
            "created_at",
        ]


FILTER_MAP = {
    "procedure": DentalProcedureFilter,
    "appointment": DentalAppointmentFilter,
    "record": DentalRecordFilter,
    "odontogram": DentalOdontogramEntryFilter,
    "treatment_plan": DentalTreatmentPlanFilter,
    "treatment_item": DentalTreatmentPlanItemFilter,
    "patient_treatment_plan": DentalPatientTreatmentPlanFilter,
    "prosthesis_lab_order": DentalProsthesisLabOrderFilter,
}
