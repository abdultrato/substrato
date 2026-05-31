from __future__ import annotations

from io import StringIO
import json

from django.core.management import call_command

from apps.ai_assistant.services.proactive_guidance import (
    build_phase8_proactive_guidance_report,
    build_proactive_guidance,
    merge_recommended_questions,
)
from apps.ai_assistant.services.response_schema import build_response_schema


def test_phase8_dental_plan_focus_recommends_valid_and_expired_lists():
    guidance = build_proactive_guidance(
        conversation_focus={
            "intent": "data_exploration",
            "resources": [
                {
                    "basename": "dental-patient_treatment_plan",
                    "module": "dental",
                    "label_pt": "Planos dentarios por paciente",
                }
            ],
            "modules": ["dental"],
        },
        language="pt",
    )

    prompts = guidance["recommended_questions"]
    assert guidance["status"] == "available"
    assert "Mostre pacientes com plano dentario valido." in prompts
    assert "Mostre pacientes com plano dentario expirado." in prompts
    assert guidance["suggestions"][0]["resource_basename"] == "dental-patient_treatment_plan"


def test_phase8_pharmacy_expiration_focus_recommends_lot_followups():
    guidance = build_proactive_guidance(
        conversation_focus={
            "intent": "pharmacy_stock",
            "resources": [{"basename": "pharmacy-lot", "module": "pharmacy"}],
            "modules": ["pharmacy"],
            "filters": [{"basename": "pharmacy-lot", "kind": "semantic_expiration"}],
        },
        language="pt",
    )

    prompts = guidance["recommended_questions"]
    assert "Mostre lotes de farmacia expirados." in prompts
    assert "Mostre lotes que vencem nos proximos 30 dias." in prompts
    assert "Compare validos e expirados neste recurso." in prompts
    assert guidance["context"]["filters"] == ["semantic_expiration"]


def test_phase8_billing_focus_stays_inside_billing_context():
    guidance = build_proactive_guidance(
        conversation_focus={
            "intent": "financial_review",
            "resources": [{"basename": "billing-invoice", "module": "billing"}],
            "modules": ["billing"],
            "filters": [{"basename": "billing-invoice", "kind": "domain_pending_status"}],
        },
        language="pt",
    )

    prompts = guidance["recommended_questions"]
    assert "Mostre faturas pendentes." in prompts
    assert "Gere um relatorio financeiro desta investigacao." in prompts
    assert guidance["context"]["modules"] == ["billing"]
    assert not any(item["module"] == "pharmacy" for item in guidance["suggestions"])


def test_phase8_response_schema_exposes_proactive_guidance_without_suggested_actions():
    guidance = {
        "status": "available",
        "suggestions": [{"kind": "filter", "label": "Faturas pendentes", "prompt": "Mostre faturas pendentes."}],
        "recommended_questions": ["Mostre faturas pendentes."],
        "context": {"modules": ["billing"], "resources": ["billing-invoice"]},
    }

    schema = build_response_schema(
        tool_results=[],
        sources=[],
        suggested_actions=[],
        investigation={"recommended_questions": ["Que filtros posso aplicar?"]},
        proactive_guidance=guidance,
        language="pt",
    )

    assert schema["next_steps"] == []
    assert schema["proactive_guidance"]["status"] == "available"
    assert schema["proactive_guidance"]["recommended_questions"] == ["Mostre faturas pendentes."]
    assert schema["investigation"]["recommended_questions"] == ["Que filtros posso aplicar?"]


def test_phase8_merge_recommended_questions_prefers_context_and_deduplicates():
    merged = merge_recommended_questions(
        existing=["Mostre faturas pendentes.", "Que filtros posso aplicar?"],
        proactive_guidance={"recommended_questions": ["Mostre faturas pendentes.", "Gere um relatorio financeiro."]},
    )

    assert merged == [
        "Mostre faturas pendentes.",
        "Gere um relatorio financeiro.",
        "Que filtros posso aplicar?",
    ]


def test_phase8_report_and_command_json():
    report = build_phase8_proactive_guidance_report()

    assert report["phase"] == 8
    assert report["summary"]["with_suggestions"] == report["summary"]["probes"]
    assert report["summary"]["total_suggestions"] >= 12

    output = StringIO()
    call_command("audit_ai_proactive_guidance_phase8", "--format", "json", stdout=output)
    payload = json.loads(output.getvalue())
    assert payload["phase"] == 8
    assert payload["summary"]["total_suggestions"] >= 12
