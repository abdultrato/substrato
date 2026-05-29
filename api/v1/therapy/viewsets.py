from rest_framework.permissions import IsAuthenticated
from rest_framework.viewsets import ModelViewSet

from api.v1.viewset_mixins import TenantScopedQuerysetMixin, ValidatedSearchOrderingMixin
from apps.therapy.models import (
    TherapeuticResource,
    TherapyEvaluation,
    TherapyPlanGoal,
    TherapyPrescriptionLink,
    TherapyProgressNote,
    TherapySession,
    TherapyTreatmentPlan,
)

from .filters import (
    TherapeuticResourceFilter,
    TherapyEvaluationFilter,
    TherapyPlanGoalFilter,
    TherapyPrescriptionLinkFilter,
    TherapyProgressNoteFilter,
    TherapySessionFilter,
    TherapyTreatmentPlanFilter,
)
from .serializers import (
    TherapeuticResourceSerializer,
    TherapyEvaluationSerializer,
    TherapyPlanGoalSerializer,
    TherapyPrescriptionLinkSerializer,
    TherapyProgressNoteSerializer,
    TherapySessionSerializer,
    TherapyTreatmentPlanSerializer,
)


class TherapyModelViewSet(ValidatedSearchOrderingMixin, TenantScopedQuerysetMixin, ModelViewSet):
    permission_classes = [IsAuthenticated]
    ordering_fields = "__all__"
    ordering = ["-created_at"]


class TherapeuticResourceViewSet(TherapyModelViewSet):
    queryset = TherapeuticResource.objects.all()
    serializer_class = TherapeuticResourceSerializer
    filterset_class = TherapeuticResourceFilter
    search_fields = ["custom_id", "code", "name", "manufacturer", "model", "serial_number", "location", "notes"]
    ordering = ["name", "code"]


class TherapyEvaluationViewSet(TherapyModelViewSet):
    queryset = TherapyEvaluation.objects.select_related("patient", "therapist", "consultation", "medical_record", "prescription_item").all()
    serializer_class = TherapyEvaluationSerializer
    filterset_class = TherapyEvaluationFilter
    search_fields = [
        "custom_id",
        "patient__name",
        "patient__document_number",
        "therapist__name",
        "referral_reason",
        "clinical_diagnosis",
        "functional_diagnosis",
        "limitations",
        "goals",
    ]
    ordering = ["-evaluated_at", "-created_at"]


class TherapyTreatmentPlanViewSet(TherapyModelViewSet):
    queryset = TherapyTreatmentPlan.objects.select_related(
        "patient",
        "therapist",
        "evaluation",
        "medical_record",
        "prescription_item",
    ).prefetch_related("goals", "sessions", "progress_notes")
    serializer_class = TherapyTreatmentPlanSerializer
    filterset_class = TherapyTreatmentPlanFilter
    search_fields = ["custom_id", "name", "patient__name", "therapist__name", "objectives", "intervention_strategy", "home_program"]
    ordering = ["-start_date", "name"]


class TherapyPlanGoalViewSet(TherapyModelViewSet):
    queryset = TherapyPlanGoal.objects.select_related("plan").all()
    serializer_class = TherapyPlanGoalSerializer
    filterset_class = TherapyPlanGoalFilter
    search_fields = ["custom_id", "plan__name", "description", "target", "notes"]
    ordering = ["plan", "position", "id"]


class TherapySessionViewSet(TherapyModelViewSet):
    queryset = TherapySession.objects.select_related("plan", "patient", "therapist").all()
    serializer_class = TherapySessionSerializer
    filterset_class = TherapySessionFilter
    search_fields = ["custom_id", "plan__name", "patient__name", "therapist__name", "interventions_performed", "patient_response", "next_steps"]
    ordering = ["-scheduled_at", "-created_at"]


class TherapyProgressNoteViewSet(TherapyModelViewSet):
    queryset = TherapyProgressNote.objects.select_related("plan", "session").all()
    serializer_class = TherapyProgressNoteSerializer
    filterset_class = TherapyProgressNoteFilter
    search_fields = ["custom_id", "plan__name", "summary", "recommendations"]
    ordering = ["-recorded_at", "-created_at"]


class TherapyPrescriptionLinkViewSet(TherapyModelViewSet):
    queryset = TherapyPrescriptionLink.objects.select_related("patient", "prescription_item", "plan").all()
    serializer_class = TherapyPrescriptionLinkSerializer
    filterset_class = TherapyPrescriptionLinkFilter
    search_fields = ["custom_id", "patient__name", "requested_service", "notes", "plan__name"]
    ordering = ["-requested_at", "-created_at"]


VIEWSET_MAP = {
    "resource": TherapeuticResourceViewSet,
    "evaluation": TherapyEvaluationViewSet,
    "treatment_plan": TherapyTreatmentPlanViewSet,
    "goal": TherapyPlanGoalViewSet,
    "session": TherapySessionViewSet,
    "progress_note": TherapyProgressNoteViewSet,
    "prescription_link": TherapyPrescriptionLinkViewSet,
}
