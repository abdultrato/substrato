from __future__ import annotations

from collections import Counter, defaultdict
from datetime import UTC, datetime
from importlib.util import find_spec
from pathlib import Path
from typing import Any

from django.conf import settings

from api.v1.routing.routes import VIEWSET_GROUPS
from apps.ai_assistant.services.llm_gateway import LocalLlmGateway
from apps.ai_assistant.services.registry import AiToolRegistry
from apps.ai_assistant.tools.resource_catalog import (
    MODULE_ALIASES,
    MODULE_LABELS,
    RESOURCE_ALIASES,
    RESOURCE_LABELS,
    get_resource_descriptors,
    match_resource_descriptors,
)

DIRECT_TOOL_MODULES: dict[str, tuple[str, ...]] = {
    "get_command_center_alerts": ("monitoring",),
    "get_clinical_operational_summary": ("clinical",),
    "get_lab_request_collection_guidance": ("clinical",),
    "get_nursing_pending_work": ("nursing",),
    "get_financial_operational_summary": ("accounting", "billing", "payments"),
    "get_pharmacy_stock_summary": ("pharmacy",),
    "get_education_summary": ("education",),
    "get_user_context": ("identity",),
}

GENERIC_AI_TOOLS = (
    "explore_database",
    "run_sql_analytics",
    "prepare_crud_operation",
    "prepare_operational_report",
    "prepare_operational_task",
    "answer_predicted_question",
)

LOOSE_LANGUAGE_PROBES: tuple[dict[str, str], ...] = (
    {
        "text": "s",
        "expected_area": "mensagem vazia ou ruído",
        "risk": "Entrada curta demais pode virar clarificação genérica sem aprender intenção.",
    },
    {
        "text": "dente",
        "expected_area": "odontologia",
        "risk": "Palavra solta de domínio precisa encontrar módulo/recurso mesmo sem verbo.",
    },
    {
        "text": "planos dentarios expirados",
        "expected_area": "odontologia",
        "risk": "Mistura recurso + estado; precisa distinguir plano dentário de plano do paciente.",
    },
    {
        "text": "pacientes hoje",
        "expected_area": "clínico/recepção",
        "risk": "Fragmento sem verbo exige inferência de contagem/listagem e período.",
    },
    {
        "text": "paracetamol ontem",
        "expected_area": "farmácia",
        "risk": "Entidade + data relativa precisa virar consulta histórica segura.",
    },
    {
        "text": "stock",
        "expected_area": "farmácia ou armazém",
        "risk": "Termo ambíguo entre módulos deve pedir clarificação ou usar contexto activo.",
    },
    {
        "text": "consultas abertas",
        "expected_area": "consultas",
        "risk": "Estado operacional precisa mapear para campos reais de consulta.",
    },
    {
        "text": "faturas pendentes",
        "expected_area": "facturação/financeiro",
        "risk": "Status financeiro exige aliases consistentes e filtros auditáveis.",
    },
    {
        "text": "erros 500",
        "expected_area": "monitorização",
        "risk": "Pedido técnico curto precisa acionar Command Center sem depender de frase pronta.",
    },
    {
        "text": "funcionarios ferias",
        "expected_area": "recursos humanos",
        "risk": "Dois substantivos devem resolver domínio, recurso e relação.",
    },
)

