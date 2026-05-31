from __future__ import annotations

from collections import Counter, defaultdict
from dataclasses import dataclass
from datetime import UTC, datetime
from difflib import SequenceMatcher
from functools import lru_cache
import re
from typing import Any, Literal
import unicodedata

from django.apps import apps as django_apps

from apps.ai_assistant.tools.resource_catalog import (
    MODULE_ALIASES,
    MODULE_LABELS,
    RESOURCE_ALIASES,
    ResourceDescriptor,
    get_resource_descriptors,
    viewset_for_descriptor,
)

AliasTargetType = Literal["module", "resource"]


LOW_SIGNAL_TERMS = {
    "a",
    "as",
    "ate",
    "com",
    "codigo",
    "code",
    "created at",
    "created by",
    "created by id",
    "criado em",
    "criado por",
    "custom id",
    "da",
    "das",
    "de",
    "deleted",
    "deleted at",
    "deleted by",
    "deleted by id",
    "do",
    "dos",
    "e",
    "estado",
    "id",
    "name",
    "nome",
    "nota",
    "notas",
    "notes",
    "observacao",
    "observacoes",
    "o",
    "os",
    "para",
    "status",
    "tenant",
    "updated at",
    "updated by",
    "updated by id",
}

CANONICAL_MODULE_ALIASES: dict[str, tuple[str, ...]] = {
    "accounting": ("contabilidade", "contabilistico", "contabilistica", "contas"),
    "clinical_pharmacy": ("farmacia clinica", "farmácia clínica", "preparacao clinica", "interacoes medicamentosas"),
    "credit_financing": ("credito", "crédito", "financiamento", "financiamento estudantil", "reembolso"),
    "dashboard": ("painel", "indicadores", "metricas", "dashboard"),
    "dental": ("odontologia", "dentario", "dentaria", "dentário", "dentária", "dente", "dentes"),
    "physiotherapy": ("fisioterapia", "fisio", "reabilitacao fisica", "reabilitação física"),
    "public_health": ("saude publica", "saúde pública", "vacinas", "vacinacao", "vacinação"),
    "radiology": ("radiologia", "raio x", "raios x", "imagem medica", "imagem médica"),
    "specialty_diagnostics": ("diagnostico especializado", "diagnóstico especializado", "diagnosticos", "diagnósticos"),
    "telemedicine": ("telemedicina", "consulta remota", "atendimento remoto"),
    "therapy": ("terapia", "terapias", "terapeutico", "terapêutico"),
    "transportation": ("transporte", "transportes", "viatura", "viaturas", "frota"),
    "veterinary": ("veterinaria", "veterinária", "animal", "animais"),
}

CANONICAL_RESOURCE_ALIASES: dict[str, tuple[str, ...]] = {
    "dental-appointment": (
        "consulta dentaria",
        "consulta dentária",
        "consulta odontologica",
        "consulta odontológica",
        "dentista",
    ),
    "dental-record": (
        "historico dentario",
        "histórico dentário",
        "ficha dentaria",
        "ficha dentária",
        "prontuario dentario",
        "prontuário dentário",
    ),
    "dental-odontogram": ("odontograma", "dente", "dentes", "face do dente"),
    "dental-patient_treatment_plan": (
        "plano dentario do paciente",
        "plano dentário do paciente",
        "paciente com plano dentario",
        "paciente com plano dentário",
        "pacientes com plano dentario",
        "pacientes com plano dentário",
        "plano dentario valido",
        "plano dentário válido",
        "plano dentario expirado",
        "plano dentário expirado",
        "planos dentarios expirados",
        "planos dentários expirados",
    ),
    "dental-procedure": ("procedimento dentario", "procedimento dentário", "servico dentario", "serviço dentário"),
    "dental-prosthesis_lab_order": (
        "protese dentaria",
        "prótese dentária",
        "laboratorio de protese",
        "laboratório de prótese",
    ),
    "dental-treatment_item": (
        "item do plano dentario",
        "item do plano dentário",
        "item tratamento dentario",
        "item tratamento dentário",
        "procedimento do plano dentario",
    ),
    "dental-treatment_plan": (
        "plano dentario",
        "plano dentário",
        "plano de tratamento dentario",
        "plano de tratamento dentário",
        "tratamento dentario",
        "tratamento dentário",
    ),
}

