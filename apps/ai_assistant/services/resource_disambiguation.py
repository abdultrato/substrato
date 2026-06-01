from __future__ import annotations

from dataclasses import dataclass
from datetime import UTC, datetime
import re
from typing import Any

from apps.ai_assistant.services.alias_normalization import (
    ResourceAliasMatch,
    match_resource_aliases,
    normalize_alias_text,
)
from apps.ai_assistant.tools.resource_catalog import (
    MODULE_ALIASES,
    MODULE_LABELS,
    ResourceDescriptor,
    descriptor_by_basename,
    match_resource_descriptors,
)

GENERIC_ACTIVE_MODULES = {"", "ai", "ia", "assistant", "ai_assistant"}
GENERIC_RESOURCE_TERMS = {"stock", "estoque", "saldo", "lote", "lotes"}
FOCUS_FOLLOWUP_TERMS = (
    "isso",
    "isto",
    "aquilo",
    "mostre",
    "mostrar",
    "ver",
    "liste",
    "listar",
    "continua",
    "continue",
    "agora",
    "tambem",
    "também",
    "validos",
    "válidos",
    "expirados",
    "expiradas",
    "vencidos",
    "vencidas",
    "pendentes",
    "abertos",
    "abertas",
    "hoje",
    "ontem",
)

AMBIGUOUS_RESOURCE_HINTS: dict[str, tuple[str, ...]] = {
    "stock": (
        "pharmacy-lot",
        "pharmacy-product",
        "pharmacy-inventory_movement",
        "warehouse-stock_level",
        "warehouse-stock_movement",
        "warehouse-item",
        "warehouse-lot",
        "bloodbank-unit",
        "bloodbank-stock_movement",
    ),
    "estoque": (
        "pharmacy-lot",
        "pharmacy-product",
        "pharmacy-inventory_movement",
        "warehouse-stock_level",
        "warehouse-stock_movement",
        "warehouse-item",
        "warehouse-lot",
        "bloodbank-unit",
        "bloodbank-stock_movement",
    ),
    "saldo": (
        "pharmacy-lot",
        "warehouse-stock_level",
        "bloodbank-unit",
    ),
    "lote": (
        "pharmacy-lot",
        "warehouse-lot",
        "bloodbank-unit",
    ),
    "lotes": (
        "pharmacy-lot",
        "warehouse-lot",
        "bloodbank-unit",
    ),
}

MODULE_CONTEXT_TERMS: dict[str, tuple[str, ...]] = {
    "pharmacy": (
        "farmacia",
        "farmacia clinica",
        "pharmacy",
        "medicacao",
        "medicamento",
        "medicamentos",
        "farmaco",
        "paracetamol",
        "amoxicilina",
        "produto de farmacia",
        "lote de farmacia",
    ),
    "warehouse": (
        "armazem",
        "armazens",
        "warehouse",
        "wms",
        "logistica",
        "inventario",
        "sku",
        "picking",
        "separacao",
        "expedicao",
        "shipment",
        "reserva de estoque",
        "reposicao",
        "replenishment",
        "pedido de venda",
        "pedido de compra",
    ),
    "bloodbank": (
        "banco de sangue",
        "hemoterapia",
        "sangue",
        "bolsa de sangue",
        "unidade de sangue",
        "blood bank",
    ),
    "billing": (
        "fatura",
        "factura",
        "faturamento",
        "facturacao",
        "invoice",
        "cobranca",
    ),
    "payments": (
        "pagamento",
        "pagamentos",
        "recibo",
        "transacao",
        "reconciliacao",
    ),
    "dental": (
        "odontologia",
        "dentario",
        "dentaria",
        "dente",
        "consulta dentaria",
        "plano dentario",
    ),
    "human_resources": (
        "recursos humanos",
        "rh",
        "funcionario",
        "funcionarios",
        "salario",
        "ferias",
    ),
    "monitoring": (
        "monitoramento",
        "monitorizacao",
        "erro",
        "erros",
        "falha",
        "5xx",
        "500",
        "health",
    ),
    "equipment_integrations": (
        "equipamento integrado",
        "equipamentos integrados",
        "integracao de equipamento",
        "integração de equipamento",
        "integracao de equipamentos",
        "integração de equipamentos",
        "credencial de integracao",
        "credencial de integração",
        "analisador integrado",
        "http_json",
    ),
    "education": (
        "educacao",
        "escola",
        "estudante",
        "professor",
        "matricula",
        "turma",
    ),
}

