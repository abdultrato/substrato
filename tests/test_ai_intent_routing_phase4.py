from __future__ import annotations

from io import StringIO
import json

from django.core.management import call_command

from apps.ai_assistant.services.intent_router import AiIntentRouter
from apps.ai_assistant.services.intent_signals import build_intent_signals, build_phase4_intent_report
from apps.ai_assistant.services.registry import AiToolRegistry


def test_phase4_semantic_signals_resolve_loose_dental_aliases():
    signals = build_intent_signals(message="odontologia", active_module="ai")

    assert signals["resource_count"] > 0
    assert signals["resource_modules"] == ["dental"]
    assert "dental-appointment" in signals["resource_basenames"]
    assert signals["knowledge_base"] is False


def test_phase4_router_accepts_resource_only_messages_without_clarification():
    decision = AiIntentRouter().analyze(message="planos dentarios expirados", active_module="ai")

    assert decision.needs_clarification is False
    assert decision.intent == "data_lookup"
    assert "dental-patient_treatment_plan" in decision.signals["resource_basenames"]


def test_phase4_registry_uses_semantic_resources_before_default_context():
    registry = AiToolRegistry()

    dental_names = {tool.name for tool in registry.select_tools(message="odontologia", active_module="ai")}
    dental_crud_names = {tool.name for tool in registry.select_tools(message="crie consulta dentaria", active_module="ai")}
    finance_names = {tool.name for tool in registry.select_tools(message="faturas pendentes", active_module="ai")}

    assert dental_names == {"explore_database"}
    assert "prepare_crud_operation" in dental_crud_names
    assert "explore_database" not in dental_crud_names
    assert "explore_database" in finance_names
    assert "get_financial_operational_summary" in finance_names


def test_phase4_report_and_command_json():
    report = build_phase4_intent_report()

    assert report["phase"] == 4
    assert report["summary"]["probes_with_resources"] >= 8
    assert any(
        probe["input"] == "odontologia" and probe["selected_tools"] == ["explore_database"]
        for probe in report["probes"]
    )

    output = StringIO()
    call_command("audit_ai_intents_phase4", "--format", "json", stdout=output)
    payload = json.loads(output.getvalue())
    assert payload["phase"] == 4
    assert payload["summary"]["ready"] >= 8
