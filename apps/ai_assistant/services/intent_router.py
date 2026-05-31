from __future__ import annotations

from dataclasses import dataclass
from typing import Any

from apps.ai_assistant.services.intent_signals import build_intent_signals

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
        session_metadata = session_metadata or {}
        signals = build_intent_signals(
            message=message,
            active_module=active_module,
            session_metadata=session_metadata,
            tenant=tenant,
        )

        if not signals["normalized"]:
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

        if signals["project_identity"]:
            return self._ready("project_identity", 94, signals)
        if signals["knowledge_base"]:
            return self._ready("knowledge_base", 88, signals)

        if signals["personal"]:
            return self._ready("user_context", 92, signals)

        if signals["resource_ambiguous"] and not (signals["active_module_scoped"] or signals["has_previous_focus"]):
            modules_pt = _candidate_module_options_pt(signals["resource_candidate_modules"])
            modules_en = _candidate_module_options_en(signals["resource_candidate_modules"])
            return self._clarification(
                intent="ambiguous_resource",
                reason=signals["resource_ambiguity_reason"] or "ambiguous_resource_without_context",
                question_pt="Este pedido pode referir-se a mais de um módulo. Qual contexto devo usar?",
                question_en="This request may refer to more than one module. Which context should I use?",
                confidence=42,
                signals=signals,
                options_pt=modules_pt,
                options_en=modules_en,
            )

        if _is_short_operational_without_scope(signals):
            return self._clarification(
                intent="underspecified_operational",
                reason="short_operational_without_scope",
                question_pt="A pendencia ou estado operacional pertence a que modulo ou processo?",
                question_en="Which module or process does this pending or operational state belong to?",
                confidence=34,
                signals=signals,
            )

        if signals["resource_count"] or signals["code_or_id"] or signals["json_payload"]:
            if signals["crud"]:
                return self._ready("crud_operation", 92, signals)
            if signals["data"] or signals["operational"] or signals["active_module_scoped"]:
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

        if signals["broad_request"] and not (
            signals["resource_count"] or signals["active_module_scoped"] or signals["has_previous_focus"]
        ):
            return self._clarification(
                intent="broad_request",
                reason="broad_request_without_scope",
                question_pt="Quer que eu investigue dados, prepare CRUD, gere relatório ou crie uma tarefa?",
                question_en="Should I investigate data, prepare CRUD, generate a report or create a task?",
                confidence=35,
                signals=signals,
            )

        if signals["short"] and not (signals["active_module_scoped"] or signals["has_previous_focus"]):
            return self._clarification(
                intent="underspecified",
                reason="short_message_without_scope",
                question_pt="A mensagem está curta. Qual é o módulo ou resultado esperado?",
                question_en="The message is short. Which module or expected outcome should I use?",
                confidence=30,
                signals=signals,
            )

        if signals["data"] or signals["active_module_scoped"] or signals["has_previous_focus"]:
            return self._ready("data_or_context_followup", 68, signals)

        return self._clarification(
            intent="unknown",
            reason="no_strong_signal",
            question_pt="Qual é o objectivo: consultar dados, fazer uma alteração, gerar relatório ou criar tarefa?",
            question_en="What is the objective: query data, make a change, generate a report or create a task?",
            confidence=40,
            signals=signals,
        )

    def _clarification(
        self,
        *,
        intent: str,
        reason: str,
        question_pt: str,
        question_en: str,
        confidence: int,
        signals: dict[str, Any],
        options_pt: tuple[str, ...] | None = None,
        options_en: tuple[str, ...] | None = None,
    ) -> IntentDecision:
        return IntentDecision(
            intent=intent,
            confidence_score=confidence,
            needs_clarification=True,
            reason=reason,
            question_pt=question_pt,
            question_en=question_en,
            options_pt=options_pt or DEFAULT_OPTIONS_PT,
            options_en=options_en or DEFAULT_OPTIONS_EN,
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


MODULE_OPTIONS_PT = {
    "pharmacy": "Farmácia",
    "warehouse": "Armazém/Logística",
    "bloodbank": "Banco de Sangue",
    "billing": "Faturamento",
    "payments": "Pagamentos",
    "dental": "Odontologia",
}

MODULE_OPTIONS_EN = {
    "pharmacy": "Pharmacy",
    "warehouse": "Warehouse/Logistics",
    "bloodbank": "Blood bank",
    "billing": "Billing",
    "payments": "Payments",
    "dental": "Dental",
}


def _candidate_module_options_pt(modules: list[str]) -> tuple[str, ...]:
    options = [MODULE_OPTIONS_PT.get(module, module.replace("_", " ").title()) for module in modules[:4]]
    options.append("Explorar todos os recursos encontrados")
    return tuple(dict.fromkeys(options))


def _candidate_module_options_en(modules: list[str]) -> tuple[str, ...]:
    options = [MODULE_OPTIONS_EN.get(module, module.replace("_", " ").title()) for module in modules[:4]]
    options.append("Explore all matched resources")
    return tuple(dict.fromkeys(options))


def _is_short_operational_without_scope(signals: dict[str, Any]) -> bool:
    if not (signals.get("operational") and signals.get("short")):
        return False
    if signals.get("active_module_scoped") or signals.get("has_previous_focus") or signals.get("monitoring"):
        return False
    if signals.get("data") or signals.get("crud") or signals.get("report") or signals.get("task"):
        return False
    if signals.get("code_or_id") or signals.get("json_payload"):
        return False
    matches = [item for item in signals.get("resource_matches") or [] if isinstance(item, dict)]
    if not matches:
        return True
    best_score = max(int(item.get("score") or 0) for item in matches)
    return best_score < 60
