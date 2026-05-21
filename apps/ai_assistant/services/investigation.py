from __future__ import annotations

from dataclasses import dataclass
from typing import Any

from apps.ai_assistant.models import AiInvestigation

from .redaction import redact_text, redact_value


@dataclass(slots=True)
class InvestigationBuildResult:
    payload: dict[str, Any] | None
    should_persist: bool


class AiInvestigationBuilder:
    """Constrói artefactos de investigação reutilizáveis a partir do chat."""

    def build(
        self,
        *,
        question: str,
        language: str,
        active_module: str,
        tool_results: list[dict[str, Any]],
        blocked_tools: list[dict[str, Any]],
        sources: list[dict[str, Any]],
        suggested_actions: list[dict[str, Any]],
    ) -> InvestigationBuildResult:
        if self._only_user_context(tool_results=tool_results, blocked_tools=blocked_tools):
            return InvestigationBuildResult(payload=None, should_persist=False)

        intent = self._infer_intent(tool_results=tool_results, blocked_tools=blocked_tools)
        status = "blocked" if blocked_tools or any((item.get("result") or {}).get("access_denied") for item in tool_results) else "ready"
        findings = self._findings(tool_results=tool_results, blocked_tools=blocked_tools, language=language)
        next_steps = self._next_steps(
            intent=intent,
            status=status,
            sources=sources,
            suggested_actions=suggested_actions,
            language=language,
        )
        recommended_questions = self._recommended_questions(intent=intent, status=status, language=language)
        tool_names = [str(item.get("tool_name") or "") for item in tool_results if item.get("tool_name")]
        if blocked_tools:
            tool_names.extend(str(item.get("tool_name") or "") for item in blocked_tools if item.get("tool_name"))
        tool_names = list(dict.fromkeys(tool_names))

        title = self._title(intent=intent, language=language)
        summary = self._summary(
            intent=intent,
            status=status,
            findings=findings,
            language=language,
        )
        payload = {
            "title": title,
            "question": redact_text(question or ""),
            "intent": intent,
            "status": status,
            "confidence_score": self._confidence(tool_results=tool_results, blocked_tools=blocked_tools),
            "scope": {
                "language": language,
                "active_module": active_module or "",
                "tool_count": len(tool_results),
                "blocked_count": len(blocked_tools),
            },
            "findings": findings,
            "next_steps": next_steps,
            "recommended_questions": recommended_questions,
            "sources": redact_value(sources),
            "tool_names": tool_names,
            "result_summary": summary,
        }
        return InvestigationBuildResult(payload=payload, should_persist=True)

    def persist(
        self,
        *,
        tenant,
        session,
        user,
        payload: dict[str, Any],
    ) -> AiInvestigation:
        return AiInvestigation.objects.create(
            tenant=tenant,
            session=session,
            created_by=user if getattr(user, "is_authenticated", False) else None,
            title=str(payload.get("title") or "Investigação da IA")[:180],
            question=str(payload.get("question") or ""),
            intent=str(payload.get("intent") or ""),
            status=str(payload.get("status") or AiInvestigation.Status.READY),
            confidence_score=int(payload.get("confidence_score") or 60),
            scope=redact_value(payload.get("scope") or {}),
            findings=redact_value(payload.get("findings") or []),
            next_steps=redact_value(payload.get("next_steps") or []),
            recommended_questions=redact_value(payload.get("recommended_questions") or []),
            sources=redact_value(payload.get("sources") or []),
            tool_names=redact_value(payload.get("tool_names") or []),
            result_summary=redact_text(str(payload.get("result_summary") or "")),
        )

    def serialize(self, investigation: AiInvestigation, *, language: str) -> dict[str, Any]:
        return {
            "id": investigation.id,
            "custom_id": investigation.custom_id,
            "title": investigation.title,
            "intent": investigation.intent,
            "status": investigation.status,
            "confidence_score": investigation.confidence_score,
            "question": investigation.question,
            "scope": investigation.scope or {},
            "findings": investigation.findings or [],
            "next_steps": investigation.next_steps or [],
            "recommended_questions": investigation.recommended_questions or [],
            "sources": investigation.sources or [],
            "tool_names": investigation.tool_names or [],
            "result_summary": investigation.result_summary,
            "created_at": investigation.created_at.isoformat() if investigation.created_at else None,
            "label": "Investigation" if language == "en" else "Investigação",
        }

    def _only_user_context(self, *, tool_results: list[dict[str, Any]], blocked_tools: list[dict[str, Any]]) -> bool:
        if blocked_tools:
            return False
        names = [item.get("tool_name") for item in tool_results]
        return names == ["get_user_context"]

    def _infer_intent(self, *, tool_results: list[dict[str, Any]], blocked_tools: list[dict[str, Any]]) -> str:
        if blocked_tools or any((item.get("result") or {}).get("access_denied") for item in tool_results):
            return "access_review"
        names = {item.get("tool_name") for item in tool_results}
        if "run_sql_analytics" in names:
            return "sql_analytics"
        if "explore_database" in names:
            return "data_exploration"
        if "get_command_center_alerts" in names:
            return "operational_health"
        if "get_lab_request_collection_guidance" in names:
            return "sample_collection"
        if "get_nursing_pending_work" in names:
            return "nursing_flow"
        if "get_financial_operational_summary" in names:
            return "financial_review"
        if "get_pharmacy_stock_summary" in names:
            return "pharmacy_stock"
        if "get_education_summary" in names:
            return "education_review"
        if "prepare_operational_report" in names:
            return "report_preparation"
        if "prepare_operational_task" in names:
            return "task_preparation"
        return "operational_investigation"

    def _findings(
        self,
        *,
        tool_results: list[dict[str, Any]],
        blocked_tools: list[dict[str, Any]],
        language: str,
    ) -> list[dict[str, Any]]:
        findings: list[dict[str, Any]] = []
        for blocked in blocked_tools:
            findings.append(
                {
                    "severity": "warning",
                    "title": "Access blocked" if language == "en" else "Acesso bloqueado",
                    "detail": str(blocked.get("reason") or blocked.get("tool_name") or ""),
                    "source": "RBAC",
                }
            )

        for item in tool_results:
            result = item.get("result") or {}
            summary = result.get("summary") or {}
            title = summary.get("title_en") if language == "en" else summary.get("title_pt")
            title = title or item.get("tool_name") or "AI tool"
            if result.get("access_denied"):
                denied = result.get("denied_resources") or summary.get("denied_resources") or []
                findings.append(
                    {
                        "severity": "warning",
                        "title": "Access denied" if language == "en" else "Acesso negado",
                        "detail": ", ".join(
                            str((res.get("label_en") if language == "en" else res.get("label_pt")) or res.get("basename") or "")
                            for res in denied[:4]
                        )
                        or str(title),
                        "source": "RBAC",
                    }
                )
                continue

            metrics = summary.get("metrics") or []
            for metric in metrics[:6]:
                label = metric.get("label_en") if language == "en" else metric.get("label_pt")
                findings.append(
                    {
                        "severity": self._metric_severity(metric.get("value")),
                        "title": str(label or title),
                        "detail": str(metric.get("value")),
                        "source": str(title),
                    }
                )

            for resource in summary.get("resource_results") or []:
                label = resource.get("label_en") if language == "en" else resource.get("label_pt")
                findings.append(
                    {
                        "severity": "info",
                        "title": str(label or resource.get("basename") or title),
                        "detail": (
                            f"{resource.get('filtered_count', 0)} matching record(s), {resource.get('total_count', 0)} total"
                            if language == "en"
                            else f"{resource.get('filtered_count', 0)} registo(s) encontrados, {resource.get('total_count', 0)} no total"
                        ),
                        "source": str(resource.get("model") or title),
                    }
                )

        return findings[:12]

    def _next_steps(
        self,
        *,
        intent: str,
        status: str,
        sources: list[dict[str, Any]],
        suggested_actions: list[dict[str, Any]],
        language: str,
    ) -> list[dict[str, Any]]:
        if status == "blocked":
            return [
                {
                    "label": "Request permission review" if language == "en" else "Pedir revisão de permissões",
                    "kind": "rbac",
                    "href": "",
                    "priority": "high",
                }
            ]

        steps: list[dict[str, Any]] = []
        for action in suggested_actions[:3]:
            label = action.get("label_en") if language == "en" else action.get("label_pt")
            steps.append(
                {
                    "label": label or action.get("confirmation_summary") or action.get("action_type"),
                    "kind": "action",
                    "href": action.get("href") or action.get("result_href") or "",
                    "priority": "high" if action.get("requires_confirmation") else "normal",
                }
            )

        for source in sources[:4]:
            href = str(source.get("href") or "")
            if not href:
                continue
            steps.append(
                {
                    "label": ("Open source" if language == "en" else "Abrir fonte") + f": {source.get('label') or source.get('type')}",
                    "kind": "navigation",
                    "href": href,
                    "priority": "normal",
                }
            )

        if not steps:
            steps.append(
                {
                    "label": "Refine the question with module, period or code" if language == "en" else "Refinar a pergunta com módulo, período ou código",
                    "kind": "follow_up",
                    "href": "",
                    "priority": "normal",
                }
            )

        if intent == "data_exploration":
            steps.append(
                {
                    "label": "Ask for a specific code/reference" if language == "en" else "Perguntar por um código/referência específica",
                    "kind": "follow_up",
                    "href": "",
                    "priority": "normal",
                }
            )
        return steps[:6]

    def _recommended_questions(self, *, intent: str, status: str, language: str) -> list[str]:
        if status == "blocked":
            return (
                [
                    "Which groups do I have in the system?",
                    "What data can I investigate with my current profile?",
                ]
                if language == "en"
                else [
                    "Que grupos tenho no sistema?",
                    "Que dados posso investigar com o meu perfil actual?",
                ]
            )

        questions_pt = {
            "data_exploration": [
                "Mostre uma listagem segura deste recurso.",
                "Que registos foram criados nos últimos 7 dias?",
                "Que filtros posso aplicar a este módulo?",
            ],
            "sql_analytics": [
                "Cruze esta pesquisa com outro intervalo de datas.",
                "Mostre a decomposição diária ou por lote.",
                "Gere um relatório desta análise.",
            ],
            "operational_health": [
                "Quais rotas devo priorizar primeiro?",
                "Há padrão repetido nos erros 5xx?",
                "Crie uma tarefa para a equipa responsável investigar isto.",
            ],
            "sample_collection": [
                "Mostre apenas as requisições que aguardam colheita.",
                "Que frascos são necessários para esta requisição?",
            ],
        }
        questions_en = {
            "data_exploration": [
                "Show a safe list for this resource.",
                "Which records were created in the last 7 days?",
                "Which filters can I apply to this module?",
            ],
            "sql_analytics": [
                "Compare this query with another date range.",
                "Show the daily or lot-level breakdown.",
                "Generate a report from this analysis.",
            ],
            "operational_health": [
                "Which routes should I prioritize first?",
                "Is there a repeated pattern in the 5xx errors?",
                "Create a task for the responsible team to investigate this.",
            ],
            "sample_collection": [
                "Show only requests waiting for collection.",
                "Which bottles are required for this request?",
            ],
        }
        default_pt = [
            "O que devo investigar primeiro?",
            "Gere um relatório desta investigação.",
            "Crie uma tarefa operacional para dar seguimento.",
        ]
        default_en = [
            "What should I investigate first?",
            "Generate a report for this investigation.",
            "Create an operational follow-up task.",
        ]
        bank = questions_en if language == "en" else questions_pt
        default = default_en if language == "en" else default_pt
        return bank.get(intent, default)

    def _title(self, *, intent: str, language: str) -> str:
        titles = {
            "access_review": ("Revisão de acesso", "Access review"),
            "data_exploration": ("Investigação de dados", "Data investigation"),
            "sql_analytics": ("Pesquisa SQL analítica", "SQL analytics"),
            "operational_health": ("Investigação operacional", "Operational investigation"),
            "sample_collection": ("Investigação de colheita", "Collection investigation"),
            "nursing_flow": ("Investigação de enfermagem", "Nursing investigation"),
            "financial_review": ("Investigação financeira", "Financial investigation"),
            "pharmacy_stock": ("Investigação de farmácia", "Pharmacy investigation"),
            "education_review": ("Investigação escolar", "Education investigation"),
            "report_preparation": ("Preparação de relatório", "Report preparation"),
            "task_preparation": ("Preparação de tarefa", "Task preparation"),
        }
        title_pt, title_en = titles.get(intent, ("Investigação operacional", "Operational investigation"))
        return title_en if language == "en" else title_pt

    def _summary(self, *, intent: str, status: str, findings: list[dict[str, Any]], language: str) -> str:
        if language == "en":
            if status == "blocked":
                return "Investigation blocked by current RBAC policy."
            return f"Structured investigation produced with {len(findings)} finding(s) for {intent.replace('_', ' ')}."
        if status == "blocked":
            return "Investigação bloqueada pela política RBAC actual."
        return f"Investigação estruturada produzida com {len(findings)} achado(s) para {intent.replace('_', ' ')}."

    def _confidence(self, *, tool_results: list[dict[str, Any]], blocked_tools: list[dict[str, Any]]) -> int:
        if blocked_tools:
            return 30
        if any((item.get("result") or {}).get("access_denied") for item in tool_results):
            return 35
        if len(tool_results) >= 2:
            return 80
        if tool_results:
            return 70
        return 45

    def _metric_severity(self, value: Any) -> str:
        try:
            numeric = float(value)
        except (TypeError, ValueError):
            return "info"
        if numeric <= 0:
            return "info"
        return "warning" if numeric >= 1 else "info"
