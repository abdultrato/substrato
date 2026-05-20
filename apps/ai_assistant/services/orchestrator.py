from __future__ import annotations

import re
from time import perf_counter
from typing import Any

from django.conf import settings
from django.db import transaction

from apps.ai_assistant.models import AiMessage, AiSuggestedAction, AiToolCall
from apps.ai_assistant.tools.base import AiToolContext

from .audit import AiAuditLogger
from .investigation import AiInvestigationBuilder
from .llm_gateway import LocalLlmGateway
from .policy import AiPolicyError, AiPolicyGuard
from .registry import AiToolRegistry
from .response_schema import build_response_schema


class AiOrchestrator:
    """Orquestra chat, política, ferramentas, resposta e auditoria."""

    def __init__(self) -> None:
        self.audit = AiAuditLogger()
        self.policy = AiPolicyGuard()
        self.registry = AiToolRegistry()
        self.gateway = LocalLlmGateway()
        self.investigations = AiInvestigationBuilder()

    def chat(
        self,
        *,
        user,
        tenant,
        message: str,
        session_id: int | None = None,
        language: str = "pt",
        active_module: str = "",
        context: dict[str, Any] | None = None,
    ) -> dict[str, Any]:
        if not getattr(settings, "AI_ASSISTANT_ENABLED", True):
            raise AiPolicyError("ai_assistant_disabled", "A IA Operacional está desactivada neste ambiente.")

        context = context or {}
        language = "en" if language == "en" else "pt"
        active_module = (active_module or context.get("active_module") or "").strip()[:80]

        self.policy.ensure_chat_allowed(user=user, tenant=tenant)

        with transaction.atomic():
            session = self.audit.get_or_create_session(
                tenant=tenant,
                user=user,
                session_id=session_id,
                language=language,
                active_module=active_module,
                title_seed=message,
            )
            user_message = self.audit.create_message(
                tenant=tenant,
                session=session,
                role=AiMessage.Role.USER,
                content=message,
                user=user,
                metadata={"active_module": active_module, "context": context},
            )

            arguments = self._build_tool_arguments(message=message, context=context)
            selected_tools = self.registry.select_tools(message=message, active_module=active_module)
            tool_results: list[dict[str, Any]] = []
            blocked_tools: list[dict[str, Any]] = []
            tool_call_payload: list[dict[str, Any]] = []

            for tool in selected_tools:
                try:
                    self.policy.ensure_tool_allowed(tool=tool, user=user)
                except AiPolicyError as exc:
                    self.audit.record_policy_event(
                        tenant=tenant,
                        session=session,
                        user=user,
                        policy_key=exc.policy_key,
                        reason=exc.reason,
                        blocked=True,
                        metadata={"tool_name": tool.name},
                    )
                    call = self.audit.record_tool_call(
                        tenant=tenant,
                        session=session,
                        message=user_message,
                        tool_name=tool.name,
                        mode=tool.mode,
                        arguments=arguments,
                        status=AiToolCall.Status.BLOCKED,
                        error_message=exc.reason,
                    )
                    blocked_tools.append({"tool_name": tool.name, "reason": exc.reason})
                    tool_call_payload.append(self._tool_call_payload(call))
                    continue

                started = perf_counter()
                try:
                    result = tool.run(
                        AiToolContext(
                            tenant=tenant,
                            user=user,
                            arguments=arguments,
                            language=language,
                            active_module=active_module,
                        )
                    )
                    duration_ms = int((perf_counter() - started) * 1000)
                    call = self.audit.record_tool_call(
                        tenant=tenant,
                        session=session,
                        message=user_message,
                        tool_name=tool.name,
                        mode=tool.mode,
                        arguments=arguments,
                        result=result,
                        status=AiToolCall.Status.SUCCESS,
                        duration_ms=duration_ms,
                    )
                    tool_results.append({"tool_name": tool.name, "result": result, "duration_ms": duration_ms})
                    tool_call_payload.append(self._tool_call_payload(call))
                except Exception as exc:
                    duration_ms = int((perf_counter() - started) * 1000)
                    call = self.audit.record_tool_call(
                        tenant=tenant,
                        session=session,
                        message=user_message,
                        tool_name=tool.name,
                        mode=tool.mode,
                        arguments=arguments,
                        status=AiToolCall.Status.ERROR,
                        duration_ms=duration_ms,
                        error_message=str(exc),
                    )
                    tool_call_payload.append(self._tool_call_payload(call))

            answer = self.gateway.build_answer(
                question=message,
                language=language,
                tool_results=tool_results,
                blocked_tools=blocked_tools,
            )

            sources = self._collect_sources(tool_results)
            suggested_actions = self._create_suggested_actions(
                tenant=tenant,
                session=session,
                user=user,
                language=language,
                tool_results=tool_results,
                arguments=arguments,
            )
            investigation_payload = self._create_investigation(
                tenant=tenant,
                session=session,
                user=user,
                question=message,
                language=language,
                active_module=active_module,
                tool_results=tool_results,
                blocked_tools=blocked_tools,
                sources=sources,
                suggested_actions=suggested_actions,
            )
            response_schema = build_response_schema(
                tool_results=tool_results,
                sources=sources,
                suggested_actions=suggested_actions,
                investigation=investigation_payload,
                language=language,
            )
            assistant_message = self.audit.create_message(
                tenant=tenant,
                session=session,
                role=AiMessage.Role.ASSISTANT,
                content=answer,
                metadata={
                    "sources": sources,
                    "tool_calls": tool_call_payload,
                    "suggested_actions": suggested_actions,
                    "investigation": investigation_payload,
                    "schema": response_schema,
                    "provider": self.gateway.provider,
                },
            )

            session.last_message_at = assistant_message.created_at
            session.save(update_fields=["last_message_at", "updated_at"])

            return {
                "session_id": session.id,
                "message_id": assistant_message.id,
                "answer": answer,
                "language": language,
                "sources": sources,
                "tool_calls": tool_call_payload,
                "suggested_actions": suggested_actions,
                "investigation": investigation_payload,
                "schema": response_schema,
                "provider": self.gateway.provider,
            }

    def _build_tool_arguments(self, *, message: str, context: dict[str, Any]) -> dict[str, Any]:
        filters = context.get("filters") if isinstance(context.get("filters"), dict) else {}
        days = filters.get("days") or context.get("days")
        request_code = filters.get("request_code") or filters.get("request") or context.get("request_code") or ""
        if not days:
            match = re.search(r"(\d{1,3})\s*(dias|days|d)\b", message or "", flags=re.IGNORECASE)
            if match:
                days = match.group(1)
        if not days and re.search(r"24\s*(h|horas|hours)", message or "", flags=re.IGNORECASE):
            days = 1
        if not request_code:
            match = re.search(r"\bREQ-[A-Za-z0-9-]+", message or "", flags=re.IGNORECASE)
            if match:
                request_code = match.group(0).upper()
        default_days = 30 if re.search(r"\b(relatorio|relatório|report|export|exportar)\b", message or "", flags=re.IGNORECASE) else 7
        return {"days": days or default_days, "top": filters.get("top") or 8, "request_code": request_code, "message": message}

    def _collect_sources(self, tool_results: list[dict[str, Any]]) -> list[dict[str, Any]]:
        sources: list[dict[str, Any]] = []
        seen = set()
        for item in tool_results:
            result = item.get("result") or {}
            for source in result.get("sources") or []:
                key = (source.get("type"), source.get("label"), source.get("href"))
                if key in seen:
                    continue
                seen.add(key)
                sources.append(source)
        return sources

    def _create_investigation(
        self,
        *,
        tenant,
        session,
        user,
        question: str,
        language: str,
        active_module: str,
        tool_results: list[dict[str, Any]],
        blocked_tools: list[dict[str, Any]],
        sources: list[dict[str, Any]],
        suggested_actions: list[dict[str, Any]],
    ) -> dict[str, Any] | None:
        build = self.investigations.build(
            question=question,
            language=language,
            active_module=active_module,
            tool_results=tool_results,
            blocked_tools=blocked_tools,
            sources=sources,
            suggested_actions=suggested_actions,
        )
        if not build.payload or not build.should_persist:
            return None
        investigation = self.investigations.persist(
            tenant=tenant,
            session=session,
            user=user,
            payload=build.payload,
        )
        return self.investigations.serialize(investigation, language=language)

    def _create_suggested_actions(
        self,
        *,
        tenant,
        session,
        user,
        language: str,
        tool_results: list[dict[str, Any]],
        arguments: dict[str, Any],
    ) -> list[dict[str, Any]]:
        action_payloads = []
        command_result = next((item.get("result") for item in tool_results if item.get("tool_name") == "get_command_center_alerts"), None)
        if command_result:
            days = (command_result.get("range") or {}).get("days") or 7
            href = f"/monitoring/command-center?days={days}"
            summary = (
                f"Open Command Center filtered to {days} day(s)."
                if language == "en"
                else f"Abrir o Command Center filtrado para {days} dia(s)."
            )
            action = self.audit.create_suggested_action(
                tenant=tenant,
                session=session,
                user=user,
                action_type="open_filtered_navigation",
                payload={"href": href, "label_pt": "Abrir Command Center", "label_en": "Open Command Center"},
                requires_confirmation=False,
                confirmation_summary=summary,
                result_href=href,
            )
            action_payloads.append(self._action_payload(action))

        report_result = next((item.get("result") for item in tool_results if item.get("tool_name") == "prepare_operational_report"), None)
        if report_result and report_result.get("prepared_action"):
            prepared = report_result.get("prepared_action") or {}
            report_kind = str(prepared.get("report_kind") or "operational")
            days = arguments.get("days") or ((report_result.get("summary") or {}).get("report_intent") or {}).get("days") or 30
            title_pt, title_en = self._report_titles(report_kind=report_kind, days=days)
            payload = {
                "report_kind": report_kind,
                "format": "markdown",
                "language": language,
                "title_pt": title_pt,
                "title_en": title_en,
                "filters": {
                    "days": days,
                    "request_code": arguments.get("request_code") or "",
                    "active_module": session.active_module or "",
                },
                "executive_summary": (
                    f"Relatório preparado pela IA com {len(tool_results)} ferramenta(s) interna(s)."
                    if language == "pt"
                    else f"Report prepared by AI with {len(tool_results)} internal tool(s)."
                ),
                "tool_summaries": self._report_tool_summaries(tool_results),
                "sources": self._collect_sources(tool_results),
                "allowed_groups": list(prepared.get("allowed_groups") or []),
            }
            confirmation_summary = (
                f"Gerar relatório operacional em Markdown para {days} dia(s)."
                if language == "pt"
                else f"Generate operational Markdown report for {days} day(s)."
            )
            action = self.audit.create_suggested_action(
                tenant=tenant,
                session=session,
                user=user,
                action_type=str(prepared.get("action_type") or "prepare_ai_report_export"),
                payload={
                    **payload,
                    "label_pt": prepared.get("label_pt") or "Gerar relatório",
                    "label_en": prepared.get("label_en") or "Generate report",
                },
                requires_confirmation=bool(prepared.get("requires_confirmation", True)),
                confirmation_summary=confirmation_summary,
            )
            action_payloads.append(self._action_payload(action))

        task_result = next((item.get("result") for item in tool_results if item.get("tool_name") == "prepare_operational_task"), None)
        if task_result and task_result.get("prepared_action"):
            prepared = task_result.get("prepared_action") or {}
            payload = dict(prepared.get("payload") or {})
            confirmation_summary = (
                f"Criar tarefa operacional para {payload.get('assigned_group') or 'equipa responsável'}."
                if language == "pt"
                else f"Create operational task for {payload.get('assigned_group') or 'responsible team'}."
            )
            action = self.audit.create_suggested_action(
                tenant=tenant,
                session=session,
                user=user,
                action_type=str(prepared.get("action_type") or "create_operational_task"),
                payload={
                    **payload,
                    "label_pt": prepared.get("label_pt") or "Criar tarefa operacional",
                    "label_en": prepared.get("label_en") or "Create operational task",
                    "allowed_groups": list(prepared.get("allowed_groups") or payload.get("allowed_groups") or []),
                },
                requires_confirmation=bool(prepared.get("requires_confirmation", True)),
                confirmation_summary=confirmation_summary,
            )
            action_payloads.append(self._action_payload(action))
        return action_payloads

    @staticmethod
    def _report_titles(*, report_kind: str, days: Any) -> tuple[str, str]:
        titles = {
            "finance": ("Relatório financeiro operacional", "Financial operational report"),
            "clinical": ("Relatório clínico operacional", "Clinical operational report"),
            "nursing": ("Relatório de enfermagem operacional", "Nursing operational report"),
            "pharmacy": ("Relatório de farmácia operacional", "Pharmacy operational report"),
            "education": ("Relatório escolar operacional", "Education operational report"),
            "command_center": ("Relatório do Command Center", "Command Center report"),
        }
        title_pt, title_en = titles.get(report_kind, ("Relatório operacional da IA", "AI operational report"))
        return f"{title_pt} - {days} dia(s)", f"{title_en} - {days} day(s)"

    @staticmethod
    def _report_tool_summaries(tool_results: list[dict[str, Any]]) -> list[dict[str, Any]]:
        summaries: list[dict[str, Any]] = []
        for item in tool_results:
            if item.get("tool_name") == "prepare_operational_report":
                continue
            result = item.get("result") or {}
            summary = result.get("summary") or {}
            if not summary:
                continue
            summaries.append(
                {
                    "tool_name": item.get("tool_name"),
                    "title_pt": summary.get("title_pt") or item.get("tool_name"),
                    "title_en": summary.get("title_en") or item.get("tool_name"),
                    "metrics": summary.get("metrics") or [],
                    "collection_guidance": summary.get("collection_guidance") or [],
                }
            )
        if summaries:
            return summaries
        return [
            {
                "tool_name": "prepare_operational_report",
                "title_pt": "Relatório operacional preparado",
                "title_en": "Operational report prepared",
                "metrics": [{"label_pt": "Estado", "label_en": "Status", "value": "preparado"}],
                "collection_guidance": [],
            }
        ]

    @staticmethod
    def _tool_call_payload(call: AiToolCall) -> dict[str, Any]:
        return {
            "id": call.id,
            "tool_name": call.tool_name,
            "status": call.status,
            "duration_ms": call.duration_ms,
            "mode": call.mode,
        }

    @staticmethod
    def _action_payload(action: AiSuggestedAction) -> dict[str, Any]:
        payload = action.payload or {}
        return {
            "id": action.id,
            "action_type": action.action_type,
            "requires_confirmation": action.requires_confirmation,
            "status": action.status,
            "href": payload.get("href") or action.result_href,
            "result_href": action.result_href,
            "label_pt": payload.get("label_pt") or action.confirmation_summary,
            "label_en": payload.get("label_en") or action.confirmation_summary,
            "confirmation_summary": action.confirmation_summary,
        }
