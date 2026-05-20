from __future__ import annotations

from typing import Any

from apps.ai_assistant.tools.clinical import ClinicalOperationalSummaryTool, LabRequestCollectionGuidanceTool
from apps.ai_assistant.tools.command_center import CommandCenterAlertsTool
from apps.ai_assistant.tools.education import EducationSummaryTool
from apps.ai_assistant.tools.finance import FinancialOperationalSummaryTool
from apps.ai_assistant.tools.nursing import NursingPendingWorkTool
from apps.ai_assistant.tools.pharmacy import PharmacyStockSummaryTool
from apps.ai_assistant.tools.reporting import PrepareOperationalReportTool


class AiToolRegistry:
    """Registry explícito das ferramentas disponíveis à IA."""

    def __init__(self) -> None:
        self._tools = {
            CommandCenterAlertsTool.name: CommandCenterAlertsTool(),
            ClinicalOperationalSummaryTool.name: ClinicalOperationalSummaryTool(),
            LabRequestCollectionGuidanceTool.name: LabRequestCollectionGuidanceTool(),
            NursingPendingWorkTool.name: NursingPendingWorkTool(),
            FinancialOperationalSummaryTool.name: FinancialOperationalSummaryTool(),
            PharmacyStockSummaryTool.name: PharmacyStockSummaryTool(),
            EducationSummaryTool.name: EducationSummaryTool(),
            PrepareOperationalReportTool.name: PrepareOperationalReportTool(),
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

    def select_tools(self, *, message: str, active_module: str = "") -> list:
        normalized = f"{message or ''} {active_module or ''}".lower()
        selected = []
        command_terms = (
            "alert",
            "command",
            "erro",
            "error",
            "falha",
            "health",
            "monitor",
            "outbox",
            "rota",
            "slo",
            "saúde",
            "estado operacional",
        )
        if active_module in {"monitoring", "command_center"} or any(term in normalized for term in command_terms):
            selected.append(self._tools[CommandCenterAlertsTool.name])

        if any(term in normalized for term in ("frasco", "tubo", "amostra", "colheita", "coleta", "collection", "sample")):
            selected.append(self._tools[LabRequestCollectionGuidanceTool.name])
        elif any(term in normalized for term in ("clinico", "clínico", "paciente", "requisicao", "requisição", "resultado", "laboratorio", "laboratório")):
            selected.append(self._tools[ClinicalOperationalSummaryTool.name])

        if any(term in normalized for term in ("enfermagem", "enfermeiro", "procedimento", "internamento", "nursing")):
            selected.append(self._tools[NursingPendingWorkTool.name])

        if any(term in normalized for term in ("fatura", "factura", "invoice", "pagamento", "payment", "financeiro", "contabilidade")):
            selected.append(self._tools[FinancialOperationalSummaryTool.name])

        if any(term in normalized for term in ("farmacia", "farmácia", "stock", "estoque", "lote", "medicamento", "pharmacy")):
            selected.append(self._tools[PharmacyStockSummaryTool.name])

        if any(term in normalized for term in ("educacao", "educação", "education", "estudante", "student", "matricula", "matrícula", "turma", "professor")):
            selected.append(self._tools[EducationSummaryTool.name])

        if any(term in normalized for term in ("relatorio", "relatório", "report", "export", "exportar", "pdf", "csv", "word", "download")):
            selected.append(self._tools[PrepareOperationalReportTool.name])

        unique = []
        seen = set()
        for tool in selected:
            if tool.name in seen:
                continue
            seen.add(tool.name)
            unique.append(tool)
        return unique
