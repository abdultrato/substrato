from __future__ import annotations

from io import StringIO
import json

from django.core.management import call_command

from apps.ai_assistant.services.project_map import build_ai_project_map, render_ai_project_map_markdown


def _resource(project_map: dict, basename: str) -> dict:
    return next(resource for resource in project_map["resources"] if resource["basename"] == basename)


def test_ai_project_map_builds_canonical_contract():
    project_map = build_ai_project_map()

    assert project_map["phase"] == 2
    assert project_map["summary"]["modules"] >= 30
    assert project_map["summary"]["resources"] >= 100
    assert project_map["summary"]["model_fields"] > project_map["summary"]["resources"]
    assert project_map["summary"]["custom_actions"] > 0
    assert any(module["key"] == "dental" for module in project_map["modules"])


def test_ai_project_map_includes_resource_fields_permissions_and_aliases():
    project_map = build_ai_project_map()
    patient = _resource(project_map, "clinical-patient")

    assert patient["api"]["collection"] == "/api/v1/clinical/patient/"
    assert patient["model"]["model_label"]
    assert any(field["name"] == "name" for field in patient["model"]["fields"])
    assert patient["serializer"]["class"].endswith("PatientSerializer")
    assert "GET" in patient["permissions"]["method_groups"]
    assert patient["ai_terms"]["keywords"]


def test_ai_project_map_captures_custom_actions():
    project_map = build_ai_project_map()
    resources_with_actions = [resource for resource in project_map["resources"] if resource["actions"]]

    assert resources_with_actions
    assert any(action["methods"] for resource in resources_with_actions for action in resource["actions"])


def test_ai_project_map_markdown_and_command_json():
    project_map = build_ai_project_map()
    markdown = render_ai_project_map_markdown(project_map)

    assert "# IA Operacional - Mapa Canonico Fase 2" in markdown
    assert "## Modulos" in markdown

    output = StringIO()
    call_command("build_ai_project_map", "--format", "json", stdout=output)
    payload = json.loads(output.getvalue())
    assert payload["phase"] == 2
    assert "semantic_contract" in payload
