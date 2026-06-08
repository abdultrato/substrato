from django.apps import apps as django_apps
from django.core.exceptions import ValidationError as DjangoValidationError
from rest_framework import status as http_status
from rest_framework.decorators import action
from rest_framework.exceptions import ValidationError as DRFValidationError
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.viewsets import ModelViewSet

from api.v1.viewset_mixins import TenantScopedQuerysetMixin, ValidatedSearchOrderingMixin
from apps.therapy.services import TherapyWorkflowService
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


def _therapist(request):
    return _resolve_instance("recursos_humanos", "Employee", request.data.get("therapist"), getattr(request, "tenant", None))


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

    @action(detail=True, methods=["post"], url_path="ativar", url_name="ativar")
    def ativar(self, request, pk=None):
        obj = self.get_object()
        try:
            TherapyWorkflowService.activate_resource(obj)
        except DjangoValidationError as exc:
            raise _as_drf_error(exc)
        return Response(self.get_serializer(obj).data)

    @action(detail=True, methods=["post"], url_path="inativar", url_name="inativar")
    def inativar(self, request, pk=None):
        obj = self.get_object()
        try:
            TherapyWorkflowService.deactivate_resource(obj)
        except DjangoValidationError as exc:
            raise _as_drf_error(exc)
        return Response(self.get_serializer(obj).data)

    @action(detail=True, methods=["post"], url_path="marcar-manutencao", url_name="marcar-manutencao")
    def marcar_manutencao(self, request, pk=None):
        obj = self.get_object()
        try:
            TherapyWorkflowService.mark_resource_maintenance(
                obj, next_review=request.data.get("next_review") or None, notes=request.data.get("notes", "")
            )
        except DjangoValidationError as exc:
            raise _as_drf_error(exc)
        return Response(self.get_serializer(obj).data)


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

    @action(detail=True, methods=["post"], url_path="finalizar", url_name="finalizar")
    def finalizar(self, request, pk=None):
        obj = self.get_object()
        try:
            TherapyWorkflowService.finalize_evaluation(obj)
        except DjangoValidationError as exc:
            raise _as_drf_error(exc)
        return Response(self.get_serializer(obj).data)

    @action(detail=True, methods=["post"], url_path="cancelar", url_name="cancelar")
    def cancelar(self, request, pk=None):
        obj = self.get_object()
        try:
            TherapyWorkflowService.cancel_evaluation(obj, reason=request.data.get("reason", ""))
        except DjangoValidationError as exc:
            raise _as_drf_error(exc)
        return Response(self.get_serializer(obj).data)


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

    @action(detail=True, methods=["post"], url_path="aprovar", url_name="aprovar")
    def aprovar(self, request, pk=None):
        plan = self.get_object()
        try:
            TherapyWorkflowService.approve_plan(plan)
        except DjangoValidationError as exc:
            raise _as_drf_error(exc)
        return Response(self.get_serializer(plan).data)

    @action(detail=True, methods=["post"], url_path="suspender", url_name="suspender")
    def suspender(self, request, pk=None):
        plan = self.get_object()
        try:
            TherapyWorkflowService.pause_plan(plan, reason=request.data.get("reason", ""))
        except DjangoValidationError as exc:
            raise _as_drf_error(exc)
        return Response(self.get_serializer(plan).data)

    @action(detail=True, methods=["post"], url_path="retomar", url_name="retomar")
    def retomar(self, request, pk=None):
        plan = self.get_object()
        try:
            TherapyWorkflowService.resume_plan(plan)
        except DjangoValidationError as exc:
            raise _as_drf_error(exc)
        return Response(self.get_serializer(plan).data)

    @action(detail=True, methods=["post"], url_path="cancelar", url_name="cancelar")
    def cancelar(self, request, pk=None):
        plan = self.get_object()
        try:
            TherapyWorkflowService.cancel_plan(plan, reason=request.data.get("reason", ""))
        except DjangoValidationError as exc:
            raise _as_drf_error(exc)
        return Response(self.get_serializer(plan).data)

    @action(detail=True, methods=["post"], url_path="alta", url_name="alta")
    def alta(self, request, pk=None):
        plan = self.get_object()
        try:
            note = TherapyWorkflowService.discharge_plan(
                plan,
                summary=request.data.get("summary", ""),
                trend=request.data.get("trend") or TherapyProgressNote.Trend.IMPROVED,
                functional_score=int(request.data.get("functional_score", 0) or 0),
                recommendations=request.data.get("recommendations", ""),
            )
        except DjangoValidationError as exc:
            raise _as_drf_error(exc)
        return Response(
            TherapyProgressNoteSerializer(note, context=self.get_serializer_context()).data,
            status=http_status.HTTP_201_CREATED,
        )

    @action(detail=True, methods=["post"], url_path="agendar-sessao", url_name="agendar-sessao")
    def agendar_sessao(self, request, pk=None):
        plan = self.get_object()
        try:
            session = TherapyWorkflowService.schedule_session(
                plan, scheduled_at=request.data.get("scheduled_at") or None, therapist=_therapist(request)
            )
        except DjangoValidationError as exc:
            raise _as_drf_error(exc)
        return Response(
            TherapySessionSerializer(session, context=self.get_serializer_context()).data,
            status=http_status.HTTP_201_CREATED,
        )


