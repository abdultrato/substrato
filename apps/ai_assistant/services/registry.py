from __future__ import annotations

import re
from typing import Any

from apps.ai_assistant.services.alias_normalization import normalize_alias_text
from apps.ai_assistant.services.intent_signals import build_intent_signals
from apps.ai_assistant.services.tool_learning import rank_tools_with_learning
from apps.ai_assistant.tools.clinical import ClinicalOperationalSummaryTool, LabRequestCollectionGuidanceTool
from apps.ai_assistant.tools.command_center import CommandCenterAlertsTool
from apps.ai_assistant.tools.crud import PrepareCrudOperationTool
from apps.ai_assistant.tools.data_explorer import ExploreDatabaseTool
from apps.ai_assistant.tools.education import EducationSummaryTool
from apps.ai_assistant.tools.finance import FinancialOperationalSummaryTool
from apps.ai_assistant.tools.knowledge_base import KnowledgeBaseTool
from apps.ai_assistant.tools.nursing import NursingPendingWorkTool
from apps.ai_assistant.tools.pharmacy import PharmacyStockSummaryTool
from apps.ai_assistant.tools.project_context import ProjectContextTool
from apps.ai_assistant.tools.project_identity import ProjectIdentityTool
from apps.ai_assistant.tools.reporting import PrepareOperationalReportTool
from apps.ai_assistant.tools.sql_analytics import SqlAnalyticsTool, should_select_sql_analytics
from apps.ai_assistant.tools.tasks import PrepareOperationalTaskTool
from apps.ai_assistant.tools.user_context import GetUserContextTool


class AiToolRegistry:
    """Registry explícito das ferramentas disponíveis à IA."""

    def __init__(self) -> None:
        self._tools = {
            GetUserContextTool.name: GetUserContextTool(),
            ExploreDatabaseTool.name: ExploreDatabaseTool(),
            CommandCenterAlertsTool.name: CommandCenterAlertsTool(),
            ClinicalOperationalSummaryTool.name: ClinicalOperationalSummaryTool(),
            LabRequestCollectionGuidanceTool.name: LabRequestCollectionGuidanceTool(),
            NursingPendingWorkTool.name: NursingPendingWorkTool(),
            FinancialOperationalSummaryTool.name: FinancialOperationalSummaryTool(),
            PharmacyStockSummaryTool.name: PharmacyStockSummaryTool(),
            EducationSummaryTool.name: EducationSummaryTool(),
            PrepareCrudOperationTool.name: PrepareCrudOperationTool(),
            PrepareOperationalReportTool.name: PrepareOperationalReportTool(),
            PrepareOperationalTaskTool.name: PrepareOperationalTaskTool(),
            SqlAnalyticsTool.name: SqlAnalyticsTool(),
            ProjectIdentityTool.name: ProjectIdentityTool(),
            ProjectContextTool.name: ProjectContextTool(),
            KnowledgeBaseTool.name: KnowledgeBaseTool(),
        }

    def all(self) -> list:
        return list(self._tools.values())

    def get(self, name: str):
        return self._tools.get(name)

    def list_definitions(self, *, user, policy_guard, language: str = "pt") -> list[dict[str, Any]]:
        definitions = []
        for tool in self.all():
            available = policy_guard.can_use_tool(tool=tool, user=user)
            definition = tool.definition(language=language, available=available)
            definitions.append(
                {
                    "name": definition.name,
                    "description": definition.description,
                    "mode": definition.mode,
                    "required_groups": list(definition.required_groups),
                    "available": definition.available,
                }
            )
        return definitions

    def select_tools(
        self,
        *,
        message: str,
        active_module: str = "",
        tenant=None,
        session_metadata: dict[str, Any] | None = None,
        learning: dict[str, Any] | None = None,
    ) -> list:
        active_module_key = (active_module or "").strip().lower()
        signals = build_intent_signals(
            message=message,
            active_module=active_module_key,
            session_metadata=session_metadata or {},
            tenant=tenant,
        )
        normalized = signals["normalized"]
        resource_modules = set(signals["resource_modules"])
        if signals["resource_ambiguous"] and not (signals["active_module_scoped"] or signals["has_previous_focus"]):
            resource_modules = set()
        has_resource = bool(signals["resource_count"])
        is_task_request = bool(signals["task"])
        is_crud_request = bool(signals["crud"] and not is_task_request)
        selected = []
        if signals["project_identity"]:
            return [self._tools[ProjectIdentityTool.name]]
        if signals["project_context"]:
            return [self._tools[ProjectContextTool.name]]
        if signals["knowledge_base"]:
            return [self._tools[KnowledgeBaseTool.name]]

        if should_select_sql_analytics(message=message, active_module=active_module_key):
            selected.append(self._tools[SqlAnalyticsTool.name])

        if signals["personal"]:
            selected.append(self._tools[GetUserContextTool.name])

        if (signals["data"] or has_resource) and not (is_crud_request or signals["report"] or is_task_request):
            selected.append(self._tools[ExploreDatabaseTool.name])

        if signals["monitoring"] or "monitoring" in resource_modules:
            selected.append(self._tools[CommandCenterAlertsTool.name])

        if _contains_any(normalized, ("frasco", "tubo", "amostra", "colheita", "coleta", "collection", "sample")):
            selected.append(self._tools[LabRequestCollectionGuidanceTool.name])
        elif "clinical" in resource_modules or _contains_any(
            normalized,
            ("clinico", "clínico", "paciente", "requisicao", "requisição", "resultado", "laboratorio", "laboratório"),
        ):
            selected.append(self._tools[ClinicalOperationalSummaryTool.name])

        if "nursing" in resource_modules or _contains_any(normalized, ("enfermagem", "enfermeiro", "procedimento", "internamento", "nursing")):
            selected.append(self._tools[NursingPendingWorkTool.name])

        if resource_modules & {"accounting", "billing", "payments"} or _contains_any(
            normalized,
            ("fatura", "factura", "invoice", "pagamento", "payment", "financeiro", "contabilidade"),
        ):
            selected.append(self._tools[FinancialOperationalSummaryTool.name])

        if "pharmacy" in resource_modules or _contains_any(
            normalized,
            ("farmacia", "farmácia", "medicacao", "medicação", "medicamento", "farmaco", "fármaco", "pharmacy"),
        ):
            selected.append(self._tools[PharmacyStockSummaryTool.name])

        if "education" in resource_modules or _contains_any(
            normalized,
            ("educacao", "educação", "education", "estudante", "student", "matricula", "matrícula", "turma", "professor"),
        ):
            selected.append(self._tools[EducationSummaryTool.name])

        if signals["report"]:
            selected.append(self._tools[PrepareOperationalReportTool.name])

        if is_crud_request:
            selected.append(self._tools[PrepareCrudOperationTool.name])

        if is_task_request:
            selected.append(self._tools[PrepareOperationalTaskTool.name])

        unique = []
        seen = set()
        for tool in selected:
            if tool.name in seen:
                continue
            seen.add(tool.name)
            unique.append(tool)
        if not unique:
            return [self._tools[GetUserContextTool.name]]
        return rank_tools_with_learning(
            selected_tools=unique,
            tool_lookup=self._tools,
            signals=signals,
            learning=learning,
        )


def _contains_any(normalized: str, terms: tuple[str, ...]) -> bool:
    for raw_term in terms:
        term = normalize_alias_text(raw_term)
        if not term:
            continue
        if len(term) <= 3:
            if re.search(rf"(?<!\w){re.escape(term)}(?!\w)", normalized):
                return True
            continue
        if term in normalized:
            return True
    return False