PHASE6_PROBES = (
    {"input": "stock", "active_module": "ai", "session_metadata": {}},
    {"input": "stock", "active_module": "pharmacy", "session_metadata": {}},
    {"input": "stock", "active_module": "warehouse", "session_metadata": {}},
    {"input": "stock de farmacia", "active_module": "ai", "session_metadata": {}},
    {"input": "stock do armazem", "active_module": "ai", "session_metadata": {}},
    {
        "input": "mostre isso",
        "active_module": "ai",
        "session_metadata": {
            "conversation_focus": {
                "intent": "pharmacy_stock",
                "resources": [{"basename": "pharmacy-lot", "label_pt": "Lotes de farmacia"}],
            }
        },
    },
)


@dataclass(frozen=True, slots=True)
class DisambiguatedResourceMatch:
    descriptor: ResourceDescriptor
    score: int
    base_score: int
    context_score: int
    matched_terms: tuple[str, ...]
    sources: tuple[str, ...]
    reasons: tuple[str, ...]

    def as_payload(self) -> dict[str, Any]:
        return {
            "basename": self.descriptor.basename,
            "module": self.descriptor.prefix,
            "label_pt": self.descriptor.label_pt,
            "label_en": self.descriptor.label_en,
            "score": self.score,
            "base_score": self.base_score,
            "context_score": self.context_score,
            "matched_terms": list(self.matched_terms),
            "sources": list(self.sources),
            "reasons": list(self.reasons),
        }


@dataclass(frozen=True, slots=True)
class ResourceDisambiguationResult:
    matches: tuple[DisambiguatedResourceMatch, ...]
    ambiguous: bool
    ambiguity_reason: str = ""
    candidate_modules: tuple[str, ...] = ()
    active_module_key: str = ""
    focus_modules: tuple[str, ...] = ()
    domain_modules: tuple[str, ...] = ()

    @property
    def top_module(self) -> str:
        return self.matches[0].descriptor.prefix if self.matches else ""

    def as_payload(self) -> dict[str, Any]:
        return {
            "ambiguous": self.ambiguous,
            "ambiguity_reason": self.ambiguity_reason,
            "candidate_modules": list(self.candidate_modules),
            "active_module_key": self.active_module_key,
            "focus_modules": list(self.focus_modules),
            "domain_modules": list(self.domain_modules),
            "top_module": self.top_module,
            "matches": [match.as_payload() for match in self.matches],
        }


def resolve_resource_matches(
    message: str,
    *,
    active_module: str = "",
    session_metadata: dict[str, Any] | None = None,
    limit: int = 8,
) -> ResourceDisambiguationResult:
    normalized = normalize_alias_text(message)
    if not normalized:
        return ResourceDisambiguationResult(matches=(), ambiguous=False)

    session_metadata = session_metadata or {}
    active_module_key = resolve_module_key(active_module)
    focus_basenames, focus_modules = _focus_from_metadata(session_metadata)
    domain_modules = _domain_modules_for_message(normalized)
    candidates = _candidate_matches(
        message=message,
        normalized=normalized,
        focus_basenames=focus_basenames,
    )
    if not candidates:
        return ResourceDisambiguationResult(matches=(), ambiguous=False)

    scored = []
    for descriptor, base_score, matched_terms, sources in candidates.values():
        context_score, reasons = _context_score(
            descriptor=descriptor,
            active_module_key=active_module_key,
            focus_basenames=focus_basenames,
            focus_modules=focus_modules,
            domain_modules=domain_modules,
        )
        score = base_score + context_score
        scored.append(
            DisambiguatedResourceMatch(
                descriptor=descriptor,
                score=score,
                base_score=base_score,
                context_score=context_score,
                matched_terms=tuple(sorted(matched_terms)),
                sources=tuple(sorted(sources)),
                reasons=tuple(reasons),
            )
        )

    preferred_modules = _preferred_modules_for_generic_resource(
        normalized=normalized,
        active_module_key=active_module_key,
        domain_modules=domain_modules,
    )
    if preferred_modules:
        preferred = [match for match in scored if match.descriptor.prefix in preferred_modules]
        if preferred:
            scored = preferred

    focused_matches = [match for match in scored if match.descriptor.basename in focus_basenames]
    if focused_matches and _is_focus_followup_message(normalized):
        scored = focused_matches

    scored.sort(key=lambda item: (-item.score, item.descriptor.prefix != active_module_key, item.descriptor.label_pt, item.descriptor.basename))
    limited = tuple(scored[:limit])
    candidate_modules = tuple(sorted({match.descriptor.prefix for match in limited}))
    ambiguous, reason = _is_ambiguous(
        normalized=normalized,
        matches=limited,
        active_module_key=active_module_key,
        focus_modules=focus_modules,
        domain_modules=domain_modules,
    )
    return ResourceDisambiguationResult(
        matches=limited,
        ambiguous=ambiguous,
        ambiguity_reason=reason,
        candidate_modules=candidate_modules,
        active_module_key=active_module_key,
        focus_modules=tuple(sorted(focus_modules)),
        domain_modules=tuple(sorted(domain_modules)),
    )