class TherapyPlanGoalViewSet(TherapyModelViewSet):
    queryset = TherapyPlanGoal.objects.select_related("plan").all()
    serializer_class = TherapyPlanGoalSerializer
    filterset_class = TherapyPlanGoalFilter
    search_fields = ["custom_id", "plan__name", "description", "target", "notes"]
    ordering = ["plan", "position", "id"]

    @action(detail=True, methods=["post"], url_path="atualizar-progresso", url_name="atualizar-progresso")
    def atualizar_progresso(self, request, pk=None):
        goal = self.get_object()
        try:
            TherapyWorkflowService.update_goal_progress(goal, current_score=int(request.data.get("current_score", 0) or 0))
        except DjangoValidationError as exc:
            raise _as_drf_error(exc)
        return Response(self.get_serializer(goal).data)

    @action(detail=True, methods=["post"], url_path="marcar-alcancado", url_name="marcar-alcancado")
    def marcar_alcancado(self, request, pk=None):
        goal = self.get_object()
        score = request.data.get("current_score")
        try:
            TherapyWorkflowService.mark_goal_achieved(
                goal, current_score=int(score) if score not in (None, "") else None
            )
        except DjangoValidationError as exc:
            raise _as_drf_error(exc)
        return Response(self.get_serializer(goal).data)

    @action(detail=True, methods=["post"], url_path="suspender", url_name="suspender")
    def suspender(self, request, pk=None):
        goal = self.get_object()
        try:
            TherapyWorkflowService.suspend_goal(goal, reason=request.data.get("reason", ""))
        except DjangoValidationError as exc:
            raise _as_drf_error(exc)
        return Response(self.get_serializer(goal).data)


class TherapySessionViewSet(TherapyModelViewSet):
    queryset = TherapySession.objects.select_related("plan", "patient", "therapist").all()
    serializer_class = TherapySessionSerializer
    filterset_class = TherapySessionFilter
    search_fields = ["custom_id", "plan__name", "patient__name", "therapist__name", "interventions_performed", "patient_response", "next_steps"]
    ordering = ["-scheduled_at", "-created_at"]

    @action(detail=True, methods=["post"], url_path="iniciar", url_name="iniciar")
    def iniciar(self, request, pk=None):
        session = self.get_object()
        try:
            TherapyWorkflowService.start_session(session, therapist=_therapist(request))
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
            TherapyWorkflowService.finalize_session(
                session,
                functional_score=_score("functional_score"),
                motor_score=_score("motor_score"),
                communication_score=_score("communication_score"),
                interventions_performed=data.get("interventions_performed", ""),
                patient_response=data.get("patient_response", ""),
                home_guidance=data.get("home_guidance", ""),
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
            TherapyWorkflowService.cancel_session(session, reason=request.data.get("reason", ""))
        except DjangoValidationError as exc:
            raise _as_drf_error(exc)
        return Response(self.get_serializer(session).data)

    @action(detail=True, methods=["post"], url_path="faltou", url_name="faltou")
    def faltou(self, request, pk=None):
        session = self.get_object()
        try:
            TherapyWorkflowService.mark_session_missed(session)
        except DjangoValidationError as exc:
            raise _as_drf_error(exc)
        return Response(self.get_serializer(session).data)


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

    @action(detail=True, methods=["post"], url_path="vincular", url_name="vincular")
    def vincular(self, request, pk=None):
        link = self.get_object()
        plan = _resolve_instance("terapia", "TherapyTreatmentPlan", request.data.get("plan"), getattr(request, "tenant", None))
        if plan is None:
            raise DRFValidationError({"plan": "Plano é obrigatório."})
        try:
            TherapyWorkflowService.link_prescription_to_plan(link, plan=plan)
        except DjangoValidationError as exc:
            raise _as_drf_error(exc)
        return Response(self.get_serializer(link).data)

    @action(detail=True, methods=["post"], url_path="encerrar", url_name="encerrar")
    def encerrar(self, request, pk=None):
        link = self.get_object()
        try:
            TherapyWorkflowService.close_prescription_link(link, reason=request.data.get("reason", ""))
        except DjangoValidationError as exc:
            raise _as_drf_error(exc)
        return Response(self.get_serializer(link).data)


VIEWSET_MAP = {
    "resource": TherapeuticResourceViewSet,
    "evaluation": TherapyEvaluationViewSet,
    "treatment_plan": TherapyTreatmentPlanViewSet,
    "goal": TherapyPlanGoalViewSet,
    "session": TherapySessionViewSet,
    "progress_note": TherapyProgressNoteViewSet,
    "prescription_link": TherapyPrescriptionLinkViewSet,
}
