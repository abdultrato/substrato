from __future__ import annotations

from typing import Any

from django.utils import timezone

from apps.ai_assistant.models import AiMessage, AiPolicyEvent, AiSession, AiSuggestedAction, AiToolCall

from .redaction import redact_text, redact_value, summarize_for_storage


class AiAuditLogger:
    """Persistência auditável das sessões, mensagens, ferramentas, políticas e acções."""

    def get_or_create_session(
        self,
        *,
        tenant,
        user,
        session_id: int | None,
        language: str,
        active_module: str,
        title_seed: str,
    ) -> AiSession:
        session = None
        if session_id:
            session = (
                AiSession.objects.filter(
                    id=session_id,
                    tenant=tenant,
                    user=user,
                    deleted=False,
                    status=AiSession.Status.ACTIVE,
                )
                .order_by("-updated_at")
                .first()
            )

        if session is None:
            title = redact_text(title_seed or "").strip()[:120] or "Sessão da IA"
            session = AiSession.objects.create(
                tenant=tenant,
                user=user,
                title=title,
                language=language,
                active_module=active_module or "",
                status=AiSession.Status.ACTIVE,
                last_message_at=timezone.now(),
            )
        else:
            session.language = language or session.language
            session.active_module = active_module or session.active_module
            session.last_message_at = timezone.now()
            session.save(update_fields=["language", "active_module", "last_message_at", "updated_at"])

        return session

    def create_message(
        self,
        *,
        tenant,
        session: AiSession,
        role: str,
        content: str,
        user=None,
        metadata: dict[str, Any] | None = None,
    ) -> AiMessage:
        return AiMessage.objects.create(
            tenant=tenant,
            session=session,
            user=user,
            role=role,
            content=content or "",
            content_redacted=redact_text(content or ""),
            metadata=redact_value(metadata or {}),
        )

    def record_tool_call(
        self,
        *,
        tenant,
        session: AiSession,
        message: AiMessage | None,
        tool_name: str,
        mode: str,
        arguments: dict[str, Any],
        result: dict[str, Any] | None = None,
        status: str = AiToolCall.Status.SUCCESS,
        duration_ms: int | None = None,
        error_message: str = "",
    ) -> AiToolCall:
        sources = []
        if isinstance(result, dict):
            raw_sources = result.get("sources") or []
            sources = redact_value(raw_sources) if isinstance(raw_sources, list) else []
        return AiToolCall.objects.create(
            tenant=tenant,
            session=session,
            message=message,
            tool_name=tool_name,
            mode=mode,
            input_redacted=redact_value(arguments or {}),
            output_summary=summarize_for_storage(result or error_message),
            sources=sources,
            status=status,
            duration_ms=duration_ms,
            error_message=redact_text(error_message or ""),
        )

    def record_policy_event(
        self,
        *,
        tenant,
        session: AiSession | None,
        user,
        policy_key: str,
        reason: str,
        blocked: bool,
        severity: str = AiPolicyEvent.Severity.WARNING,
        metadata: dict[str, Any] | None = None,
    ) -> AiPolicyEvent:
        return AiPolicyEvent.objects.create(
            tenant=tenant,
            session=session,
            user=user if getattr(user, "is_authenticated", False) else None,
            severity=severity,
            policy_key=policy_key,
            reason=redact_text(reason or ""),
            blocked=blocked,
            metadata=redact_value(metadata or {}),
        )

    def create_suggested_action(
        self,
        *,
        tenant,
        session: AiSession,
        user,
        action_type: str,
        payload: dict[str, Any],
        requires_confirmation: bool,
        confirmation_summary: str,
        result_href: str = "",
    ) -> AiSuggestedAction:
        return AiSuggestedAction.objects.create(
            tenant=tenant,
            session=session,
            created_by=user if getattr(user, "is_authenticated", False) else None,
            action_type=action_type,
            payload=payload or {},
            payload_redacted=redact_value(payload or {}),
            status=AiSuggestedAction.Status.PENDING_CONFIRMATION,
            requires_confirmation=requires_confirmation,
            confirmation_summary=redact_text(confirmation_summary or ""),
            result_href=result_href or str((payload or {}).get("href") or ""),
        )