PHASE3_PROBES = (
    "dente",
    "odontologia",
    "planos dentarios expirados",
    "plano dentario valido",
    "historico dentario",
    "consulta dentaria",
    "stock",
    "faturas pendentes",
    "funcionarios ferias",
)


@dataclass(frozen=True, slots=True)
class CanonicalAliasEntry:
    phrase: str
    normalized: str
    compact: str
    target_type: AliasTargetType
    target_key: str
    source: str
    weight: int


@dataclass(frozen=True, slots=True)
class ResourceAliasMatch:
    descriptor: ResourceDescriptor
    score: int
    matched_terms: tuple[str, ...]
    sources: tuple[str, ...]


def normalize_alias_text(value: str) -> str:
    value = (value or "").strip().lower()
    value = unicodedata.normalize("NFD", value)
    value = "".join(ch for ch in value if unicodedata.category(ch) != "Mn")
    value = re.sub(r"[_\-/]+", " ", value)
    value = re.sub(r"(?<=[a-z])(?=[A-Z])", " ", value)
    value = re.sub(r"[^a-z0-9]+", " ", value)
    return re.sub(r"\s+", " ", value).strip()


def compact_alias_text(value: str) -> str:
    return re.sub(r"\s+", "", normalize_alias_text(value))


def alias_tokens(value: str) -> tuple[str, ...]:
    normalized = normalize_alias_text(value)
    if not normalized:
        return ()
    tokens = []
    for token in normalized.split():
        tokens.append(token)
        singular = _singular_token(token)
        if singular != token:
            tokens.append(singular)
    return tuple(dict.fromkeys(tokens))


@lru_cache(maxsize=1)
def get_canonical_alias_entries() -> tuple[CanonicalAliasEntry, ...]:
    entries: list[CanonicalAliasEntry] = []
    for descriptor in get_resource_descriptors():
        _add_module_entries(entries, descriptor)
        _add_resource_entries(entries, descriptor)
        _add_serializer_entries(entries, descriptor)
        _add_model_entries(entries, descriptor)
        _add_viewset_entries(entries, descriptor)
    return tuple(entries)


@lru_cache(maxsize=1)
def _descriptor_by_basename() -> dict[str, ResourceDescriptor]:
    return {descriptor.basename: descriptor for descriptor in get_resource_descriptors()}


def match_resource_aliases(message: str, *, limit: int = 8) -> list[ResourceAliasMatch]:
    normalized = normalize_alias_text(message)
    if not normalized:
        return []
    return list(_match_resource_aliases_cached(normalized, limit))


@lru_cache(maxsize=512)
def _match_resource_aliases_cached(normalized: str, limit: int) -> tuple[ResourceAliasMatch, ...]:
    compact = compact_alias_text(normalized)
    tokens = set(alias_tokens(normalized))
    resource_scores: dict[str, int] = defaultdict(int)
    matched_terms: dict[str, set[str]] = defaultdict(set)
    matched_sources: dict[str, set[str]] = defaultdict(set)

    for entry in get_canonical_alias_entries():
        score = _entry_score(entry=entry, normalized=normalized, compact=compact, tokens=tokens)
        if score <= 0:
            continue
        target_keys = _target_resource_keys(entry)
        for target_key in target_keys:
            resource_scores[target_key] += score
            matched_terms[target_key].add(entry.normalized)
            matched_sources[target_key].add(entry.source)

    if not resource_scores:
        return []

    descriptors = _descriptor_by_basename()
    scored = [
        ResourceAliasMatch(
            descriptor=descriptors[basename],
            score=score,
            matched_terms=tuple(sorted(matched_terms[basename])),
            sources=tuple(sorted(matched_sources[basename])),
        )
        for basename, score in resource_scores.items()
        if basename in descriptors
    ]
    scored.sort(key=lambda item: (-item.score, item.descriptor.label_pt, item.descriptor.basename))
    if not scored:
        return []

    best = scored[0].score
    threshold = max(30, int(best * 0.55))
    return tuple(item for item in scored if item.score >= threshold)[:limit]


