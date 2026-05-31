from __future__ import annotations

from io import StringIO
import json

from django.core.management import call_command

from apps.ai_assistant.services.intent_router import AiIntentRouter
from apps.ai_assistant.services.registry import AiToolRegistry
from apps.ai_assistant.services.resource_disambiguation import (
    build_phase6_disambiguation_report,
    resolve_resource_matches,
)
from apps.ai_assistant.tools.data_explorer import ExploreDatabaseTool


def test_phase6_marks_generic_stock_as_ambiguous_without_context():
    result = resolve_resource_matches("stock", active_module="ai")

    assert result.ambiguous is True
    assert result.ambiguity_reason == "generic_stock_without_module_context"
    assert {"pharmacy", "warehouse"}.issubset(set(result.candidate_modules))


def test_phase6_active_module_reranks_stock_to_pharmacy_or_warehouse():
    pharmacy = resolve_resource_matches("stock", active_module="pharmacy")
    warehouse = resolve_resource_matches("stock", active_module="warehouse")

    assert pharmacy.ambiguous is False
    assert pharmacy.matches[0].descriptor.prefix == "pharmacy"
    assert "modulo_activo:pharmacy" in pharmacy.matches[0].reasons

    assert warehouse.ambiguous is False
    assert warehouse.matches[0].descriptor.prefix == "warehouse"
    assert "modulo_activo:warehouse" in warehouse.matches[0].reasons


def test_phase6_domain_terms_resolve_stock_without_active_module():
    pharmacy = resolve_resource_matches("stock de farmacia", active_module="ai")
    warehouse = resolve_resource_matches("stock do armazem", active_module="ai")

    assert pharmacy.ambiguous is False
    assert pharmacy.matches[0].descriptor.prefix == "pharmacy"
    assert "termos_dominio:pharmacy" in pharmacy.matches[0].reasons

    assert warehouse.ambiguous is False
    assert warehouse.matches[0].descriptor.prefix == "warehouse"
    assert "termos_dominio:warehouse" in warehouse.matches[0].reasons


def test_phase6_router_clarifies_generic_ambiguous_resource():
    decision = AiIntentRouter().analyze(message="stock", active_module="ai")

    assert decision.needs_clarification is True
    assert decision.intent == "ambiguous_resource"
    assert decision.reason == "generic_stock_without_module_context"
    assert "Farmácia" in decision.options_pt
    assert "Armazém/Logística" in decision.options_pt


def test_phase6_router_accepts_stock_inside_active_pharmacy_context():
    decision = AiIntentRouter().analyze(message="stock", active_module="pharmacy")

    assert decision.needs_clarification is False
    assert decision.intent == "data_or_operational_lookup"
    assert decision.signals["resource_top_module"] == "pharmacy"
    assert decision.signals["resource_matches"][0]["module"] == "pharmacy"


def test_phase6_registry_and_explorer_follow_active_module_context():
    registry = AiToolRegistry()
    tool_names = {tool.name for tool in registry.select_tools(message="stock", active_module="pharmacy")}
    matches = ExploreDatabaseTool()._match_resources("stock", active_module="pharmacy")

    assert "explore_database" in tool_names
    assert "get_pharmacy_stock_summary" in tool_names
    assert matches
    assert matches[0].prefix == "pharmacy"


def test_phase6_conversation_focus_resolves_vague_followup():
    metadata = {
        "conversation_focus": {
            "intent": "pharmacy_stock",
            "resources": [{"basename": "pharmacy-lot", "label_pt": "Lotes de farmácia"}],
        }
    }
    result = resolve_resource_matches("mostre isso", active_module="ai", session_metadata=metadata)

    assert result.ambiguous is False
    assert result.matches[0].descriptor.basename == "pharmacy-lot"
    assert "foco_conversa:recurso" in result.matches[0].reasons


def test_phase6_report_and_command_json():
    report = build_phase6_disambiguation_report()

    assert report["phase"] == 6
    assert report["summary"]["ambiguous"] >= 1
    assert report["summary"]["resolved_by_active_module"] >= 2
    assert any(
        probe["input"] == "stock"
        and probe["active_module"] == "ai"
        and probe["intent"] == "ambiguous_resource"
        for probe in report["probes"]
    )

    output = StringIO()
    call_command("audit_ai_disambiguation_phase6", "--format", "json", stdout=output)
    payload = json.loads(output.getvalue())
    assert payload["phase"] == 6
    assert payload["summary"]["needs_clarification"] >= 1
