from __future__ import annotations

from typing import Any

from apps.ai_assistant.tools.clinical import ClinicalOperationalSummaryTool, LabRequestCollectionGuidanceTool
from apps.ai_assistant.tools.command_center import CommandCenterAlertsTool
from apps.ai_assistant.tools.crud import PrepareCrudOperationTool
from apps.ai_assistant.tools.data_explorer import ExploreDatabaseTool
from apps.ai_assistant.tools.education import EducationSummaryTool
from apps.ai_assistant.tools.finance import FinancialOperationalSummaryTool
from apps.ai_assistant.tools.nursing import NursingPendingWorkTool
from apps.ai_assistant.tools.pharmacy import PharmacyStockSummaryTool
from apps.ai_assistant.tools.reporting import PrepareOperationalReportTool
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
        personal_terms = (
            "quem sou",
            "meu login",
            "meus grupos",
            "minha conta",
            "meu perfil",
            "quem está logado",
            "quem esta logado",
            "who am i",
            "my account",
            "my profile",
            "what can i investigate",
            "que dados posso investigar",
            "o que posso investigar",
        )
        if any(term in normalized for term in personal_terms):
            selected.append(self._tools[GetUserContextTool.name])

        data_terms = (
            "quantos",
            "quantas",
            "listar",
            "lista",
            "mostre",
            "mostrar",
            "procure",
            "buscar",
            "pesquisar",
            "dados",
            "base de dados",
            "banco de dados",
            "registos",
            "registros",
            "tabela",
            "pacientes",
            "faturas",
            "facturas",
            "pagamentos",
            "estudantes",
            "professores",
            "farmácia",
            "farmacia",
            "erros do sistema",
            "system errors",
            "records",
        )
        if any(term in normalized for term in data_terms):
            selected.append(self._tools[ExploreDatabaseTool.name])

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

        if "tarefa" not in normalized and "task" not in normalized and any(
            term in normalized
            for term in (
                "criar",
                "crie",
                "inserir",
                "insira",
                "cadastrar",
                "cadastre",
                "registar",
                "registe",
                "registrar",
                "adicione",
                "adicionar",
                "novo",
                "nova",
                "actualizar",
                "atualizar",
                "actualize",
                "atualize",
                "alterar",
                "altere",
                "editar",
                "edite",
                "corrigir",
                "corrija",
                "apagar",
                "apague",
                "remover",
                "remova",
                "eliminar",
                "elimine",
                "excluir",
                "exclua",
                "create",
                "insert",
                "update",
                "delete",
                "remove",
            )
        ):
            selected.append(self._tools[PrepareCrudOperationTool.name])

        if any(
            term in normalized
            for term in (
                "cria tarefa",
                "criar tarefa",
                "tarefa",
                "atribui",
                "atribuir",
                "encaminha",
                "encaminhar",
                "notifica",
                "notificar",
                "investigar",
                "resolver",
                "follow-up",
                "follow up",
            )
        ):
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
        return unique
