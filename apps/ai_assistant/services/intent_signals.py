from __future__ import annotations

from collections import Counter
from dataclasses import dataclass
from datetime import UTC, datetime
import re
from typing import Any

from apps.ai_assistant.services.alias_normalization import normalize_alias_text
from apps.ai_assistant.services.greetings import is_standalone_greeting
from apps.ai_assistant.services.resource_disambiguation import (
    ResourceDisambiguationResult,
    resolve_resource_matches,
)
from apps.ai_assistant.tools.knowledge_base import should_select_knowledge_base
from apps.ai_assistant.tools.project_context import should_select_project_context
from apps.ai_assistant.tools.project_identity import should_select_project_identity
from apps.ai_assistant.tools.resource_catalog import ResourceDescriptor

PERSONAL_TERMS = (
    "quem sou",
    "meu login",
    "meus grupos",
    "minha conta",
    "meu perfil",
    "o que posso investigar",
    "que dados posso investigar",
    "who am i",
    "my account",
    "my profile",
    "what can i investigate",
)

CRUD_TERMS = (
    "criar",
    "crie",
    "inserir",
    "insira",
    "cadastrar",
    "cadastre",
    "registar",
    "registe",
    "registrar",
    "adicione",
    "adicionar",
    "novo",
    "nova",
    "actualizar",
    "atualizar",
    "actualize",
    "atualize",
    "alterar",
    "altere",
    "editar",
    "edite",
    "corrigir",
    "corrija",
    "apagar",
    "apague",
    "remover",
    "remova",
    "eliminar",
    "elimine",
    "excluir",
    "exclua",
    "create",
    "insert",
    "update",
    "delete",
    "remove",
)

DATA_TERMS = (
    "quantos",
    "quantas",
    "quanto",
    "qual",
    "quais",
    "listar",
    "liste",
    "lista",
    "mostre",
    "mostrar",
    "ver",
    "consultar",
    "procure",
    "buscar",
    "pesquisar",
    "investigar",
    "investigue",
    "analise",
    "analisar",
    "dados",
    "base de dados",
    "banco de dados",
    "registos",
    "registros",
    "records",
    "show",
    "list",
    "search",
    "resumo",
)

OPERATIONAL_TERMS = (
    "alerta",
    "alertas",
    "erro",
    "erros",
    "falha",
    "falhas",
    "saude",
    "saúde",
    "health",
    "monitor",
    "slo",
    "outbox",
    "rota",
    "rotas",
    "pendente",
    "pendentes",
)

MONITORING_TERMS = (
    "alerta",
    "alertas",
    "erro",
    "erros",
    "error",
    "falha",
    "falhas",
    "health",
    "monitor",
    "monitoramento",
    "monitorização",
    "outbox",
    "rota",
    "rotas",
    "slo",
    "5xx",
    "4xx",
    "estado operacional",
)

REPORT_TERMS = ("relatorio", "relatório", "report", "export", "exportar", "pdf", "csv", "word", "download")

TASK_TERMS = (
    "tarefa",
    "task",
    "atribuir",
    "atribui",
    "encaminhar",
    "encaminha",
    "notificar",
    "notifica",
    "follow up",
    "follow-up",
)

GREETING_TERMS = (
    "ola",
    "olá",
    "bom dia",
    "boa tarde",
    "boa noite",
    "hello",
    "hi",
)

VAGUE_REFERENCES = (
    "isso",
    "isto",
    "aquilo",
    "essa informacao",
    "essa informação",
    "este assunto",
    "o problema",
    "os dados",
    "a situacao",
    "a situação",
    "ver isso",
    "mostrar isso",
)

BROAD_REQUEST_TERMS = (
    "ajuda",
    "help",
    "investigar",
    "analisar",
    "verificar",
    "mostra me",
    "mostre me",
)

SUPPORT_TERMS = (
    "ajuda",
    "ajude",
    "como",
    "qual e",
    "qual é",
    "o que",
    "oque",
    "onde",
    "quando",
    "quem",
    "porque",
    "por que",
    "posso",
    "pode",
    "funciona",
    "significa",
    "perguntas",
    "exemplos",
    "sugestao",
    "sugestão",
    "duvida",
    "dúvida",
    "help",
    "how",
    "what",
    "where",
    "when",
    "why",
    "can i",
    "examples",
)

GENERIC_ACTIVE_MODULES = {"", "ai", "ia", "assistant", "ai_assistant"}

PHASE4_PROBES = (
    "dente",
    "odontologia",
    "planos dentarios expirados",
    "plano dentario valido",
    "historico dentario",
    "consulta dentaria",
    "stock",
    "faturas pendentes",
    "funcionarios ferias",
    "erros 500",
)


