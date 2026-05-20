from __future__ import annotations

from typing import Any

from apps.ai_assistant.services.task_builder import TASK_GROUPS, infer_operational_task_payload

from .base import AiTool, AiToolContext


class PrepareOperationalTaskTool(AiTool):
    name = "prepare_operational_task"
    description_pt = "Prepara uma tarefa interna para uma equipa operacional, sem executar antes da confirmação."
    description_en = "Prepares an internal task for an operational team without executing before confirmation."
    required_groups = TASK_GROUPS
    mode = "prepare_action"

    def run(self, context: AiToolContext) -> dict[str, Any]:
        payload = infer_operational_task_payload(
            message=str(context.arguments.get("message") or ""),
            active_module=context.active_module,
            language=context.language,
            request_code=str(context.arguments.get("request_code") or ""),
        )

        return {
            "summary": {
                "title_pt": "Tarefa operacional preparada",
                "title_en": "Operational task prepared",
                "metrics": [
                    {"label_pt": "Grupo responsável", "label_en": "Responsible group", "value": payload["assigned_group"]},
                    {"label_pt": "Módulo", "label_en": "Module", "value": payload["module_key"]},
                    {"label_pt": "Prioridade", "label_en": "Priority", "value": payload["priority"]},
                ],
                "task_intent": payload,
            },
            "prepared_action": {
                "action_type": "create_operational_task",
                "requires_confirmation": True,
                "label_pt": "Criar tarefa operacional",
                "label_en": "Create operational task",
                "payload": payload,
                "allowed_groups": list(TASK_GROUPS),
            },
            "sources": [{"type": "service", "label": "AI Task Builder", "href": "/ai/tasks"}],
        }
