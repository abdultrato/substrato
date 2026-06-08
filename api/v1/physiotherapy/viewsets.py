from django.apps import apps as django_apps
from django.core.exceptions import ValidationError as DjangoValidationError
from rest_framework import status as http_status
from rest_framework.decorators import action
from rest_framework.exceptions import ValidationError as DRFValidationError
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.viewsets import ModelViewSet

from api.v1.viewset_mixins import TenantScopedQuerysetMixin, ValidatedSearchOrderingMixin
from apps.physiotherapy.services import PhysiotherapyWorkflowService
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


def _as_drf_error(exc: DjangoValidationError) -> DRFValidationError:
    detail = getattr(exc, "message_dict", None) or getattr(exc, "messages", None) or [str(exc)]
    return DRFValidationError(detail)


def _resolve_instance(label: str, model_name: str, pk, tenant):
    if pk in (None, "", 0):
        return None
    model = django_apps.get_model(label, model_name)
    instance = model.objects.filter(pk=pk).first()
    if instance is None:
        raise DRFValidationError(f"{model_name} {pk} não encontrado.")
    if tenant is not None:
        req_tenant_id = getattr(tenant, "id", None)
        inst_tenant_id = getattr(instance, "tenant_id", None)
        if inst_tenant_id is not None and req_tenant_id is not None and inst_tenant_id != req_tenant_id:
            raise DRFValidationError(f"{model_name} pertence a outro tenant.")
    return instance


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

    @action(detail=True, methods=["post"], url_path="marcar-manutencao", url_name="marcar-manutencao")
    def marcar_manutencao(self, request, pk=None):
        device = self.get_object()
        try:
            PhysiotherapyWorkflowService.mark_device_maintenance(
                device,
                next_maintenance=request.data.get("next_maintenance") or None,
                notes=request.data.get("notes", ""),
            )
        except DjangoValidationError as exc:
            raise _as_drf_error(exc)
        return Response(self.get_serializer(device).data)

    @action(detail=True, methods=["post"], url_path="marcar-disponivel", url_name="marcar-disponivel")
    def marcar_disponivel(self, request, pk=None):
        device = self.get_object()
        try:
            PhysiotherapyWorkflowService.mark_device_available(
                device,
                last_maintenance=request.data.get("last_maintenance") or None,
                next_maintenance=request.data.get("next_maintenance") or None,
            )
        except DjangoValidationError as exc:
            raise _as_drf_error(exc)
        return Response(self.get_serializer(device).data)


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

    @action(detail=True, methods=["post"], url_path="finalizar", url_name="finalizar")
    def finalizar(self, request, pk=None):
        assessment = self.get_object()
        try:
            PhysiotherapyWorkflowService.finalize_assessment(assessment)
        except DjangoValidationError as exc:
            raise _as_drf_error(exc)
        return Response(self.get_serializer(assessment).data)

    @action(detail=True, methods=["post"], url_path="cancelar", url_name="cancelar")
    def cancelar(self, request, pk=None):
        assessment = self.get_object()
        try:
            PhysiotherapyWorkflowService.cancel_assessment(assessment, reason=request.data.get("reason", ""))
        except DjangoValidationError as exc:
            raise _as_drf_error(exc)
        return Response(self.get_serializer(assessment).data)


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

    @action(detail=True, methods=["post"], url_path="aprovar", url_name="aprovar")
    def aprovar(self, request, pk=None):
        plan = self.get_object()
        try:
            PhysiotherapyWorkflowService.approve_plan(plan)
        except DjangoValidationError as exc:
            raise _as_drf_error(exc)
        return Response(self.get_serializer(plan).data)

    @action(detail=True, methods=["post"], url_path="suspender", url_name="suspender")
    def suspender(self, request, pk=None):
        plan = self.get_object()
        try:
            PhysiotherapyWorkflowService.pause_plan(plan, reason=request.data.get("reason", ""))
        except DjangoValidationError as exc:
            raise _as_drf_error(exc)
        return Response(self.get_serializer(plan).data)

    @action(detail=True, methods=["post"], url_path="retomar", url_name="retomar")
    def retomar(self, request, pk=None):
        plan = self.get_object()
        try:
            PhysiotherapyWorkflowService.resume_plan(plan)
        except DjangoValidationError as exc:
            raise _as_drf_error(exc)
        return Response(self.get_serializer(plan).data)

    @action(detail=True, methods=["post"], url_path="concluir", url_name="concluir")
    def concluir(self, request, pk=None):
        plan = self.get_object()
        try:
            PhysiotherapyWorkflowService.complete_plan(plan)
        except DjangoValidationError as exc:
            raise _as_drf_error(exc)
        return Response(self.get_serializer(plan).data)

    @action(detail=True, methods=["post"], url_path="cancelar", url_name="cancelar")
    def cancelar(self, request, pk=None):
        plan = self.get_object()
        try:
            PhysiotherapyWorkflowService.cancel_plan(plan, reason=request.data.get("reason", ""))
        except DjangoValidationError as exc:
            raise _as_drf_error(exc)
        return Response(self.get_serializer(plan).data)

    @action(detail=True, methods=["post"], url_path="alta", url_name="alta")
    def alta(self, request, pk=None):
        plan = self.get_object()
        try:
            note = PhysiotherapyWorkflowService.discharge_plan(
                plan,
                summary=request.data.get("summary", ""),
                trend=request.data.get("trend") or RehabilitationProgressNote.Trend.IMPROVED,
                functional_score=int(request.data.get("functional_score", 0) or 0),
                pain_score=int(request.data.get("pain_score", 0) or 0),
                recommendations=request.data.get("recommendations", ""),
            )
        except DjangoValidationError as exc:
            raise _as_drf_error(exc)
        return Response(
            RehabilitationProgressNoteSerializer(note, context=self.get_serializer_context()).data,
            status=http_status.HTTP_201_CREATED,
        )

    @action(detail=True, methods=["post"], url_path="agendar-sessao", url_name="agendar-sessao")
    def agendar_sessao(self, request, pk=None):
        plan = self.get_object()
        tenant = getattr(request, "tenant", None)
        therapist = _resolve_instance("recursos_humanos", "Employee", request.data.get("therapist"), tenant)
        try:
            session = PhysiotherapyWorkflowService.schedule_session(
                plan,
                scheduled_at=request.data.get("scheduled_at") or None,
                therapist=therapist,
            )
        except DjangoValidationError as exc:
            raise _as_drf_error(exc)
        return Response(
            RehabilitationSessionSerializer(session, context=self.get_serializer_context()).data,
            status=http_status.HTTP_201_CREATED,
        )


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

    @action(detail=True, methods=["post"], url_path="iniciar", url_name="iniciar")
    def iniciar(self, request, pk=None):
        session = self.get_object()
        tenant = getattr(request, "tenant", None)
        therapist = _resolve_instance("recursos_humanos", "Employee", request.data.get("therapist"), tenant)
        pain_before = request.data.get("pain_before")
        try:
            PhysiotherapyWorkflowService.start_session(
                session,
                therapist=therapist,
                pain_before=int(pain_before) if pain_before not in (None, "") else None,
            )
        except DjangoValidationError as exc:
            raise _as_drf_error(exc)
        return Response(self.get_serializer(session).data)

    @action(detail=True, methods=["post"], url_path="finalizar", url_name="finalizar")
    def finalizar(self, request, pk=None):
        session = self.get_object()
        data = request.data

        def _score(key):
            value = data.get(key)
            return int(value) if value not in (None, "") else None

        try:
            PhysiotherapyWorkflowService.finalize_session(
                session,
                pain_after=_score("pain_after"),
                mobility_score=_score("mobility_score"),
                strength_score=_score("strength_score"),
                balance_score=_score("balance_score"),
                interventions_performed=data.get("interventions_performed", ""),
                patient_response=data.get("patient_response", ""),
                next_steps=data.get("next_steps", ""),
                summary=data.get("summary", ""),
                recommendations=data.get("recommendations", ""),
            )
        except DjangoValidationError as exc:
            raise _as_drf_error(exc)
        return Response(self.get_serializer(session).data)

    @action(detail=True, methods=["post"], url_path="cancelar", url_name="cancelar")
    def cancelar(self, request, pk=None):
        session = self.get_object()
        try:
            PhysiotherapyWorkflowService.cancel_session(session, reason=request.data.get("reason", ""))
        except DjangoValidationError as exc:
            raise _as_drf_error(exc)
        return Response(self.get_serializer(session).data)

    @action(detail=True, methods=["post"], url_path="faltou", url_name="faltou")
    def faltou(self, request, pk=None):
        session = self.get_object()
        try:
            PhysiotherapyWorkflowService.mark_session_missed(session)
        except DjangoValidationError as exc:
            raise _as_drf_error(exc)
        return Response(self.get_serializer(session).data)

    @action(detail=True, methods=["post"], url_path="registar-uso-aparelho", url_name="registar-uso-aparelho")
    def registar_uso_aparelho(self, request, pk=None):
        session = self.get_object()
        tenant = getattr(request, "tenant", None)
        device = _resolve_instance("fisioterapia", "PhysiotherapyDevice", request.data.get("device"), tenant)
        if device is None:
            raise DRFValidationError({"device": "Aparelho é obrigatório."})
        try:
            usage = PhysiotherapyWorkflowService.register_device_usage(
                session,
                device,
                settings=request.data.get("settings", ""),
                duration_minutes=int(request.data.get("duration_minutes", 0) or 0),
                outcome=request.data.get("outcome", ""),
                notes=request.data.get("notes", ""),
            )
        except DjangoValidationError as exc:
            raise _as_drf_error(exc)
        return Response(
            RehabilitationDeviceUsageSerializer(usage, context=self.get_serializer_context()).data,
            status=http_status.HTTP_201_CREATED,
        )


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
