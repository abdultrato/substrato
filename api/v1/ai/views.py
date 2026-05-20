from __future__ import annotations

from django.db.models import Count, Q
from rest_framework import status
from rest_framework.exceptions import NotFound, PermissionDenied, ValidationError
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.ai_assistant.models import AiInvestigation, AiOperationalTask, AiSession, AiSuggestedAction
from apps.ai_assistant.services.action_executor import AiActionExecutionError, AiActionExecutor
from apps.ai_assistant.services.orchestrator import AiOrchestrator
from apps.ai_assistant.services.policy import AiPolicyError, AiPolicyGuard
from apps.ai_assistant.services.registry import AiToolRegistry

from .serializers import (
    AiActionConfirmSerializer,
    AiChatRequestSerializer,
    AiInvestigationSerializer,
    AiOperationalTaskSerializer,
    AiSessionDetailSerializer,
    AiSessionSerializer,
    AiSuggestedActionSerializer,
)


def request_tenant(request):
    tenant = getattr(request, "tenant", None)
    if tenant is not None:
        return tenant
    user = getattr(request, "user", None)
    return getattr(user, "tenant", None)


def map_policy_error(exc: AiPolicyError) -> PermissionDenied:
    return PermissionDenied({"policy_key": exc.policy_key, "detail": exc.reason, "blocked": exc.blocked})


class AiAssistantChatView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        serializer = AiChatRequestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data
        tenant = request_tenant(request)

        orchestrator = AiOrchestrator()
        try:
            payload = orchestrator.chat(
                user=request.user,
                tenant=tenant,
                message=data["message"],
                session_id=data.get("session_id"),
                language=data.get("language") or "pt",
                active_module=data.get("active_module") or "",
                context=data.get("context") or {},
            )
        except AiPolicyError as exc:
            raise map_policy_error(exc) from exc

        return Response(payload, status=status.HTTP_200_OK)


class AiAssistantSessionsView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        tenant = request_tenant(request)
        if tenant is None:
            raise ValidationError({"tenant": "Tenant não resolvido na requisição."})

        queryset = (
            AiSession.objects.filter(tenant=tenant, user=request.user, deleted=False)
            .annotate(message_count=Count("messages"))
            .order_by("-last_message_at", "-updated_at", "-id")[:50]
        )
        return Response(AiSessionSerializer(queryset, many=True).data)


class AiAssistantSessionDetailView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, session_id: int):
        tenant = request_tenant(request)
        session = (
            AiSession.objects.filter(tenant=tenant, user=request.user, id=session_id, deleted=False)
            .prefetch_related("messages")
            .annotate(message_count=Count("messages"))
            .first()
        )
        if session is None:
            raise NotFound("Sessão da IA não encontrada.")
        return Response(AiSessionDetailSerializer(session).data)


class AiAssistantToolsView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        language = "en" if request.query_params.get("language") == "en" else "pt"
        registry = AiToolRegistry()
        policy = AiPolicyGuard()
        return Response({"tools": registry.list_definitions(user=request.user, policy_guard=policy, language=language)})


class AiAssistantInvestigationsView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        tenant = request_tenant(request)
        if tenant is None:
            raise ValidationError({"tenant": "Tenant não resolvido na requisição."})

        policy = AiPolicyGuard()
        queryset = AiInvestigation.objects.filter(tenant=tenant, deleted=False).select_related("created_by")
        if not policy.is_admin_like(request.user):
            queryset = queryset.filter(created_by=request.user)
        queryset = queryset.order_by("-created_at", "-id")[:100]
        return Response(AiInvestigationSerializer(queryset, many=True).data)


class AiAssistantInvestigationDetailView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, investigation_id: int):
        tenant = request_tenant(request)
        investigation = (
            AiInvestigation.objects.filter(tenant=tenant, id=investigation_id, deleted=False)
            .select_related("created_by")
            .first()
        )
        if investigation is None:
            raise NotFound("Investigação da IA não encontrada.")

        policy = AiPolicyGuard()
        if not policy.is_admin_like(request.user) and investigation.created_by_id != request.user.id:
            raise NotFound("Investigação da IA não encontrada.")
        return Response(AiInvestigationSerializer(investigation).data)


class AiAssistantTasksView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        tenant = request_tenant(request)
        if tenant is None:
            raise ValidationError({"tenant": "Tenant não resolvido na requisição."})

        policy = AiPolicyGuard()
        queryset = AiOperationalTask.objects.filter(tenant=tenant, deleted=False).select_related("created_by")
        if not policy.is_admin_like(request.user):
            groups = policy.user_group_names(request.user)
            queryset = queryset.filter(Q(assigned_group__in=groups) | Q(created_by=request.user))
        queryset = queryset.order_by("-created_at", "-id")[:100]
        return Response(AiOperationalTaskSerializer(queryset, many=True).data)


class AiAssistantTaskDetailView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, task_id: int):
        tenant = request_tenant(request)
        task = (
            AiOperationalTask.objects.filter(tenant=tenant, id=task_id, deleted=False)
            .select_related("created_by")
            .first()
        )
        if task is None:
            raise NotFound("Tarefa operacional da IA não encontrada.")

        policy = AiPolicyGuard()
        if not policy.is_admin_like(request.user):
            groups = policy.user_group_names(request.user)
            if task.assigned_group not in groups and task.created_by_id != request.user.id:
                raise NotFound("Tarefa operacional da IA não encontrada.")
        return Response(AiOperationalTaskSerializer(task).data)


class AiAssistantActionConfirmView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, action_id: int):
        serializer = AiActionConfirmSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        tenant = request_tenant(request)
        action = AiSuggestedAction.objects.filter(tenant=tenant, id=action_id, deleted=False).first()
        if action is None:
            raise NotFound("Acção da IA não encontrada.")

        policy = AiPolicyGuard()
        try:
            policy.ensure_action_allowed(action=action, user=request.user, tenant=tenant)
        except AiPolicyError as exc:
            raise map_policy_error(exc) from exc

        try:
            action = AiActionExecutor().execute(action=action, user=request.user, tenant=tenant)
        except AiActionExecutionError as exc:
            raise ValidationError({"action_type": str(exc)}) from exc
        return Response(AiSuggestedActionSerializer(action).data)


class AiAssistantActionCancelView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, action_id: int):
        tenant = request_tenant(request)
        action = AiSuggestedAction.objects.filter(tenant=tenant, id=action_id, deleted=False).first()
        if action is None:
            raise NotFound("Acção da IA não encontrada.")

        policy = AiPolicyGuard()
        try:
            policy.ensure_action_allowed(action=action, user=request.user, tenant=tenant)
        except AiPolicyError as exc:
            raise map_policy_error(exc) from exc

        action.status = AiSuggestedAction.Status.CANCELLED
        action.result_summary = "Cancelada pelo utilizador."
        action.save(update_fields=["status", "result_summary", "updated_at"])
        return Response(AiSuggestedActionSerializer(action).data)
