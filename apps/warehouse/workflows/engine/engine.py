from __future__ import annotations

from dataclasses import dataclass
from typing import Any

from apps.warehouse.workflows.rules.stock import fefo_rule, minimum_stock_rule
from apps.warehouse.workflows.states.stock import StockState
from apps.warehouse.workflows.transitions.stock import StockTransition


@dataclass(frozen=True, slots=True)
class WorkflowDecision:
    action: str
    label_pt: str
    transition: StockTransition


class WarehouseWorkflowEngine:
    def evaluate(self, context: dict[str, Any]) -> list[WorkflowDecision]:
        decisions: list[WorkflowDecision] = []
        if minimum_stock_rule(context):
            decisions.append(
                WorkflowDecision(
                    action="GENERATE_REQUISITION",
                    label_pt="Gerar requisição",
                    transition=StockTransition(
                        from_state=StockState.NORMAL,
                        to_state=StockState.BELOW_MINIMUM,
                        reason="minimum stock reached",
                    ),
                )
            )
        if fefo_rule(context):
            decisions.append(
                WorkflowDecision(
                    action="PRIORITIZE_FEFO",
                    label_pt="Priorizar FEFO",
                    transition=StockTransition(
                        from_state=StockState.NORMAL,
                        to_state=StockState.FEFO_PRIORITIZED,
                        reason="perishable product",
                    ),
                )
            )
        return decisions