def resolve_module_key(value: str) -> str:
    normalized = normalize_alias_text(value)
    if normalized in GENERIC_ACTIVE_MODULES:
        return ""
    if not normalized:
        return ""
    for key, labels in MODULE_LABELS.items():
        terms = {key, key.replace("_", " "), *labels, *MODULE_ALIASES.get(key, ()), *MODULE_CONTEXT_TERMS.get(key, ())}
        if any(normalized == normalize_alias_text(term) for term in terms):
            return key
    return normalized.replace(" ", "_")


def build_phase6_disambiguation_report() -> dict[str, Any]:
    from apps.ai_assistant.services.intent_router import AiIntentRouter
    from apps.ai_assistant.services.registry import AiToolRegistry

    router = AiIntentRouter()
    registry = AiToolRegistry()
    probes = []
    for probe in PHASE6_PROBES:
        message = str(probe["input"])
        active_module = str(probe["active_module"])
        session_metadata = dict(probe["session_metadata"])
        result = resolve_resource_matches(
            message,
            active_module=active_module,
            session_metadata=session_metadata,
        )
        decision = router.analyze(
            message=message,
            active_module=active_module,
            session_metadata=session_metadata,
        )
        selected_tools = registry.select_tools(
            message=message,
            active_module=active_module,
            session_metadata=session_metadata,
        )
        probes.append(
            {
                "input": message,
                "active_module": active_module,
                "status": "needs_clarification" if decision.needs_clarification else "ready",
                "intent": decision.intent,
                "ambiguous": result.ambiguous,
                "ambiguity_reason": result.ambiguity_reason,
                "candidate_modules": list(result.candidate_modules),
                "top_module": result.top_module,
                "top_resources": [match.descriptor.basename for match in result.matches[:5]],
                "top_reasons": list(result.matches[0].reasons) if result.matches else [],
                "selected_tools": [tool.name for tool in selected_tools],
            }
        )

    return {
        "phase": 6,
        "title": "Desambiguacao contextual de recursos por modulo e foco da conversa",
        "generated_at": datetime.now(UTC).isoformat(),
        "summary": {
            "probes": len(probes),
            "ambiguous": sum(1 for probe in probes if probe["ambiguous"]),
            "ready": sum(1 for probe in probes if probe["status"] == "ready"),
            "needs_clarification": sum(1 for probe in probes if probe["status"] == "needs_clarification"),
            "resolved_by_active_module": sum(
                1
                for probe in probes
                if probe["active_module"] not in GENERIC_ACTIVE_MODULES and not probe["ambiguous"]
            ),
            "resolved_by_context_or_terms": sum(
                1
                for probe in probes
                if probe["active_module"] in GENERIC_ACTIVE_MODULES
                and not probe["ambiguous"]
                and (probe["top_reasons"] or probe["top_module"])
            ),
        },
        "probes": probes,
        "priority_findings": _phase6_findings(probes),
    }


def render_phase6_disambiguation_markdown(report: dict[str, Any]) -> str:
    summary = report["summary"]
    lines = [
        "# IA Operacional - Desambiguacao Contextual Fase 6",
        "",
        f"Gerado em UTC: {report['generated_at']}",
        "",
        "## Resumo",
        "",
        f"- Probes analisados: {summary['probes']}",
        f"- Ambiguos: {summary['ambiguous']}",
        f"- Prontos sem clarificacao: {summary['ready']}",
        f"- Com clarificacao: {summary['needs_clarification']}",
        f"- Resolvidos por modulo activo: {summary['resolved_by_active_module']}",
        f"- Resolvidos por contexto/termos: {summary['resolved_by_context_or_terms']}",
        "",
        "## Probes",
        "",
        "| Entrada | Modulo activo | Estado | Top module | Recursos | Motivos |",
        "| --- | --- | --- | --- | --- | --- |",
    ]
    for probe in report["probes"]:
        resources = ", ".join(probe["top_resources"]) or "-"
        reasons = ", ".join(probe["top_reasons"]) or "-"
        lines.append(
            f"| `{probe['input']}` | `{probe['active_module']}` | {probe['status']} | "
            f"`{probe['top_module'] or '-'}` | {resources} | {reasons} |"
        )

    lines.extend(["", "## Achados Prioritarios", ""])
    lines.extend(f"- {finding}" for finding in report["priority_findings"])
    return "\n".join(lines).rstrip() + "\n"


