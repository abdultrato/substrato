from rest_framework.permissions import IsAuthenticated
from rest_framework.viewsets import ModelViewSet

from api.v1.viewset_mixins import TenantScopedQuerysetMixin, ValidatedSearchOrderingMixin
from apps.physiotherapy.models import (
    FunctionalAssessment,
    PhysiotherapyDevice,
    RehabilitationDeviceUsage,
    RehabilitationProgressNote,
    RehabilitationSession,
    RehabilitationTreatmentPlan,
    TreatmentPlanIntervention,
)

from .filters import (
    FunctionalAssessmentFilter,
    PhysiotherapyDeviceFilter,
    RehabilitationDeviceUsageFilter,
    RehabilitationProgressNoteFilter,
    RehabilitationSessionFilter,
    RehabilitationTreatmentPlanFilter,
    TreatmentPlanInterventionFilter,
)
from .serializers import (
    FunctionalAssessmentSerializer,
    PhysiotherapyDeviceSerializer,
    RehabilitationDeviceUsageSerializer,
    RehabilitationProgressNoteSerializer,
    RehabilitationSessionSerializer,
    RehabilitationTreatmentPlanSerializer,
    TreatmentPlanInterventionSerializer,
)


class PhysiotherapyModelViewSet(ValidatedSearchOrderingMixin, TenantScopedQuerysetMixin, ModelViewSet):
    permission_classes = [IsAuthenticated]
    ordering_fields = "__all__"
    ordering = ["-created_at"]


class PhysiotherapyDeviceViewSet(PhysiotherapyModelViewSet):
    queryset = PhysiotherapyDevice.objects.all()
    serializer_class = PhysiotherapyDeviceSerializer
    filterset_class = PhysiotherapyDeviceFilter
    search_fields = ["custom_id", "code", "name", "manufacturer", "model", "serial_number", "location", "notes"]
    ordering = ["name", "code"]


class FunctionalAssessmentViewSet(PhysiotherapyModelViewSet):
    queryset = FunctionalAssessment.objects.select_related("patient", "therapist", "consultation", "medical_record").all()
    serializer_class = FunctionalAssessmentSerializer
    filterset_class = FunctionalAssessmentFilter
    search_fields = [
        "custom_id",
        "patient__name",
        "patient__document_number",
        "therapist__name",
        "clinical_diagnosis",
        "functional_diagnosis",
        "primary_complaint",
        "limitations",
        "goals",
    ]
    ordering = ["-assessed_at", "-created_at"]


class RehabilitationTreatmentPlanViewSet(PhysiotherapyModelViewSet):
    queryset = RehabilitationTreatmentPlan.objects.select_related(
        "patient",
        "therapist",
        "assessment",
        "medical_record",
        "prescription_item",
    ).prefetch_related("sessions", "interventions")
    serializer_class = RehabilitationTreatmentPlanSerializer
    filterset_class = RehabilitationTreatmentPlanFilter
    search_fields = ["custom_id", "name", "patient__name", "therapist__name", "objectives", "protocol", "home_program"]
    ordering = ["-start_date", "name"]


class TreatmentPlanInterventionViewSet(PhysiotherapyModelViewSet):
    queryset = TreatmentPlanIntervention.objects.select_related("plan", "device").all()
    serializer_class = TreatmentPlanInterventionSerializer
    filterset_class = TreatmentPlanInterventionFilter
    search_fields = ["custom_id", "plan__name", "description", "dosage", "intensity", "instructions", "device__name"]
    ordering = ["plan", "position", "id"]


class RehabilitationSessionViewSet(PhysiotherapyModelViewSet):
    queryset = RehabilitationSession.objects.select_related("plan", "patient", "therapist").all()
    serializer_class = RehabilitationSessionSerializer
    filterset_class = RehabilitationSessionFilter
    search_fields = ["custom_id", "plan__name", "patient__name", "therapist__name", "interventions_performed", "patient_response", "next_steps"]
    ordering = ["-scheduled_at", "-created_at"]


class RehabilitationProgressNoteViewSet(PhysiotherapyModelViewSet):
    queryset = RehabilitationProgressNote.objects.select_related("plan", "session").all()
    serializer_class = RehabilitationProgressNoteSerializer
    filterset_class = RehabilitationProgressNoteFilter
    search_fields = ["custom_id", "plan__name", "summary", "recommendations"]
    ordering = ["-recorded_at", "-created_at"]


class RehabilitationDeviceUsageViewSet(PhysiotherapyModelViewSet):
    queryset = RehabilitationDeviceUsage.objects.select_related("session", "device").all()
    serializer_class = RehabilitationDeviceUsageSerializer
    filterset_class = RehabilitationDeviceUsageFilter
    search_fields = ["custom_id", "session__custom_id", "device__name", "settings", "outcome", "notes"]
    ordering = ["-started_at", "-created_at"]


VIEWSET_MAP = {
    "device": PhysiotherapyDeviceViewSet,
    "assessment": FunctionalAssessmentViewSet,
    "treatment_plan": RehabilitationTreatmentPlanViewSet,
    "intervention": TreatmentPlanInterventionViewSet,
    "session": RehabilitationSessionViewSet,
    "progress_note": RehabilitationProgressNoteViewSet,
    "device_usage": RehabilitationDeviceUsageViewSet,
}
