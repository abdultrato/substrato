from __future__ import annotations

from io import StringIO
import json

from django.core.management import call_command

from apps.ai_assistant.services.conversation_memory import (
    build_conversation_focus_payload,
    build_phase7_conversation_memory_report,
    resolve_conversation_followup,
)
from apps.ai_assistant.services.intent_router import IntentDecision
from apps.ai_assistant.services.intent_signals import build_intent_signals


def _pending_stock_metadata() -> dict:
    return {
        "intent_clarification": {
            "status": "needs_clarification",
            "intent": "ambiguous_resource",
            "reason": "generic_stock_without_module_context",
            "signals": {"normalized": "stock"},
        }
    }


def test_phase7_resolves_module_reply_to_pending_ambiguous_stock_question():
    pharmacy = resolve_conversation_followup(
        message="Farmácia",
        active_module="ai",
        session_metadata=_pending_stock_metadata(),
    )
    warehouse = resolve_conversation_followup(
        message="Armazém",
        active_module="ai",
        session_metadata=_pending_stock_metadata(),
    )

    assert pharmacy.resolved is True
    assert pharmacy.effective_message == "stock pharmacy"
    assert pharmacy.reason == "pending_ambiguous_resource_module_reply"
    assert pharmacy.selected_module == "pharmacy"

    assert warehouse.resolved is True
    assert warehouse.effective_message == "stock warehouse"
    assert warehouse.selected_module == "warehouse"


def test_phase7_resolves_filter_only_followup_with_previous_resource_focus():
    metadata = {
        "conversation_focus": {
            "intent": "data_exploration",
            "resources": [{"basename": "dental-patient_treatment_plan", "label_pt": "Planos dentários por paciente"}],
        }
    }
    resolution = resolve_conversation_followup(
        message="e os expirados?",
        active_module="ai",
        session_metadata=metadata,
    )

    assert resolution.resolved is True
    assert resolution.effective_message == "dental-patient_treatment_plan e os expirados?"
    assert resolution.reason == "conversation_focus_followup"
    assert resolution.focus_resources == ("dental-patient_treatment_plan",)


def test_phase7_expanded_followup_drives_intent_signals_to_previous_resource():
    metadata = {
        "conversation_focus": {
            "intent": "financial_review",
            "resources": [{"basename": "billing-invoice", "label_pt": "Faturas"}],
        }
    }
    resolution = resolve_conversation_followup(
        message="pendentes",
        active_module="ai",
        session_metadata=metadata,
    )
    signals = build_intent_signals(
        message=resolution.effective_message,
        active_module="ai",
        session_metadata=metadata,
    )

    assert signals["resource_count"] > 0
    assert signals["resource_basenames"][0] == "billing-invoice"
    assert signals["resource_modules"] == ["billing"]


def test_phase7_focus_payload_merges_tool_resources_signals_filters_and_messages():
    decision = IntentDecision(
        intent="data_lookup",
        confidence_score=86,
        signals={
            "resource_matches": [
                {
                    "basename": "pharmacy-lot",
                    "module": "pharmacy",
                    "label_pt": "Lotes de farmácia",
                    "label_en": "Pharmacy lots",
                    "href": "/api/v1/pharmacy/lot/",
                }
            ],
            "resource_modules": ["pharmacy"],
            "resource_disambiguation": {"top_module": "pharmacy"},
        },
    )
    tool_results = [
        {
            "tool_name": "explore_database",
            "result": {
                "resource_results": [
                    {
                        "basename": "pharmacy-lot",
                        "module": "pharmacy",
                        "label_pt": "Lotes de farmácia",
                        "label_en": "Pharmacy lots",
                        "href": "/api/v1/pharmacy/lot/",
                        "applied_filters": [{"kind": "semantic_expiration", "field": "expiration_date"}],
                    }
                ]
            },
        }
    ]

    payload = build_conversation_focus_payload(
        intent_decision=decision,
        tool_results=tool_results,
        investigation={"intent": "data_exploration"},
        original_message="e os expirados?",
        effective_message="pharmacy-lot e os expirados?",
        updated_at="2026-05-31T00:00:00+00:00",
    )

    assert payload["intent"] == "data_exploration"
    assert payload["resources"][0]["basename"] == "pharmacy-lot"
    assert payload["modules"] == ["pharmacy"]
    assert payload["filters"][0]["kind"] == "semantic_expiration"
    assert payload["last_user_message"] == "e os expirados?"
    assert payload["effective_message"] == "pharmacy-lot e os expirados?"


def test_phase7_report_and_command_json():
    report = build_phase7_conversation_memory_report()

    assert report["phase"] == 7
    assert report["summary"]["resolved_followups"] >= 5
    assert any(
        probe["input"] == "Farmácia"
        and probe["effective_message"] == "stock pharmacy"
        and probe["status"] == "ready"
        for probe in report["probes"]
    )

    output = StringIO()
    call_command("audit_ai_conversation_memory_phase7", "--format", "json", stdout=output)
    payload = json.loads(output.getvalue())
    assert payload["phase"] == 7
    assert payload["summary"]["resolved_followups"] >= 5