def render_phase6_disambiguation_text(report: dict[str, Any]) -> str:
    summary = report["summary"]
    findings = "\n".join(f"- {item}" for item in report["priority_findings"])
    return "\n".join(
        [
            "IA Operacional - Desambiguacao Contextual Fase 6",
            f"Gerado em UTC: {report['generated_at']}",
            "",
            f"Probes analisados: {summary['probes']}",
            f"Ambiguos: {summary['ambiguous']}",
            f"Prontos sem clarificacao: {summary['ready']}",
            f"Com clarificacao: {summary['needs_clarification']}",
            f"Resolvidos por modulo activo: {summary['resolved_by_active_module']}",
            f"Resolvidos por contexto/termos: {summary['resolved_by_context_or_terms']}",
            "",
            "Achados prioritarios:",
            findings,
        ]
    )


def _candidate_matches(
    *,
    message: str,
    normalized: str,
    focus_basenames: set[str] | None = None,
) -> dict[str, tuple[ResourceDescriptor, int, set[str], set[str]]]:
    candidates: dict[str, tuple[ResourceDescriptor, int, set[str], set[str]]] = {}
    try:
        alias_matches = match_resource_aliases(message, limit=24)
    except Exception:
        alias_matches = []
    for alias_match in alias_matches:
        _merge_candidate(candidates, alias_match)

    for term, basenames in AMBIGUOUS_RESOURCE_HINTS.items():
        if not _has_term(normalized, term):
            continue
        for basename in basenames:
            descriptor = descriptor_by_basename(basename)
            if descriptor is None:
                continue
            current = candidates.get(descriptor.basename)
            base_score = 46 if term in {"stock", "estoque", "saldo"} else 36
            if current is None:
                candidates[descriptor.basename] = (descriptor, base_score, {term}, {"ambiguous_term_hint"})
            else:
                descriptor, score, matched_terms, sources = current
                matched_terms.add(term)
                sources.add("ambiguous_term_hint")
                candidates[descriptor.basename] = (descriptor, max(score, base_score), matched_terms, sources)

    if candidates:
        return candidates

    focus_basenames = focus_basenames or set()
    if focus_basenames and any(_has_term(normalized, term) for term in FOCUS_FOLLOWUP_TERMS):
        for basename in focus_basenames:
            descriptor = descriptor_by_basename(basename)
            if descriptor is None:
                continue
            candidates[descriptor.basename] = (
                descriptor,
                42,
                {"conversation_focus"},
                {"conversation_focus"},
            )
        if candidates:
            return candidates

    try:
        descriptor_matches = match_resource_descriptors(message, limit=24)
    except Exception:
        descriptor_matches = []
    for descriptor in descriptor_matches:
        candidates[descriptor.basename] = (descriptor, 30, set(), {"catalog_keyword"})
    return candidates


def _merge_candidate(
    candidates: dict[str, tuple[ResourceDescriptor, int, set[str], set[str]]],
    alias_match: ResourceAliasMatch,
) -> None:
    descriptor = alias_match.descriptor
    base_score = _alias_base_score(alias_match)
    current = candidates.get(descriptor.basename)
    if current is None:
        candidates[descriptor.basename] = (
            descriptor,
            base_score,
            set(alias_match.matched_terms),
            set(alias_match.sources),
        )
        return
    descriptor, score, matched_terms, sources = current
    matched_terms.update(alias_match.matched_terms)
    sources.update(alias_match.sources)
    candidates[descriptor.basename] = (descriptor, max(score, base_score), matched_terms, sources)


def _alias_base_score(alias_match: ResourceAliasMatch) -> int:
    matched_terms = {normalize_alias_text(term) for term in alias_match.matched_terms}
    sources = set(alias_match.sources)
    if sources == {"module_alias"} and matched_terms and matched_terms <= GENERIC_RESOURCE_TERMS:
        return min(alias_match.score, 44)
    return alias_match.score


