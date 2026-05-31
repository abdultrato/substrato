from __future__ import annotations

from io import StringIO
import json

from django.core.management import call_command

from apps.ai_assistant.services.alias_normalization import (
    build_alias_normalization_report,
    match_resource_aliases,
    normalize_alias_text,
)
from apps.ai_assistant.tools.resource_catalog import match_resource_descriptors


def test_alias_normalization_removes_accents_separators_and_plural_noise():
    assert normalize_alias_text("Histórico_Dentário") == "historico dentario"
    assert normalize_alias_text("plano-dentário válido") == "plano dentario valido"


def test_alias_match_understands_loose_dental_words():
    matches = match_resource_aliases("dente", limit=5)
    basenames = {match.descriptor.basename for match in matches}

    assert {"dental-odontogram", "dental-treatment_item"} & basenames


def test_alias_match_understands_dental_plan_fragments():
    matches = match_resource_aliases("planos dentarios expirados", limit=5)
    basenames = [match.descriptor.basename for match in matches]

    assert "dental-patient_treatment_plan" in basenames


def test_resource_catalog_uses_canonical_alias_index():
    descriptors = match_resource_descriptors("odontologia", limit=10)

    assert descriptors
    assert {descriptor.prefix for descriptor in descriptors} == {"dental"}


def test_compact_matching_does_not_match_inside_unrelated_words():
    descriptors = match_resource_descriptors("faturas pendentes", limit=5)

    assert descriptors
    assert descriptors[0].basename == "billing-invoice"
    assert "dental" not in {descriptor.prefix for descriptor in descriptors}


def test_alias_phase3_report_and_command_json():
    report = build_alias_normalization_report()

    assert report["phase"] == 3
    assert report["summary"]["alias_entries"] > 1000
    assert any(probe["input"] == "dente" and probe["matches"] for probe in report["probes"])

    output = StringIO()
    call_command("audit_ai_aliases_phase3", "--format", "json", stdout=output)
    payload = json.loads(output.getvalue())
    assert payload["phase"] == 3
    assert "ambiguous_aliases" in payload