@dataclass(frozen=True, slots=True)
class IntentResourceSignal:
    basename: str
    module: str
    label_pt: str
    label_en: str
    score: int
    matched_terms: tuple[str, ...]
    sources: tuple[str, ...]

    @classmethod
    def from_descriptor(
        cls,
        descriptor: ResourceDescriptor,
        *,
        score: int = 0,
        matched_terms: tuple[str, ...] = (),
        sources: tuple[str, ...] = (),
    ) -> IntentResourceSignal:
        return cls(
            basename=descriptor.basename,
            module=descriptor.prefix,
            label_pt=descriptor.label_pt,
            label_en=descriptor.label_en,
            score=score,
            matched_terms=matched_terms,
            sources=sources,
        )

    def as_payload(self) -> dict[str, Any]:
        return {
            "basename": self.basename,
            "module": self.module,
            "label_pt": self.label_pt,
            "label_en": self.label_en,
            "score": self.score,
            "matched_terms": list(self.matched_terms),
            "sources": list(self.sources),
        }


def build_intent_signals(
    *,
    message: str,
    active_module: str = "",
    session_metadata: dict[str, Any] | None = None,
    tenant=None,
) -> dict[str, Any]:
    raw = message or ""
    normalized = normalize_alias_text(raw)
    tokens = normalized.split()
    active_module_key = (active_module or "").strip().lower()
    active_module_normalized = normalize_alias_text(active_module_key)
    active_module_scoped = active_module_normalized not in GENERIC_ACTIVE_MODULES
    session_metadata = session_metadata or {}
    focus = session_metadata.get("conversation_focus") if isinstance(session_metadata, dict) else {}
    pending = session_metadata.get("intent_clarification") if isinstance(session_metadata, dict) else {}
    resource_resolution = resolve_resource_matches(
        raw,
        active_module=active_module_key,
        session_metadata=session_metadata,
        limit=8,
    )
    resource_matches = _resource_signals(resource_resolution)
    resource_modules = tuple(sorted({match.module for match in resource_matches}))
    project_identity = should_select_project_identity(message=raw, active_module=active_module_key)
    project_context = should_select_project_context(message=raw, active_module=active_module_key)
    personal = _has_any(normalized, PERSONAL_TERMS)
    crud = _has_any(normalized, CRUD_TERMS)
    data = _has_any(normalized, DATA_TERMS)
    operational = _has_any(normalized, OPERATIONAL_TERMS)
    monitoring = active_module_normalized in {"monitoring", "command center"} or _has_any(normalized, MONITORING_TERMS)
    report = _has_any(normalized, REPORT_TERMS)
    task = _has_any(normalized, TASK_TERMS)
    support_request = _has_any(normalized, SUPPORT_TERMS)
    knowledge_base = False
    if not (project_identity or project_context or personal) and (
        support_request or (not resource_matches and not (crud or report or task or monitoring))
    ):
        knowledge_base = should_select_knowledge_base(message=raw, active_module=active_module_key, tenant=tenant)

    return {
        "normalized": normalized,
        "tokens": tokens,
        "short": len(tokens) <= 3,
        "greeting_only": is_standalone_greeting(raw),
        "vague_reference": _has_any(normalized, VAGUE_REFERENCES),
        "broad_request": _has_any(normalized, BROAD_REQUEST_TERMS),
        "project_identity": project_identity,
        "project_context": project_context,
        "knowledge_base": knowledge_base,
        "support_request": support_request,
        "personal": personal,
        "crud": crud,
        "data": data,
        "operational": operational,
        "monitoring": monitoring,
        "report": report,
        "task": task,
        "resource_count": len(resource_matches),
        "resource_basenames": [item.basename for item in resource_matches[:8]],
        "resource_modules": list(resource_modules),
        "resource_matches": [item.as_payload() for item in resource_matches[:8]],
        "resource_ambiguous": resource_resolution.ambiguous,
        "resource_ambiguity_reason": resource_resolution.ambiguity_reason,
        "resource_candidate_modules": list(resource_resolution.candidate_modules),
        "resource_top_module": resource_resolution.top_module,
        "resource_disambiguation": resource_resolution.as_payload(),
        "code_or_id": bool(re.search(r"\b(?:id\s*)?\d+\b|\b[A-Z]{2,12}-[A-Z0-9-]+\b", raw, flags=re.IGNORECASE)),
        "json_payload": "{" in raw and "}" in raw,
        "active_module": active_module_key,
        "active_module_normalized": active_module_normalized,
        "active_module_scoped": active_module_scoped,
        "has_previous_focus": isinstance(focus, dict) and bool(focus.get("intent") or focus.get("resources")),
        "has_pending_clarification": isinstance(pending, dict) and pending.get("status") == "needs_clarification",
    }


