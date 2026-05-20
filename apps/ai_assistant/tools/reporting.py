from __future__ import annotations

from typing import Any

from security.permissions.rbac import GROUPS as RBAC_GROUPS

from .base import AiTool, AiToolContext
from .command_center import coerce_int


REPORT_GROUPS = (
    RBAC_GROUPS["ADMIN"],
    RBAC_GROUPS["CONTABILIDADE"],
    RBAC_GROUPS["RECEPCAO"],
    RBAC_GROUPS["MEDICINA"],
    RBAC_GROUPS["MEDICINA_OCUPACIONAL"],
    RBAC_GROUPS["LABORATORIO"],
    RBAC_GROUPS["ENFERMAGEM"],
    RBAC_GROUPS["FARMACIA"],
    RBAC_GROUPS["PROFESSOR"],
    RBAC_GROUPS["DIRETOR_ESCOLA"],
    RBAC_GROUPS["DIRETOR_ADJUNTO_PEDAGOGICO"],
)


class PrepareOperationalReportTool(AiTool):
    name = "prepare_operational_report"
    description_pt = "Prepara uma exportação de relatório operacional para confirmação humana."
    description_en = "Prepares an operational report export for human confirmation."
    required_groups = REPORT_GROUPS
    mode = "prepare_action"

    def run(self, context: AiToolContext) -> dict[str, Any]:
        message = str(context.arguments.get("message") or "").lower()
        days = coerce_int(context.arguments.get("days"), default=30, min_value=1, max_value=365)
        report_kind = self._report_kind(message=message, active_module=context.active_module)

        return {
            "summary": {
                "title_pt": "Relatório operacional preparado",
                "title_en": "Operational report prepared",
                "metrics": [
                    {"label_pt": "Tipo de relatório", "label_en": "Report kind", "value": report_kind},
                    {"label_pt": "Período", "label_en": "Range", "value": f"{days} dia(s)"},
                    {"label_pt": "Requer confirmação", "label_en": "Requires confirmation", "value": "sim"},
                ],
                "report_intent": {
                    "report_kind": report_kind,
                    "days": days,
                    "format": "markdown",
                },
            },
            "prepared_action": {
                "action_type": "prepare_ai_report_export",
                "requires_confirmation": True,
                "label_pt": "Gerar relatório",
                "label_en": "Generate report",
                "allowed_groups": list(REPORT_GROUPS),
                "report_kind": report_kind,
            },
            "sources": [{"type": "service", "label": "AI Report Builder", "href": "/ai"}],
        }

    @staticmethod
    def _report_kind(*, message: str, active_module: str) -> str:
        normalized = f"{message} {active_module or ''}".lower()
        if any(term in normalized for term in ("fatura", "factura", "invoice", "pagamento", "financeiro", "contabilidade")):
            return "finance"
        if any(term in normalized for term in ("clinico", "clínico", "paciente", "requisicao", "requisição", "laboratorio", "laboratório")):
            return "clinical"
        if any(term in normalized for term in ("enfermagem", "nursing", "procedimento", "internamento")):
            return "nursing"
        if any(term in normalized for term in ("farmacia", "farmácia", "stock", "lote", "medicamento")):
            return "pharmacy"
        if any(term in normalized for term in ("educacao", "educação", "education", "estudante", "turma", "professor")):
            return "education"
        if any(term in normalized for term in ("erro", "error", "slo", "alerta", "monitor")):
            return "command_center"
        return "operational"
