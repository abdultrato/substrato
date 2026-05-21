from __future__ import annotations

import re
from dataclasses import dataclass
from typing import Any

from apps.ai_assistant.tools.knowledge_base import should_select_knowledge_base
from apps.ai_assistant.tools.resource_catalog import match_resource_descriptors, normalize_text


CLARIFICATION_METADATA_KEY = "intent_clarification"
CONVERSATION_FOCUS_KEY = "conversation_focus"


@dataclass(frozen=True, slots=True)
class IntentDecision:
    """Resultado auditável da leitura inicial da mensagem do utilizador."""

    intent: str
    confidence_score: int
    needs_clarification: bool = False
    reason: str = ""
    question_pt: str = ""
    question_en: str = ""
    options_pt: tuple[str, ...] = ()
    options_en: tuple[str, ...] = ()
    signals: dict[str, Any] | None = None

    def answer(self, *, language: str) -> str:
        if language == "en":
            question = self.question_en or "What exactly should I investigate or prepare?"
            options = self.options_en or DEFAULT_OPTIONS_EN
            return "\n\n".join(
                [
                    "Before querying data or preparing an action, I need to narrow down your objective.",
                    question,
                    "Choose one option or write a more specific question:\n" + "\n".join(f"- {item}" for item in options),
                    "Tip: include the module, date/range, code or action you expect.",
                ]
            )

        question = self.question_pt or "O que exactamente devo investigar ou preparar?"
        options = self.options_pt or DEFAULT_OPTIONS_PT
        return "\n\n".join(
            [
                "Antes de consultar dados ou preparar uma acção, preciso fechar melhor o objectivo.",
                question,
                "Escolha uma opção ou escreva uma pergunta mais específica:\n" + "\n".join(f"- {item}" for item in options),
                "Dica: inclua o módulo, data/período, código ou acção esperada.",
            ]
        )

    def as_payload(self, *, language: str) -> dict[str, Any]:
        return {
            "status": "needs_clarification" if self.needs_clarification else "ready",
            "intent": self.intent,
            "confidence_score": self.confidence_score,
            "reason": self.reason,
            "question": self.question_en if language == "en" else self.question_pt,
            "options": list(self.options_en if language == "en" else self.options_pt),
            "signals": self.signals or {},
        }


