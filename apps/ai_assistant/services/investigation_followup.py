from __future__ import annotations

from typing import Any

from apps.ai_assistant.models import AiInvestigation, AiSuggestedAction
from apps.ai_assistant.services.audit import AiAuditLogger
from apps.ai_assistant.services.task_builder import TASK_GROUPS, infer_operational_task_payload
from apps.ai_assistant.tools.reporting import REPORT_GROUPS


class AiInvestigationFollowUpError(Exception):
    pass


class AiInvestigationFollowUpBuilder:
    """Prepara acções confirmáveis a partir de uma investigação já auditada."""

    def __init__(self) -> None:
        self.audit = AiAuditLogger()

    def prepare(
        self,
        *,
        investigation: AiInvestigation,
        tenant,
        user,
        action_type: str,
        language: str = "pt",
    ) -> AiSuggestedAction:
        language = "en" if language == "en" else "pt"
        if action_type == "create_operational_task":
            return self._prepare_task(investigation=investigation, tenant=tenant, user=user, language=language)
        if action_type == "prepare_ai_report_export":
            return self._prepare_report(investigation=investigation, tenant=tenant, user=user, language=language)
        raise AiInvestigationFollowUpError("Tipo de seguimento não suportado para investigação.")

    def _prepare_task(self, *, investigation: AiInvestigation, tenant, user, language: str) -> AiSuggestedAction:
        payload = infer_operational_task_payload(
            message=self._message_context(investigation),
            active_module=str((investigation.scope or {}).get("active_module") or ""),
            language=language,
            request_code=str(investigation.custom_id or investigation.id or ""),
        )
        title_pt = f"Dar seguimento à investigação {investigation.custom_id or investigation.id}"
        title_en = f"Follow up investigation {investigation.custom_id or investigation.id}"
        payload = {
            **payload,
            "title": title_en if language == "en" else title_pt,
            "title_pt": title_pt,
            "title_en": title_en,
            "description": self._task_description(investigation=investigation, language=language),
            "source_type": "ai_investigation",
            "source_reference": str(investigation.custom_id or investigation.id or ""),
            "metadata": {
                "ai_investigation_id": investigation.id,
                "ai_investigation_custom_id": investigation.custom_id,
                "intent": investigation.intent,
            },
            "allowed_groups": list(TASK_GROUPS),
            "label_pt": "Criar tarefa desta investigação",
            "label_en": "Create task from this investigation",
        }
        summary = (
            f"Criar tarefa operacional a partir da investigação {investigation.custom_id or investigation.id}."
            if language == "pt"
            else f"Create an operational task from investigation {investigation.custom_id or investigation.id}."
        )
        return self.audit.create_suggested_action(
            tenant=tenant,
            session=investigation.session,
            user=user,
            action_type="create_operational_task",
            payload=payload,
            requires_confirmation=True,
            confirmation_summary=summary,
        )

    def _prepare_report(self, *, investigation: AiInvestigation, tenant, user, language: str) -> AiSuggestedAction:
        title_pt = f"Relatório da investigação {investigation.custom_id or investigation.id}"
        title_en = f"Investigation report {investigation.custom_id or investigation.id}"
        payload = {
            "report_kind": self._report_kind(investigation.intent),
            "format": "markdown",
            "language": language,
            "title_pt": title_pt,
            "title_en": title_en,
            "filters": {
                "investigation_id": investigation.id,
                "investigation_custom_id": investigation.custom_id or "",
                "intent": investigation.intent,
                "status": investigation.status,
            },
            "executive_summary": investigation.result_summary or investigation.question or investigation.title,
            "tool_summaries": [
                {
                    "tool_name": "ai_investigation",
                    "title_pt": "Achados da investigação",
                    "title_en": "Investigation findings",
                    "metrics": self._finding_metrics(investigation.findings or []),
                    "collection_guidance": [],
                }
            ],
            "sources": investigation.sources or [],
            "allowed_groups": list(REPORT_GROUPS),
            "label_pt": "Gerar relatório desta investigação",
            "label_en": "Generate report from this investigation",
            "ai_investigation_id": investigation.id,
            "ai_investigation_custom_id": investigation.custom_id,
        }
        summary = (
            f"Gerar relatório auditável da investigação {investigation.custom_id or investigation.id}."
            if language == "pt"
            else f"Generate an auditable report from investigation {investigation.custom_id or investigation.id}."
        )
        return self.audit.create_suggested_action(
            tenant=tenant,
            session=investigation.session,
            user=user,
            action_type="prepare_ai_report_export",
            payload=payload,
            requires_confirmation=True,
            confirmation_summary=summary,
        )

    @staticmethod
    def _message_context(investigation: AiInvestigation) -> str:
        finding_text = " ".join(str(item.get("title") or "") for item in (investigation.findings or [])[:6] if isinstance(item, dict))
        return " ".join(
            part
            for part in [
                investigation.title,
                investigation.question,
                investigation.intent,
                investigation.result_summary,
                finding_text,
            ]
            if part
        )

    @staticmethod
    def _task_description(*, investigation: AiInvestigation, language: str) -> str:
        findings = investigation.findings or []
        lines = [
            (
                f"Follow-up task prepared from AI investigation {investigation.custom_id or investigation.id}."
                if language == "en"
                else f"Tarefa de seguimento preparada a partir da investigação da IA {investigation.custom_id or investigation.id}."
            ),
            "",
            investigation.result_summary or investigation.question or investigation.title,
        ]
        for item in findings[:6]:
            if not isinstance(item, dict):
                continue
            title = str(item.get("title") or "").strip()
            detail = str(item.get("detail") or "").strip()
            if title or detail:
                lines.append(f"- {title}: {detail}".strip())
        return "\n".join(line for line in lines if line is not None)[:4000]

    @staticmethod
    def _finding_metrics(findings: list[dict[str, Any]]) -> list[dict[str, Any]]:
        metrics: list[dict[str, Any]] = []
        for index, item in enumerate(findings[:12], start=1):
            if not isinstance(item, dict):
                continue
            title = str(item.get("title") or f"Achado {index}")
            detail = item.get("detail") or item.get("severity") or "-"
            metrics.append(
                {
                    "label_pt": title,
                    "label_en": title,
                    "value": detail,
                }
            )
        return metrics or [{"label_pt": "Achados", "label_en": "Findings", "value": 0}]

    @staticmethod
    def _report_kind(intent: str) -> str:
        mapping = {
            "financial_review": "finance",
            "pharmacy_stock": "pharmacy",
            "education_review": "education",
            "nursing_flow": "nursing",
            "sample_collection": "clinical",
            "data_exploration": "operational",
            "operational_health": "command_center",
            "access_review": "operational",
        }
        return mapping.get(intent or "", "operational")