def build_alias_normalization_report() -> dict[str, Any]:
    entries = list(get_canonical_alias_entries())
    normalized_targets: dict[str, set[str]] = defaultdict(set)
    for entry in entries:
        if entry.target_type == "resource":
            normalized_targets[entry.normalized].add(entry.target_key)

    collisions = [
        {"alias": alias, "resources": sorted(resources)}
        for alias, resources in normalized_targets.items()
        if len(resources) > 1 and alias not in LOW_SIGNAL_TERMS
    ]
    collisions.sort(key=lambda item: (-len(item["resources"]), item["alias"]))

    probes = []
    for probe in PHASE3_PROBES:
        matches = match_resource_aliases(probe, limit=5)
        probes.append(
            {
                "input": probe,
                "matches": [
                    {
                        "basename": match.descriptor.basename,
                        "module": match.descriptor.prefix,
                        "score": match.score,
                        "matched_terms": list(match.matched_terms[:5]),
                        "sources": list(match.sources),
                    }
                    for match in matches
                ],
            }
        )

    resource_keys = {entry.target_key for entry in entries if entry.target_type == "resource"}
    module_keys = {entry.target_key for entry in entries if entry.target_type == "module"}
    return {
        "phase": 3,
        "title": "Normalizacao central de aliases da IA operacional",
        "generated_at": datetime.now(UTC).isoformat(),
        "summary": {
            "alias_entries": len(entries),
            "normalized_aliases": len({entry.normalized for entry in entries}),
            "resources_covered": len(resource_keys),
            "modules_covered": len(module_keys),
            "sources": dict(sorted(Counter(entry.source for entry in entries).items())),
            "ambiguous_aliases": len(collisions),
        },
        "probes": probes,
        "ambiguous_aliases": collisions[:80],
        "priority_findings": _priority_findings(collisions=collisions, probes=probes),
    }


def render_alias_normalization_markdown(report: dict[str, Any]) -> str:
    summary = report["summary"]
    lines = [
        "# IA Operacional - Normalizacao De Aliases Fase 3",
        "",
        f"Gerado em UTC: {report['generated_at']}",
        "",
        "## Resumo",
        "",
        f"- Entradas de alias: {summary['alias_entries']}",
        f"- Aliases normalizados unicos: {summary['normalized_aliases']}",
        f"- Recursos cobertos: {summary['resources_covered']}",
        f"- Modulos cobertos: {summary['modules_covered']}",
        f"- Aliases ambiguos detectados: {summary['ambiguous_aliases']}",
        "",
        "## Fontes",
        "",
    ]
    lines.extend(f"- `{source}`: {count}" for source, count in summary["sources"].items())

    lines.extend(
        [
            "",
            "## Probes",
            "",
            "| Entrada | Primeiros recursos encontrados |",
            "| --- | --- |",
        ]
    )
    for probe in report["probes"]:
        matches = ", ".join(f"{item['basename']} ({item['score']})" for item in probe["matches"]) or "-"
        lines.append(f"| `{probe['input']}` | {matches} |")

    lines.extend(["", "## Achados Prioritarios", ""])
    lines.extend(f"- {finding}" for finding in report["priority_findings"])
    return "\n".join(lines).rstrip() + "\n"


def render_alias_normalization_text(report: dict[str, Any]) -> str:
    summary = report["summary"]
    findings = "\n".join(f"- {item}" for item in report["priority_findings"])
    return "\n".join(
        [
            "IA Operacional - Normalizacao De Aliases Fase 3",
            f"Gerado em UTC: {report['generated_at']}",
            "",
            f"Entradas de alias: {summary['alias_entries']}",
            f"Aliases normalizados unicos: {summary['normalized_aliases']}",
            f"Recursos cobertos: {summary['resources_covered']}",
            f"Modulos cobertos: {summary['modules_covered']}",
            f"Aliases ambiguos detectados: {summary['ambiguous_aliases']}",
            "",
            "Achados prioritarios:",
            findings,
        ]
    )


def _add_module_entries(entries: list[CanonicalAliasEntry], descriptor: ResourceDescriptor) -> None:
    module_label = MODULE_LABELS.get(descriptor.prefix, (descriptor.prefix, descriptor.prefix))
    terms = {
        descriptor.prefix,
        descriptor.prefix.replace("_", " "),
        *module_label,
        *MODULE_ALIASES.get(descriptor.prefix, ()),
        *CANONICAL_MODULE_ALIASES.get(descriptor.prefix, ()),
    }
    for term in terms:
        _add_entry(
            entries,
            phrase=term,
            target_type="module",
            target_key=descriptor.prefix,
            source="module_alias",
            weight=28,
        )


