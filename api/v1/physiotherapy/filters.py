from api.core.filters import SafeFilterSet
from apps.physiotherapy.models import (
    FunctionalAssessment,
    PhysiotherapyDevice,
    RehabilitationDeviceUsage,
    RehabilitationProgressNote,
    RehabilitationSession,
    RehabilitationTreatmentPlan,
    TreatmentPlanIntervention,
)

BASE_FIELDS = [
    "tenant",
    "custom_id",
    "deleted",
    "deleted_at",
    "created_at",
    "updated_at",
    "created_by",
    "updated_by",
]


class PhysiotherapyDeviceFilter(SafeFilterSet):
    class Meta:
        model = PhysiotherapyDevice
        fields = [*BASE_FIELDS, "code", "device_type", "status", "next_maintenance"]


class FunctionalAssessmentFilter(SafeFilterSet):
    class Meta:
        model = FunctionalAssessment
        fields = [*BASE_FIELDS, "patient", "therapist", "consultation", "medical_record", "status", "body_region", "assessed_at"]


class RehabilitationTreatmentPlanFilter(SafeFilterSet):
    class Meta:
        model = RehabilitationTreatmentPlan
        fields = [
            *BASE_FIELDS,
            "patient",
            "therapist",
            "assessment",
            "medical_record",
            "prescription_item",
            "status",
            "body_region",
            "start_date",
            "end_date",
        ]


class TreatmentPlanInterventionFilter(SafeFilterSet):
    class Meta:
        model = TreatmentPlanIntervention
        fields = [*BASE_FIELDS, "plan", "device", "intervention_type", "body_region", "position"]


class RehabilitationSessionFilter(SafeFilterSet):
    class Meta:
        model = RehabilitationSession
        fields = [*BASE_FIELDS, "plan", "patient", "therapist", "status", "scheduled_at"]


class RehabilitationProgressNoteFilter(SafeFilterSet):
    class Meta:
        model = RehabilitationProgressNote
        fields = [*BASE_FIELDS, "plan", "session", "trend", "recorded_at"]


class RehabilitationDeviceUsageFilter(SafeFilterSet):
    class Meta:
        model = RehabilitationDeviceUsage
        fields = [*BASE_FIELDS, "session", "device", "started_at"]


FILTER_MAP = {
    "device": PhysiotherapyDeviceFilter,
    "assessment": FunctionalAssessmentFilter,
    "treatment_plan": RehabilitationTreatmentPlanFilter,
    "intervention": TreatmentPlanInterventionFilter,
    "session": RehabilitationSessionFilter,
    "progress_note": RehabilitationProgressNoteFilter,
    "device_usage": RehabilitationDeviceUsageFilter,
}
