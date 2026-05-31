from __future__ import annotations

from io import StringIO
import json

from django.core.management import call_command

from apps.ai_assistant.services.phase1_audit import build_phase1_ai_audit, render_phase1_ai_audit_markdown


def test_phase1_ai_audit_reports_current_ai_surface():
    audit = build_phase1_ai_audit()

    assert audit["phase"] == 1
    assert audit["summary"]["backend_tools"] >= 10
    assert audit["summary"]["viewset_modules"] >= 30
    assert audit["summary"]["viewset_resources"] >= 100
    assert audit["summary"]["llm_provider"] == "local"
    assert any(item["module"] == "dental" for item in audit["project_surface"])
    assert any(item["code"] == "keyword_overfit" for item in audit["failure_taxonomy"])


def test_phase1_ai_audit_markdown_contains_failure_taxonomy():
    audit = build_phase1_ai_audit()
    markdown = render_phase1_ai_audit_markdown(audit)

    assert "# IA Operacional - Auditoria Fase 1" in markdown
    assert "## Taxonomia De Falhas" in markdown
    assert "keyword_overfit" in markdown


def test_phase1_ai_audit_command_outputs_json():
    output = StringIO()

    call_command("audit_ai_assistant_phase1", "--format", "json", stdout=output)

    payload = json.loads(output.getvalue())
    assert payload["phase"] == 1
    assert payload["summary"]["backend_tools"] >= 10
    assert "catalog_coverage" in payload
