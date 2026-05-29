from api.core.filters import SafeFilterSet
from apps.therapy.models import (
    TherapeuticResource,
    TherapyEvaluation,
    TherapyPlanGoal,
    TherapyPrescriptionLink,
    TherapyProgressNote,
    TherapySession,
    TherapyTreatmentPlan,
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


class TherapeuticResourceFilter(SafeFilterSet):
    class Meta:
        model = TherapeuticResource
        fields = [*BASE_FIELDS, "code", "discipline", "resource_type", "status", "next_review"]


class TherapyEvaluationFilter(SafeFilterSet):
    class Meta:
        model = TherapyEvaluation
        fields = [
            *BASE_FIELDS,
            "patient",
            "therapist",
            "consultation",
            "medical_record",
            "prescription_item",
            "discipline",
            "status",
            "evaluated_at",
        ]


class TherapyTreatmentPlanFilter(SafeFilterSet):
    class Meta:
        model = TherapyTreatmentPlan
        fields = [
            *BASE_FIELDS,
            "patient",
            "therapist",
            "evaluation",
            "medical_record",
            "prescription_item",
            "discipline",
            "status",
            "start_date",
            "end_date",
        ]


class TherapyPlanGoalFilter(SafeFilterSet):
    class Meta:
        model = TherapyPlanGoal
        fields = [*BASE_FIELDS, "plan", "discipline", "domain", "status", "position"]


class TherapySessionFilter(SafeFilterSet):
    class Meta:
        model = TherapySession
        fields = [*BASE_FIELDS, "plan", "patient", "therapist", "discipline", "status", "scheduled_at"]


class TherapyProgressNoteFilter(SafeFilterSet):
    class Meta:
        model = TherapyProgressNote
        fields = [*BASE_FIELDS, "plan", "session", "discipline", "domain", "trend", "recorded_at"]


class TherapyPrescriptionLinkFilter(SafeFilterSet):
    class Meta:
        model = TherapyPrescriptionLink
        fields = [*BASE_FIELDS, "patient", "prescription_item", "plan", "discipline", "status", "priority", "requested_at"]


FILTER_MAP = {
    "resource": TherapeuticResourceFilter,
    "evaluation": TherapyEvaluationFilter,
    "treatment_plan": TherapyTreatmentPlanFilter,
    "goal": TherapyPlanGoalFilter,
    "session": TherapySessionFilter,
    "progress_note": TherapyProgressNoteFilter,
    "prescription_link": TherapyPrescriptionLinkFilter,
}