FAILURE_TAXONOMY: tuple[dict[str, str], ...] = (
    {
        "code": "keyword_overfit",
        "title": "Dependência excessiva de palavras-chave",
        "symptom": "A IA acerta frases previstas, mas falha palavras soltas, erros ortográficos e sinónimos novos.",
        "audit_signal": "Router e registry usam listas explícitas de termos; catálogo usa correspondência por regex de palavra inteira.",
        "next_phase": "Fases 3, 4 e 6.",
    },
    {
        "code": "module_coverage_gap",
        "title": "Cobertura desigual por módulo",
        "symptom": "Alguns módulos têm ferramenta especializada, outros dependem apenas do explorador genérico.",
        "audit_signal": "Comparação entre VIEWSET_GROUPS, catálogo de recursos e ferramentas registadas.",
        "next_phase": "Fases 2 e 10.",
    },
    {
        "code": "ambiguous_short_input",
        "title": "Entrada curta ou ambígua",
        "symptom": "Pedidos como 'stock', 'dente' ou 'pendentes' não trazem intenção, recurso e filtros suficientes.",
        "audit_signal": "Catálogo de probes de linguagem solta e recursos encontrados por termo.",
        "next_phase": "Fases 4, 8 e 9.",
    },
    {
        "code": "llm_not_semantic_core",
        "title": "Gateway local determinístico",
        "symptom": "A resposta final resume ferramentas, mas não faz interpretação semântica profunda.",
        "audit_signal": "LocalLlmGateway.provider permanece 'local'.",
        "next_phase": "Fases 6 e 7.",
    },
    {
        "code": "alias_drift",
        "title": "Aliases dispersos e difíceis de governar",
        "symptom": "Termos PT/EN, labels, aliases de módulos e aliases de CRUD podem divergir.",
        "audit_signal": "Resource catalog, CRUD e serializers mantêm normalizações próprias.",
        "next_phase": "Fase 3.",
    },
    {
        "code": "weak_feedback_loop",
        "title": "Falhas não viram treino automaticamente",
        "symptom": "Perguntas não entendidas não geram fila governada de revisão e testes.",
        "audit_signal": "A auditoria mede lacunas, mas ainda não há ciclo completo de aprendizagem.",
        "next_phase": "Fases 17, 18 e 20.",
    },
)


def build_phase1_ai_audit() -> dict[str, Any]:
    descriptors = list(get_resource_descriptors())
    registry = AiToolRegistry()
    tools = registry.all()
    base_dir = Path(settings.BASE_DIR)

    module_resource_counts = Counter(descriptor.prefix for descriptor in descriptors)
    tool_modes = Counter(str(getattr(tool, "mode", "")) for tool in tools)
    direct_tools_by_module = _direct_tools_by_module()
    modules = sorted(VIEWSET_GROUPS.keys())
    direct_modules = set(direct_tools_by_module.keys())

    missing_resource_labels = [
        descriptor.basename for descriptor in descriptors if descriptor.basename not in RESOURCE_LABELS
    ]
    missing_resource_aliases = [
        descriptor.basename for descriptor in descriptors if descriptor.basename not in RESOURCE_ALIASES
    ]
    missing_module_labels = [module for module in modules if module not in MODULE_LABELS]
    missing_module_aliases = [module for module in modules if module not in MODULE_ALIASES]

    frontend_surfaces = _frontend_surfaces(base_dir)
    docs = _doc_surfaces(base_dir)
    vector_store_available = _vector_store_dependencies_available()

    return {
        "phase": 1,
        "title": "Auditoria de cobertura, lacunas e falhas da IA operacional",
        "generated_at": datetime.now(UTC).isoformat(),
        "summary": {
            "backend_tools": len(tools),
            "tool_modes": dict(sorted(tool_modes.items())),
            "viewset_modules": len(modules),
            "viewset_resources": len(descriptors),
            "direct_specialized_modules": len(direct_modules),
            "modules_without_specialized_tool": sorted(set(modules) - direct_modules),
            "resources_without_curated_label": len(missing_resource_labels),
            "resources_without_curated_aliases": len(missing_resource_aliases),
            "frontend_ai_surfaces": len(frontend_surfaces),
            "ai_docs": len(docs),
            "llm_provider": LocalLlmGateway.provider,
            "vector_store_available": vector_store_available,
        },
        "tool_registry": [
            {
                "name": tool.name,
                "mode": tool.mode,
                "required_groups": list(getattr(tool, "required_groups", ()) or ()),
                "description_pt": getattr(tool, "description_pt", ""),
                "direct_modules": list(DIRECT_TOOL_MODULES.get(tool.name, ())),
                "generic_capability": tool.name in GENERIC_AI_TOOLS,
            }
            for tool in sorted(tools, key=lambda item: item.name)
        ],
        "project_surface": [
            {
                "module": module,
                "resource_count": int(module_resource_counts.get(module, 0)),
                "has_module_label": module in MODULE_LABELS,
                "has_module_aliases": module in MODULE_ALIASES,
                "direct_specialized_tools": direct_tools_by_module.get(module, []),
                "covered_by_generic_catalog": int(module_resource_counts.get(module, 0)) > 0,
            }
            for module in modules
        ],
        "catalog_coverage": {
            "missing_module_labels": missing_module_labels,
            "missing_module_aliases": missing_module_aliases,
            "missing_resource_labels": missing_resource_labels,
            "missing_resource_aliases": missing_resource_aliases,
        },
        "frontend_surfaces": frontend_surfaces,
        "documentation_surfaces": docs,
        "semantic_readiness": {
            "intent_router": "heuristic_terms_with_clarification",
            "resource_matching": "exact_keyword_regex_over_catalog",
            "knowledge_base_vector_search": "available" if vector_store_available else "dependency_or_runtime_unavailable",
            "llm_gateway": LocalLlmGateway.provider,
            "current_limitation": (
                "A interpretação operacional ainda é majoritariamente baseada em termos explícitos; "
                "a busca semântica aparece na base de conhecimento, mas não governa todo o roteamento."
            ),
        },
        "loose_language_probes": _loose_language_probe_results(),
        "failure_taxonomy": list(FAILURE_TAXONOMY),
        "priority_findings": _priority_findings(
            missing_module_aliases=missing_module_aliases,
            missing_resource_aliases=missing_resource_aliases,
            modules_without_specialized_tool=sorted(set(modules) - direct_modules),
        ),
    }


