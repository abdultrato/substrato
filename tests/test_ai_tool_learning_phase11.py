from __future__ import annotations

from io import StringIO
import json

from django.core.management import call_command

from apps.ai_assistant.services.proactive_guidance import build_proactive_guidance
from apps.ai_assistant.services.registry import AiToolRegistry
from apps.ai_assistant.services.tool_learning import (
    build_phase11_tool_learning_report,
    tool_weights_from_learning,
)
from apps.ai_assistant.tools.finance import FinancialOperationalSummaryTool
from apps.ai_assistant.tools.reporting import PrepareOperationalReportTool


def _billing_focus() -> dict:
    return {
        "intent": "financial_review",
        "resources": [{"basename": "billing-invoice", "module": "billing"}],
        "modules": ["billing"],
        "filters": [{"basename": "billing-invoice", "kind": "domain_pending_status"}],
    }


def _financial_report_learning() -> dict:
    guidance = build_proactive_guidance(conversation_focus=_billing_focus(), language="pt")
    suggestion = next(
        item for item in guidance["suggestions"] if item["prompt"] == "Gere um relatorio financeiro desta investigacao."
    )
    return {
        "by_suggestion": {
            suggestion["id"]: {
                **suggestion,
                "selected_count": 5,
                "positive_count": 2,
                "negative_count": 0,
            }
        },
        "events": [{"id": suggestion["id"], "event": "selected"} for _ in range(5)],
        "total_events": 7,
        "scope": {"kind": "tenant_profile", "profile_key": "groups:contabilidade"},
    }


def test_phase11_maps_learned_billing_report_suggestion_to_finance_and_report_tools():
    weights = tool_weights_from_learning(_financial_report_learning())

    assert weights["weights"][FinancialOperationalSummaryTool.name] > 0
    assert weights["weights"][PrepareOperationalReportTool.name] > 0
    assert weights["scope"]["profile_key"] == "groups:contabilidade"


def test_phase11_learning_reorders_compatible_read_tools_without_adding_report():
    registry = AiToolRegistry()
    baseline = [tool.name for tool in registry.select_tools(message="faturas pendentes", active_module="ai")]
    learned = [
        tool.name
        for tool in registry.select_tools(
            message="faturas pendentes",
            active_module="ai",
            learning=_financial_report_learning(),
        )
    ]

    assert FinancialOperationalSummaryTool.name in baseline
    assert learned[0] == FinancialOperationalSummaryTool.name
    assert PrepareOperationalReportTool.name not in learned


def test_phase11_learning_allows_report_tool_when_current_message_requests_report():
    registry = AiToolRegistry()
    learned = [
        tool.name
        for tool in registry.select_tools(
            message="relatorio financeiro",
            active_module="ai",
            learning=_financial_report_learning(),
        )
    ]

    assert FinancialOperationalSummaryTool.name in learned
    assert PrepareOperationalReportTool.name in learned


def test_phase11_report_and_command_json():
    report = build_phase11_tool_learning_report()

    assert report["phase"] == 11
    assert report["summary"]["report_not_added_without_report_signal"] is True
    assert FinancialOperationalSummaryTool.name in report["summary"]["weights"]

    output = StringIO()
    call_command("audit_ai_tool_learning_phase11", "--format", "json", stdout=output)
    payload = json.loads(output.getvalue())
    assert payload["phase"] == 11
    assert payload["summary"]["report_not_added_without_report_signal"] is True
