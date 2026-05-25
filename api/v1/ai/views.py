from __future__ import annotations

from django.db.models import Count, Q
from django.utils import timezone
from rest_framework import status
from rest_framework.exceptions import NotFound, PermissionDenied, ValidationError
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.ai_assistant.models import AiInvestigation, AiOperationalTask, AiSession, AiSuggestedAction
from apps.ai_assistant.services.action_executor import AiActionExecutionError, AiActionExecutor
from apps.ai_assistant.services.investigation_followup import (
    AiInvestigationFollowUpBuilder,
    AiInvestigationFollowUpError,
)
from apps.ai_assistant.services.orchestrator import AiOrchestrator
from apps.ai_assistant.services.policy import AiPolicyError, AiPolicyGuard
from apps.ai_assistant.services.registry import AiToolRegistry

from .serializers import (
    AiActionConfirmSerializer,
    AiChatRequestSerializer,
    AiInvestigationFollowUpSerializer,
    AiInvestigationSerializer,
    AiInvestigationUpdateSerializer,
    AiOperationalTaskSerializer,
    AiOperationalTaskUpdateSerializer,
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


def ai_investigation_queryset(request):
    tenant = request_tenant(request)
    if tenant is None:
        raise ValidationError({"tenant": "Tenant não resolvido na requisição."})

    policy = AiPolicyGuard()
    queryset = AiInvestigation.objects.filter(tenant=tenant, deleted=False).select_related("created_by", "session")
    if not policy.is_admin_like(request.user):
        queryset = queryset.filter(created_by=request.user)
    return queryset


def ai_task_queryset(request):
    tenant = request_tenant(request)
    if tenant is None:
        raise ValidationError({"tenant": "Tenant não resolvido na requisição."})

    policy = AiPolicyGuard()
    queryset = AiOperationalTask.objects.filter(tenant=tenant, deleted=False).select_related("created_by", "session")
    if not policy.is_admin_like(request.user):
        groups = policy.user_group_names(request.user)
        queryset = queryset.filter(Q(assigned_group__in=groups) | Q(created_by=request.user))
    return queryset


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
        queryset = ai_investigation_queryset(request)
        status_value = str(request.query_params.get("status") or "").strip()
        intent = str(request.query_params.get("intent") or "").strip()
        tool_name = str(request.query_params.get("tool") or "").strip()
        query = str(request.query_params.get("q") or "").strip()
        session_id = str(request.query_params.get("session_id") or "").strip()

        if status_value:
            queryset = queryset.filter(status=status_value)
        if intent:
            queryset = queryset.filter(intent=intent)
        if session_id.isdigit():
            queryset = queryset.filter(session_id=int(session_id))
        if query:
            queryset = queryset.filter(
                Q(title__icontains=query)
                | Q(question__icontains=query)
                | Q(intent__icontains=query)
                | Q(result_summary__icontains=query)
            )

        try:
            limit = min(max(int(request.query_params.get("limit") or 100), 1), 250)
        except (TypeError, ValueError):
            limit = 100

        fetch_limit = limit * 3 if tool_name else limit
        rows = list(queryset.order_by("-created_at", "-id")[:fetch_limit])
        if tool_name:
            rows = [item for item in rows if tool_name in (item.tool_names or [])][:limit]
        return Response(AiInvestigationSerializer(rows, many=True).data)


class AiAssistantInvestigationDetailView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, investigation_id: int):
        investigation = ai_investigation_queryset(request).filter(id=investigation_id).first()
        if investigation is None:
            raise NotFound("Investigação da IA não encontrada.")
        return Response(AiInvestigationSerializer(investigation).data)

    def patch(self, request, investigation_id: int):
        investigation = ai_investigation_queryset(request).filter(id=investigation_id).first()
        if investigation is None:
            raise NotFound("Investigação da IA não encontrada.")

        serializer = AiInvestigationUpdateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        investigation.status = serializer.validated_data["status"]
        investigation.updated_by = request.user
        investigation.save(update_fields=["status", "updated_by", "updated_at"])
        return Response(AiInvestigationSerializer(investigation).data)


class AiAssistantInvestigationFollowUpView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, investigation_id: int):
        investigation = ai_investigation_queryset(request).filter(id=investigation_id).first()
        if investigation is None:
            raise NotFound("Investigação da IA não encontrada.")

        serializer = AiInvestigationFollowUpSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        tenant = request_tenant(request)
        try:
            action = AiInvestigationFollowUpBuilder().prepare(
                investigation=investigation,
                tenant=tenant,
                user=request.user,
                action_type=serializer.validated_data["action_type"],
                language=serializer.validated_data.get("language") or "pt",
            )
        except AiInvestigationFollowUpError as exc:
            raise ValidationError({"action_type": str(exc)}) from exc
        return Response(AiSuggestedActionSerializer(action).data, status=status.HTTP_201_CREATED)


class AiAssistantTasksView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        queryset = ai_task_queryset(request)
        status_value = str(request.query_params.get("status") or "").strip()
        priority = str(request.query_params.get("priority") or "").strip()
        assigned_group = str(request.query_params.get("assigned_group") or "").strip()
        module_key = str(request.query_params.get("module") or request.query_params.get("module_key") or "").strip()
        source_type = str(request.query_params.get("source_type") or "").strip()
        query = str(request.query_params.get("q") or "").strip()

        if status_value:
            queryset = queryset.filter(status=status_value)
        if priority:
            queryset = queryset.filter(priority=priority)
        if assigned_group:
            queryset = queryset.filter(assigned_group=assigned_group)
        if module_key:
            queryset = queryset.filter(module_key=module_key)
        if source_type:
            queryset = queryset.filter(source_type=source_type)
        if query:
            queryset = queryset.filter(
                Q(title__icontains=query)
                | Q(description__icontains=query)
                | Q(source_reference__icontains=query)
                | Q(module_key__icontains=query)
                | Q(assigned_group__icontains=query)
            )

        try:
            limit = min(max(int(request.query_params.get("limit") or 100), 1), 250)
        except (TypeError, ValueError):
            limit = 100

        queryset = queryset.order_by("-created_at", "-id")[:limit]
        return Response(AiOperationalTaskSerializer(queryset, many=True).data)


class AiAssistantTaskDetailView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, task_id: int):
        task = ai_task_queryset(request).filter(id=task_id).first()
        if task is None:
            raise NotFound("Tarefa operacional da IA não encontrada.")

        return Response(AiOperationalTaskSerializer(task).data)

    def patch(self, request, task_id: int):
        task = ai_task_queryset(request).filter(id=task_id).first()
        if task is None:
            raise NotFound("Tarefa operacional da IA não encontrada.")

        serializer = AiOperationalTaskUpdateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        previous_status = task.status
        previous_priority = task.priority
        update_fields = ["updated_by", "updated_at", "metadata"]
        if "status" in data:
            task.status = data["status"]
            update_fields.append("status")
        if "priority" in data:
            task.priority = data["priority"]
            update_fields.append("priority")

        history = list((task.metadata or {}).get("lifecycle_history") or [])
        history.append(
            {
                "at": timezone.now().isoformat(),
                "by_user_id": getattr(request.user, "id", None),
                "by_username": getattr(request.user, "username", "") or getattr(request.user, "email", ""),
                "from_status": previous_status,
                "to_status": task.status,
                "from_priority": previous_priority,
                "to_priority": task.priority,
            }
        )
        task.metadata = {**(task.metadata or {}), "lifecycle_history": history[-50:]}
        task.updated_by = request.user
        task.save(update_fields=list(dict.fromkeys(update_fields)))
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