def render_phase1_ai_audit_markdown(audit: dict[str, Any]) -> str:
    summary = audit["summary"]
    lines = [
        "# IA Operacional - Auditoria Fase 1",
        "",
        f"Gerado em UTC: {audit['generated_at']}",
        "",
        "## Resumo",
        "",
        f"- Ferramentas registadas: {summary['backend_tools']}",
        f"- Módulos de API analisados: {summary['viewset_modules']}",
        f"- Recursos de API analisados: {summary['viewset_resources']}",
        f"- Módulos com ferramenta especializada directa: {summary['direct_specialized_modules']}",
        f"- Módulos sem ferramenta especializada directa: {len(summary['modules_without_specialized_tool'])}",
        f"- Recursos sem aliases curados: {summary['resources_without_curated_aliases']}",
        f"- Superfícies frontend da IA: {summary['frontend_ai_surfaces']}",
        f"- Provider LLM actual: `{summary['llm_provider']}`",
        f"- Vector store disponível: {summary['vector_store_available']}",
        "",
        "## Leitura Técnica",
        "",
        audit["semantic_readiness"]["current_limitation"],
        "",
        "## Módulos Sem Ferramenta Especializada Directa",
        "",
    ]

    modules_without_tool = summary["modules_without_specialized_tool"]
    lines.extend(f"- `{module}`" for module in modules_without_tool)
    if not modules_without_tool:
        lines.append("- Nenhum.")

    lines.extend(
        [
            "",
            "## Ferramentas Registadas",
            "",
            "| Ferramenta | Modo | Cobertura directa |",
            "| --- | --- | --- |",
        ]
    )
    for tool in audit["tool_registry"]:
        direct = ", ".join(tool["direct_modules"]) if tool["direct_modules"] else "genérica/sem módulo directo"
        lines.append(f"| `{tool['name']}` | `{tool['mode']}` | {direct} |")

    lines.extend(
        [
            "",
            "## Probes De Linguagem Solta",
            "",
            "| Entrada | Área esperada | Recursos encontrados | Risco |",
            "| --- | --- | --- | --- |",
        ]
    )
    for probe in audit["loose_language_probes"]:
        matches = ", ".join(probe["matched_resources"]) if probe["matched_resources"] else "nenhum"
        lines.append(f"| `{probe['text']}` | {probe['expected_area']} | {matches} | {probe['risk']} |")

    lines.extend(
        [
            "",
            "## Taxonomia De Falhas",
            "",
        ]
    )
    for failure in audit["failure_taxonomy"]:
        lines.extend(
            [
                f"### {failure['code']}",
                f"- Título: {failure['title']}",
                f"- Sintoma: {failure['symptom']}",
                f"- Sinal de auditoria: {failure['audit_signal']}",
                f"- Próxima fase: {failure['next_phase']}",
                "",
            ]
        )

    lines.extend(
        [
            "## Achados Prioritários",
            "",
        ]
    )
    lines.extend(f"- {finding}" for finding in audit["priority_findings"])
    return "\n".join(lines).rstrip() + "\n"