def build_phase4_intent_report() -> dict[str, Any]:
    from apps.ai_assistant.services.intent_router import AiIntentRouter
    from apps.ai_assistant.services.registry import AiToolRegistry

    router = AiIntentRouter()
    registry = AiToolRegistry()
    probes = []
    for probe in PHASE4_PROBES:
        signals = build_intent_signals(message=probe, active_module="ai")
        decision = router.analyze(message=probe, active_module="ai")
        selected_tools = registry.select_tools(message=probe, active_module="ai")
        probes.append(
            {
                "input": probe,
                "intent": decision.intent,
                "status": "needs_clarification" if decision.needs_clarification else "ready",
                "confidence_score": decision.confidence_score,
                "resource_basenames": signals["resource_basenames"][:5],
                "resource_modules": signals["resource_modules"],
                "selected_tools": [tool.name for tool in selected_tools],
            }
        )

    tool_counts = Counter(tool for probe in probes for tool in probe["selected_tools"])
    return {
        "phase": 4,
        "title": "Roteamento semantico de intencoes por aliases canonicos",
        "generated_at": datetime.now(UTC).isoformat(),
        "summary": {
            "probes": len(probes),
            "ready": sum(1 for probe in probes if probe["status"] == "ready"),
            "needs_clarification": sum(1 for probe in probes if probe["status"] == "needs_clarification"),
            "probes_with_resources": sum(1 for probe in probes if probe["resource_basenames"]),
            "tool_counts": dict(sorted(tool_counts.items())),
        },
        "probes": probes,
        "priority_findings": _phase4_findings(probes),
    }


def render_phase4_intent_markdown(report: dict[str, Any]) -> str:
    summary = report["summary"]
    lines = [
        "# IA Operacional - Roteamento Semantico Fase 4",
        "",
        f"Gerado em UTC: {report['generated_at']}",
        "",
        "## Resumo",
        "",
        f"- Probes analisados: {summary['probes']}",
        f"- Prontos sem clarificacao: {summary['ready']}",
        f"- Ainda exigem clarificacao: {summary['needs_clarification']}",
        f"- Probes com recursos normalizados: {summary['probes_with_resources']}",
        "",
        "## Ferramentas Seleccionadas",
        "",
    ]
    lines.extend(f"- `{tool}`: {count}" for tool, count in summary["tool_counts"].items())
    lines.extend(
        [
            "",
            "## Probes",
            "",
            "| Entrada | Estado | Intencao | Recursos | Ferramentas |",
            "| --- | --- | --- | --- | --- |",
        ]
    )
    for probe in report["probes"]:
        resources = ", ".join(probe["resource_basenames"]) or "-"
        tools = ", ".join(probe["selected_tools"]) or "-"
        lines.append(f"| `{probe['input']}` | {probe['status']} | `{probe['intent']}` | {resources} | {tools} |")

    lines.extend(["", "## Achados Prioritarios", ""])
    lines.extend(f"- {finding}" for finding in report["priority_findings"])
    return "\n".join(lines).rstrip() + "\n"


def render_phase4_intent_text(report: dict[str, Any]) -> str:
    summary = report["summary"]
    findings = "\n".join(f"- {item}" for item in report["priority_findings"])
    return "\n".join(
        [
            "IA Operacional - Roteamento Semantico Fase 4",
            f"Gerado em UTC: {report['generated_at']}",
            "",
            f"Probes analisados: {summary['probes']}",
            f"Prontos sem clarificacao: {summary['ready']}",
            f"Ainda exigem clarificacao: {summary['needs_clarification']}",
            f"Probes com recursos normalizados: {summary['probes_with_resources']}",
            "",
            "Achados prioritarios:",
            findings,
        ]
    )


def _resource_signals(resource_resolution: ResourceDisambiguationResult) -> tuple[IntentResourceSignal, ...]:
    return tuple(
        IntentResourceSignal.from_descriptor(
            match.descriptor,
            score=match.score,
            matched_terms=match.matched_terms,
            sources=match.sources,
        )
        for match in resource_resolution.matches
    )


def _has_any(normalized: str, terms: tuple[str, ...]) -> bool:
    return any(_has_term(normalized, term) for term in terms)


def _has_term(normalized: str, raw_term: str) -> bool:
    term = normalize_alias_text(raw_term)
    if not term:
        return False
    return bool(re.search(rf"(?<!\w){re.escape(term)}(?!\w)", normalized))


def _phase4_findings(probes: list[dict[str, Any]]) -> list[str]:
    findings = [
        "Router e registry passam a consumir o mesmo servico de sinais semanticos antes de escolher ferramenta.",
        "Recursos reconhecidos por aliases canonicos agora chamam ferramentas operacionais mesmo quando a mensagem e curta.",
    ]
    fallback_user_context = [
        probe["input"]
        for probe in probes
        if probe["selected_tools"] == ["get_user_context"] and probe["resource_basenames"]
    ]
    if fallback_user_context:
        findings.append(
            "Alguns probes com recurso ainda cairam apenas em contexto do utilizador: "
            + ", ".join(fallback_user_context)
            + "."
        )
    ambiguous_modules = [
        probe["input"]
        for probe in probes
        if len(probe["resource_modules"]) > 1
    ]
    if ambiguous_modules:
        findings.append(
            "Entradas com mais de um modulo continuam a precisar de desambiguacao contextual nas fases 8 e 9: "
            + ", ".join(ambiguous_modules[:5])
            + "."
        )
    findings.append("A fase 5 deve enriquecer filtros/estados para transformar termos como valido, expirado e pendente em querysets reais.")
    return findings
