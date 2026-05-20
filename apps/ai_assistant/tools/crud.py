from __future__ import annotations

from apps.ai_assistant.models import AiSession
from apps.ai_assistant.services.crud import AiCrudConversationManager

from .base import AiTool, AiToolContext


class PrepareCrudOperationTool(AiTool):
    name = "prepare_crud_operation"
    description_pt = "Prepara criação, alteração ou remoção de registos por conversa, com RBAC e confirmação."
    description_en = "Prepares conversational create, update or delete operations with RBAC and confirmation."
    required_groups: tuple[str, ...] = ()
    mode = "prepare_action"

    def run(self, context: AiToolContext) -> dict:
        session_id = context.arguments.get("ai_session_id")
        session = AiSession.objects.filter(
            id=session_id,
            tenant=context.tenant,
            user=context.user,
            deleted=False,
            status=AiSession.Status.ACTIVE,
        ).first()
        if session is None:
            return {
                "summary": {
                    "title_pt": "Sessão da IA não encontrada",
                    "title_en": "AI session not found",
                    "metrics": [],
                },
                "crud": {"status": "session_not_found"},
                "access_denied": False,
                "sources": [],
            }

        return AiCrudConversationManager().prepare(
            tenant=context.tenant,
            user=context.user,
            session=session,
            message=str(context.arguments.get("message") or ""),
            language=context.language,
        )