def render_phase1_ai_audit_text(audit: dict[str, Any]) -> str:
    summary = audit["summary"]
    findings = "\n".join(f"- {item}" for item in audit["priority_findings"])
    return "\n".join(
        [
            "IA Operacional - Auditoria Fase 1",
            f"Gerado em UTC: {audit['generated_at']}",
            "",
            f"Ferramentas registadas: {summary['backend_tools']}",
            f"Módulos de API: {summary['viewset_modules']}",
            f"Recursos de API: {summary['viewset_resources']}",
            f"Módulos com ferramenta especializada directa: {summary['direct_specialized_modules']}",
            f"Módulos sem ferramenta especializada directa: {len(summary['modules_without_specialized_tool'])}",
            f"Recursos sem aliases curados: {summary['resources_without_curated_aliases']}",
            f"Provider LLM actual: {summary['llm_provider']}",
            f"Vector store disponível: {summary['vector_store_available']}",
            "",
            "Achados prioritários:",
            findings,
        ]
    )


def _direct_tools_by_module() -> dict[str, list[str]]:
    grouped: dict[str, list[str]] = defaultdict(list)
    for tool_name, modules in DIRECT_TOOL_MODULES.items():
        for module in modules:
            grouped[module].append(tool_name)
    return {module: sorted(tools) for module, tools in grouped.items()}


def _vector_store_dependencies_available() -> bool:
    return all(find_spec(package) is not None for package in ("faiss", "sentence_transformers", "numpy"))


def _loose_language_probe_results() -> list[dict[str, Any]]:
    results: list[dict[str, Any]] = []
    for probe in LOOSE_LANGUAGE_PROBES:
        matches = match_resource_descriptors(probe["text"], limit=5)
        results.append(
            {
                **probe,
                "matched_resources": [descriptor.basename for descriptor in matches],
                "matched_modules": sorted({descriptor.prefix for descriptor in matches}),
            }
        )
    return results


def _frontend_surfaces(base_dir: Path) -> list[dict[str, str]]:
    candidates = [
        "frontend-next/app/ai/page.tsx",
        "frontend-next/app/ai/tasks/page.tsx",
        "frontend-next/app/ai/investigations/page.tsx",
        "frontend-next/components/ai/AiActionPanel.tsx",
        "frontend-next/components/ai/AiEvidencePanel.tsx",
        "frontend-next/components/ai/AiInvestigationPanel.tsx",
        "frontend-next/components/ai/AiTaskPanel.tsx",
        "frontend-next/components/ai/AiToolTrace.tsx",
    ]
    return [{"path": path, "status": "present"} for path in candidates if (base_dir / path).exists()]


def _doc_surfaces(base_dir: Path) -> list[dict[str, str]]:
    candidates = [
        "docs/ai_operational_assistant.md",
        "docs/ai_knowledge_base_semantic_search.md",
    ]
    return [{"path": path, "status": "present"} for path in candidates if (base_dir / path).exists()]


def _priority_findings(
    *,
    missing_module_aliases: list[str],
    missing_resource_aliases: list[str],
    modules_without_specialized_tool: list[str],
) -> list[str]:
    findings = [
        "A IA já tem base operacional, mas a decisão ainda é predominantemente heurística e sensível a palavras exactas.",
        "O gateway LLM actual é local/determinístico; isto é seguro, mas limita compreensão semântica de linguagem livre.",
    ]
    if modules_without_specialized_tool:
        preview = ", ".join(modules_without_specialized_tool[:8])
        findings.append(
            f"{len(modules_without_specialized_tool)} módulos não têm ferramenta especializada directa; primeiros: {preview}."
        )
    if missing_module_aliases:
        preview = ", ".join(missing_module_aliases[:8])
        findings.append(f"{len(missing_module_aliases)} módulos não têm aliases de módulo curados; primeiros: {preview}.")
    if missing_resource_aliases:
        preview = ", ".join(missing_resource_aliases[:8])
        findings.append(f"{len(missing_resource_aliases)} recursos não têm aliases curados; primeiros: {preview}.")
    findings.append(
        "A fase 2 deve transformar VIEWSET_GROUPS, modelos, serializers e permissões num mapa canónico consumido pela IA."
    )
    return findings