def _context_score(
    *,
    descriptor: ResourceDescriptor,
    active_module_key: str,
    focus_basenames: set[str],
    focus_modules: set[str],
    domain_modules: set[str],
) -> tuple[int, list[str]]:
    score = 0
    reasons: list[str] = []
    if active_module_key and descriptor.prefix == active_module_key:
        score += 80
        reasons.append(f"modulo_activo:{active_module_key}")
    if descriptor.basename in focus_basenames:
        score += 70
        reasons.append("foco_conversa:recurso")
    elif descriptor.prefix in focus_modules:
        score += 55
        reasons.append(f"foco_conversa:{descriptor.prefix}")
    if descriptor.prefix in domain_modules:
        score += 62
        reasons.append(f"termos_dominio:{descriptor.prefix}")
    return score, reasons


def _focus_from_metadata(session_metadata: dict[str, Any]) -> tuple[set[str], set[str]]:
    focus = session_metadata.get("conversation_focus") if isinstance(session_metadata, dict) else None
    if not isinstance(focus, dict):
        return set(), set()
    basenames = set()
    modules = set()
    for item in focus.get("resources") or []:
        if not isinstance(item, dict):
            continue
        basename = str(item.get("basename") or "").strip()
        if not basename:
            continue
        basenames.add(basename)
        if "-" in basename:
            modules.add(basename.split("-", 1)[0])
    intent = normalize_alias_text(str(focus.get("intent") or ""))
    if "pharmacy" in intent or "farmacia" in intent:
        modules.add("pharmacy")
    if "warehouse" in intent or "armazem" in intent or "logistica" in intent:
        modules.add("warehouse")
    if "blood" in intent or "sangue" in intent:
        modules.add("bloodbank")
    return basenames, modules


def _domain_modules_for_message(normalized: str) -> set[str]:
    modules = set()
    for module, terms in MODULE_CONTEXT_TERMS.items():
        if any(_has_term(normalized, term) for term in terms):
            modules.add(module)
    return modules


def _is_ambiguous(
    *,
    normalized: str,
    matches: tuple[DisambiguatedResourceMatch, ...],
    active_module_key: str,
    focus_modules: set[str],
    domain_modules: set[str],
) -> tuple[bool, str]:
    if not matches:
        return False, ""
    if active_module_key or focus_modules or domain_modules:
        return False, ""

    modules = {match.descriptor.prefix for match in matches}
    if len(modules) <= 1:
        return False, ""

    if _is_only_generic_ambiguous_stock(normalized):
        return True, "generic_stock_without_module_context"

    top_score = matches[0].score
    close_modules = {match.descriptor.prefix for match in matches if top_score - match.score <= 18}
    if len(close_modules) > 1:
        return True, "multiple_modules_with_close_scores"
    return False, ""


def _is_only_generic_ambiguous_stock(normalized: str) -> bool:
    tokens = set(normalized.split())
    if not tokens:
        return False
    allowed = {"stock", "estoque", "saldo", "lote", "lotes", "de", "do", "da", "dos", "das"}
    return bool(tokens & {"stock", "estoque", "saldo", "lote", "lotes"}) and tokens <= allowed


def _preferred_modules_for_generic_resource(
    *,
    normalized: str,
    active_module_key: str,
    domain_modules: set[str],
) -> set[str]:
    if not any(_has_term(normalized, term) for term in GENERIC_RESOURCE_TERMS):
        return set()
    if active_module_key:
        return {active_module_key}
    if len(domain_modules) == 1:
        return set(domain_modules)
    return set()


def _is_focus_followup_message(normalized: str) -> bool:
    if any(_has_term(normalized, term) for term in FOCUS_FOLLOWUP_TERMS):
        return True
    return len(normalized.split()) <= 4


def _has_term(normalized: str, raw_term: str) -> bool:
    term = normalize_alias_text(raw_term)
    if not term:
        return False
    return bool(re.search(rf"(?<!\w){re.escape(term)}(?!\w)", normalized))


def _phase6_findings(probes: list[dict[str, Any]]) -> list[str]:
    findings = [
        "Termos soltos como stock passam a gerar candidatos por modulo antes de consultar dados.",
        "Modulo activo, foco da conversa e termos de dominio passam a entrar na pontuacao final do recurso.",
    ]
    ambiguous = [probe["input"] for probe in probes if probe["ambiguous"]]
    if ambiguous:
        findings.append("Entradas ainda ambiguas agora pedem clarificacao explicita: " + ", ".join(ambiguous) + ".")
    resolved = [
        f"{probe['input']}->{probe['top_module']}"
        for probe in probes
        if not probe["ambiguous"] and probe["top_module"]
    ]
    if resolved:
        findings.append("Resolucoes auditadas: " + ", ".join(resolved) + ".")
    findings.append("A fase 7 deve usar estes sinais para enriquecer memoria de conversa e follow-ups multi-turn.")
    return findings