DEFAULT_OPTIONS_PT = (
    "Quantos pacientes deram entrada hoje?",
    "Qual era o stock de medicação Paracetamol ontem?",
    "Crie um paciente chamado Paciente Teste.",
    "Gere relatório operacional dos últimos 30 dias.",
)
DEFAULT_OPTIONS_EN = (
    "How many patients were admitted today?",
    "What was the Paracetamol medication stock yesterday?",
    "Create a patient called Test Patient.",
    "Generate an operational report for the last 30 days.",
)

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
PROJECT_IDENTITY_TERMS = (
    "quem criou",
    "quem desenvolveu",
    "criador",
    "criado por",
    "autor",
    "dono",
    "proprietario",
    "proprietário",
    "quando comecou",
    "quando começou",
    "quando iniciou",
    "inicio do desenvolvimento",
    "início do desenvolvimento",
    "github",
    "repositorio",
    "repositório",
    "who created",
    "who built",
    "owner",
    "creator",
    "started development",
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
    "listar",
    "lista",
    "mostre",
    "mostrar",
    "ver",
    "consultar",
    "procure",
    "buscar",
    "pesquisar",
    "investigar",
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
REPORT_TERMS = ("relatorio", "relatório", "report", "export", "exportar", "pdf", "csv", "download")
TASK_TERMS = (
    "tarefa",
    "task",
    "atribuir",
    "atribui",
    "encaminhar",
    "encaminha",
    "notificar",
    "notifica",
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


class AiIntentRouter:
    """Lê a intenção antes de seleccionar ferramentas operacionais."""

    def analyze(
        self,
        *,
        message: str,
        active_module: str = "",
        session_metadata: dict[str, Any] | None = None,
        tenant=None,
    ) -> IntentDecision:
        raw = message or ""
        normalized = normalize_text(raw)
        session_metadata = session_metadata or {}
        active_module = normalize_text(active_module or "")
        focus = session_metadata.get(CONVERSATION_FOCUS_KEY) if isinstance(session_metadata, dict) else {}
        pending = session_metadata.get(CLARIFICATION_METADATA_KEY) if isinstance(session_metadata, dict) else {}

        if not normalized:
            return self._clarification(
                intent="empty",
                reason="empty_message",
                question_pt="Envie a pergunta ou a operação que pretende fazer.",
                question_en="Send the question or operation you want to perform.",
                confidence=5,
                signals={"empty": True},
            )

        if isinstance(session_metadata.get("crud_draft"), dict):
            return self._ready("crud_followup", 88, {"crud_draft": True})

        signals = self._signals(normalized=normalized, active_module=active_module, focus=focus, pending=pending, tenant=tenant)

        if signals["project_identity"]:
            return self._ready("project_identity", 94, signals)
        if signals["knowledge_base"]:
            return self._ready("knowledge_base", 88, signals)

        if signals["personal"]:
            return self._ready("user_context", 92, signals)

        if signals["resource_count"] or signals["code_or_id"] or signals["json_payload"]:
            if signals["crud"]:
                return self._ready("crud_operation", 92, signals)
            if signals["data"] or signals["operational"] or active_module:
                return self._ready("data_or_operational_lookup", 86, signals)
            if signals["resource_count"]:
                return self._ready("data_lookup", 76, signals)

        if signals["report"]:
            return self._ready("report", 84, signals)
        if signals["task"]:
            return self._ready("task", 84, signals)
        if signals["crud"]:
            return self._ready("crud_operation", 78, signals)
        if signals["operational"]:
            return self._ready("operational_health", 78, signals)

        if signals["greeting_only"]:
            return self._clarification(
                intent="greeting",
                reason="greeting_without_goal",
                question_pt="Diga-me o que quer investigar, criar, alterar, remover ou reportar.",
                question_en="Tell me what you want to investigate, create, update, delete or report.",
                confidence=20,
                signals=signals,
            )

        if signals["vague_reference"] and not signals["has_previous_focus"]:
            return self._clarification(
                intent="ambiguous_reference",
                reason="reference_without_context",
                question_pt="Quando diz \"isso\", está a referir-se a que módulo, registo, erro ou processo?",
                question_en="When you say \"that\", which module, record, error or process do you mean?",
                confidence=25,
                signals=signals,
            )

        if signals["broad_request"] and not (signals["resource_count"] or active_module or signals["has_previous_focus"]):
            return self._clarification(
                intent="broad_request",
                reason="broad_request_without_scope",
                question_pt="Quer que eu investigue dados, prepare CRUD, gere relatório ou crie uma tarefa?",
                question_en="Should I investigate data, prepare CRUD, generate a report or create a task?",
                confidence=35,
                signals=signals,
            )

        if signals["short"] and not (active_module or signals["has_previous_focus"]):
            return self._clarification(
                intent="underspecified",
                reason="short_message_without_scope",
                question_pt="A mensagem está curta. Qual é o módulo ou resultado esperado?",
                question_en="The message is short. Which module or expected outcome should I use?",
                confidence=30,
                signals=signals,
            )

        if signals["data"] or active_module or signals["has_previous_focus"]:
            return self._ready("data_or_context_followup", 68, signals)

        return self._clarification(
            intent="unknown",
            reason="no_strong_signal",
            question_pt="Qual é o objectivo: consultar dados, fazer uma alteração, gerar relatório ou criar tarefa?",
            question_en="What is the objective: query data, make a change, generate a report or create a task?",
            confidence=40,
            signals=signals,
        )

    def _signals(
        self,
        *,
        normalized: str,
        active_module: str,
        focus: Any,
        pending: Any,
        tenant=None,
    ) -> dict[str, Any]:
        tokens = normalized.split()
        resource_matches = match_resource_descriptors(normalized, limit=5)
        has_previous_focus = isinstance(focus, dict) and bool(focus.get("intent") or focus.get("resources"))
        has_pending_clarification = isinstance(pending, dict) and pending.get("status") == "needs_clarification"
        return {
            "short": len(tokens) <= 3,
            "greeting_only": self._is_greeting_only(normalized),
            "vague_reference": any(term in normalized for term in (normalize_text(item) for item in VAGUE_REFERENCES)),
            "broad_request": self._has_any(normalized, ("ajuda", "help", "investigar", "analisar", "verificar", "mostra-me", "mostre me")),
            "project_identity": self._has_project_identity(normalized),
            "knowledge_base": should_select_knowledge_base(message=normalized, active_module=active_module, tenant=tenant),
            "personal": self._has_any(normalized, PERSONAL_TERMS),
            "crud": self._has_any(normalized, CRUD_TERMS),
            "data": self._has_any(normalized, DATA_TERMS),
            "operational": self._has_any(normalized, OPERATIONAL_TERMS),
            "report": self._has_any(normalized, REPORT_TERMS),
            "task": self._has_any(normalized, TASK_TERMS),
            "resource_count": len(resource_matches),
            "resource_basenames": [item.basename for item in resource_matches[:5]],
            "code_or_id": bool(re.search(r"\b(?:id\s*)?\d+\b|\b[A-Z]{2,12}-[A-Z0-9-]+\b", normalized, flags=re.IGNORECASE)),
            "json_payload": "{" in normalized and "}" in normalized,
            "active_module": active_module,
            "has_previous_focus": has_previous_focus,
            "has_pending_clarification": has_pending_clarification,
        }

    def _clarification(
        self,
        *,
        intent: str,
        reason: str,
        question_pt: str,
        question_en: str,
        confidence: int,
        signals: dict[str, Any],
    ) -> IntentDecision:
        return IntentDecision(
            intent=intent,
            confidence_score=confidence,
            needs_clarification=True,
            reason=reason,
            question_pt=question_pt,
            question_en=question_en,
            options_pt=DEFAULT_OPTIONS_PT,
            options_en=DEFAULT_OPTIONS_EN,
            signals=signals,
        )

    def _ready(self, intent: str, confidence: int, signals: dict[str, Any]) -> IntentDecision:
        return IntentDecision(
            intent=intent,
            confidence_score=confidence,
            needs_clarification=False,
            reason="strong_enough_signal",
            signals=signals,
        )

    @staticmethod
    def _has_any(normalized: str, terms: tuple[str, ...]) -> bool:
        return any(re.search(rf"(?<!\w){re.escape(normalize_text(term))}(?!\w)", normalized) for term in terms)

    @staticmethod
    def _has_project_identity(normalized: str) -> bool:
        scope_terms = ("sistema", "projecto", "projeto", "substrato", "software", "app", "plataforma", "system", "project")
        if not any(re.search(rf"(?<!\w){re.escape(normalize_text(term))}(?!\w)", normalized) for term in scope_terms):
            return False
        return any(
            re.search(rf"(?<!\w){re.escape(normalize_text(term))}(?!\w)", normalized)
            for term in PROJECT_IDENTITY_TERMS
        )

    @staticmethod
    def _is_greeting_only(normalized: str) -> bool:
        cleaned = re.sub(r"[!?.;,]+", " ", normalized).strip()
        if not cleaned:
            return False
        return any(cleaned == normalize_text(term) for term in GREETING_TERMS)