def _add_resource_entries(entries: list[CanonicalAliasEntry], descriptor: ResourceDescriptor) -> None:
    terms = {
        descriptor.basename,
        descriptor.basename.replace("-", " "),
        descriptor.basename.replace("-", " ").replace("_", " "),
        descriptor.route_name,
        descriptor.route_name.replace("_", " "),
        descriptor.model_name,
        _split_identifier(descriptor.model_name),
        descriptor.model_label,
        descriptor.label_pt,
        descriptor.label_en,
        *RESOURCE_ALIASES.get(descriptor.basename, ()),
        *CANONICAL_RESOURCE_ALIASES.get(descriptor.basename, ()),
    }
    for term in terms:
        source = "resource_alias" if term in RESOURCE_ALIASES.get(descriptor.basename, ()) else "resource_identity"
        if term in CANONICAL_RESOURCE_ALIASES.get(descriptor.basename, ()):
            source = "canonical_resource_alias"
        _add_entry(
            entries,
            phrase=term,
            target_type="resource",
            target_key=descriptor.basename,
            source=source,
            weight=95 if source != "resource_identity" else 70,
        )


def _add_serializer_entries(entries: list[CanonicalAliasEntry], descriptor: ResourceDescriptor) -> None:
    viewset_class = viewset_for_descriptor(descriptor)
    serializer_class = getattr(viewset_class, "serializer_class", None) if viewset_class else None
    if serializer_class is None:
        return

    for source_name, aliases in (
        ("serializer_input_alias", getattr(serializer_class, "legacy_input_aliases", {}) or {}),
        ("serializer_output_alias", getattr(serializer_class, "legacy_output_aliases", {}) or {}),
    ):
        if not isinstance(aliases, dict):
            continue
        for alias, canonical in aliases.items():
            _add_entry(
                entries,
                phrase=str(alias),
                target_type="resource",
                target_key=descriptor.basename,
                source=source_name,
                weight=58,
                skip_low_signal=True,
            )
            _add_entry(
                entries,
                phrase=str(canonical),
                target_type="resource",
                target_key=descriptor.basename,
                source="serializer_canonical_field",
                weight=34,
                skip_low_signal=True,
            )


def _add_model_entries(entries: list[CanonicalAliasEntry], descriptor: ResourceDescriptor) -> None:
    model = django_apps.get_model(descriptor.app_label, descriptor.model_name)
    for field in model._meta.get_fields():
        if getattr(field, "auto_created", False) and not getattr(field, "concrete", False):
            continue
        for term in (getattr(field, "name", ""), getattr(field, "attname", ""), str(getattr(field, "verbose_name", ""))):
            _add_entry(
                entries,
                phrase=term,
                target_type="resource",
                target_key=descriptor.basename,
                source="model_field",
                weight=24,
                skip_low_signal=True,
            )


def _add_viewset_entries(entries: list[CanonicalAliasEntry], descriptor: ResourceDescriptor) -> None:
    viewset_class = viewset_for_descriptor(descriptor)
    if viewset_class is None:
        return
    for source, field_names, weight in (
        ("search_field", getattr(viewset_class, "search_fields", ()) or (), 28),
        ("ordering_field", getattr(viewset_class, "ordering_fields", ()) or (), 22),
    ):
        if field_names == "__all__":
            continue
        for raw_name in field_names:
            name = str(raw_name).replace("__", " ")
            _add_entry(
                entries,
                phrase=name,
                target_type="resource",
                target_key=descriptor.basename,
                source=source,
                weight=weight,
                skip_low_signal=True,
            )
    if hasattr(viewset_class, "get_extra_actions"):
        try:
            actions = viewset_class.get_extra_actions()
        except Exception:
            actions = []
        for action in actions:
            for term in (
                getattr(action, "__name__", ""),
                getattr(action, "url_path", ""),
                getattr(action, "url_name", ""),
            ):
                _add_entry(
                    entries,
                    phrase=str(term).replace("-", " "),
                    target_type="resource",
                    target_key=descriptor.basename,
                    source="viewset_action",
                    weight=48,
                    skip_low_signal=True,
                )


def _add_entry(
    entries: list[CanonicalAliasEntry],
    *,
    phrase: str,
    target_type: AliasTargetType,
    target_key: str,
    source: str,
    weight: int,
    skip_low_signal: bool = False,
) -> None:
    for variant in _alias_variants(phrase):
        if skip_low_signal and variant in LOW_SIGNAL_TERMS:
            continue
        if len(variant) < 2:
            continue
        entries.append(
            CanonicalAliasEntry(
                phrase=str(phrase),
                normalized=variant,
                compact=compact_alias_text(variant),
                target_type=target_type,
                target_key=target_key,
                source=source,
                weight=weight,
            )
        )


def _alias_variants(value: str) -> tuple[str, ...]:
    normalized = normalize_alias_text(value)
    if not normalized:
        return ()
    tokens = normalized.split()
    singular = " ".join(_singular_token(token) for token in tokens)
    variants = [normalized]
    if singular != normalized:
        variants.append(singular)
    split_identifier = normalize_alias_text(_split_identifier(value))
    if split_identifier and split_identifier not in variants:
        variants.append(split_identifier)
    return tuple(dict.fromkeys(variants))


def _entry_score(
    *,
    entry: CanonicalAliasEntry,
    normalized: str,
    compact: str,
    tokens: set[str],
) -> int:
    if entry.normalized in LOW_SIGNAL_TERMS and entry.normalized != normalized:
        return 0

    if _whole_phrase_match(entry.normalized, normalized):
        return entry.weight + min(len(entry.normalized), 30)

    if " " in entry.normalized and len(entry.compact) >= 5 and entry.compact in compact:
        return max(0, entry.weight - 4 + min(len(entry.compact), 20))

    entry_tokens = set(alias_tokens(entry.normalized))
    if entry_tokens:
        overlap = len(entry_tokens & tokens)
        if overlap == len(entry_tokens):
            return max(0, entry.weight - 8 + overlap * 4)
        if len(entry_tokens) >= 2 and overlap / len(entry_tokens) >= 0.67:
            return max(0, int(entry.weight * 0.55) + overlap * 3)

    if len(entry.normalized) >= 5 and _fuzzy_ratio(entry.normalized, normalized) >= 0.88:
        return max(0, int(entry.weight * 0.45))

    return 0


def _target_resource_keys(entry: CanonicalAliasEntry) -> tuple[str, ...]:
    if entry.target_type == "resource":
        return (entry.target_key,)
    return tuple(
        descriptor.basename for descriptor in get_resource_descriptors() if descriptor.prefix == entry.target_key
    )


def _whole_phrase_match(phrase: str, normalized: str) -> bool:
    return bool(re.search(rf"(?<!\w){re.escape(phrase)}(?!\w)", normalized))


def _fuzzy_ratio(left: str, right: str) -> float:
    if not left or not right:
        return 0
    return SequenceMatcher(None, left, right).ratio()


def _singular_token(token: str) -> str:
    if len(token) <= 3:
        return token
    if token.endswith("coes") and len(token) > 5:
        return token[:-4] + "cao"
    if token.endswith("oes") and len(token) > 4:
        return token[:-3] + "ao"
    if token.endswith("s"):
        return token[:-1]
    return token


def _split_identifier(value: str) -> str:
    return re.sub(r"(?<=[a-z0-9])(?=[A-Z])", " ", str(value or "")).replace("_", " ").replace("-", " ").replace(".", " ")


def _priority_findings(*, collisions: list[dict[str, Any]], probes: list[dict[str, Any]]) -> list[str]:
    missing = [probe["input"] for probe in probes if not probe["matches"]]
    findings = [
        "Aliases de modulos, recursos, serializers, campos e acoes agora passam por um indice canonico unico.",
        "O matching de recursos passa a tolerar acentos, separadores, plurais simples e termos de serializers.",
    ]
    if collisions:
        findings.append(
            f"{len(collisions)} aliases continuam ambiguos e devem ser revistos com contexto activo; primeiros: "
            f"{', '.join(item['alias'] for item in collisions[:8])}."
        )
    if missing:
        findings.append(f"Probes ainda sem correspondencia: {', '.join(missing)}.")
    findings.append("A fase 4 deve usar este indice para normalizar texto livre antes da decisao de intencao.")
    return findings
