from __future__ import annotations

from dataclasses import dataclass
import re

from django.utils import timezone

from apps.ai_assistant.services.alias_normalization import normalize_alias_text


GREETING_PHRASES = (
    "bom dia",
    "boa tarde",
    "boa noite",
    "ola",
    "olá",
    "oi",
    "boas",
    "hello",
    "hi",
    "hey",
)

SOCIAL_PHRASES = (
    "tudo bem",
    "tudo bom",
    "como esta",
    "como está",
    "como estas",
    "como estás",
    "como vai",
    "esta tudo bem",
    "está tudo bem",
)

ADDRESS_TOKENS = {
    "admin",
    "administrador",
    "administradora",
    "assistente",
    "ia",
    "ai",
    "substrato",
    "sistema",
    "colega",
    "amigo",
    "amiga",
    "sr",
    "sra",
    "senhor",
    "senhora",
}

FILLER_TOKENS = {
    "ai",
    "aqui",
    "por",
    "favor",
    "pf",
}


@dataclass(frozen=True, slots=True)
class GreetingBuild:
    answer: str
    metadata: dict


def is_standalone_greeting(message: str) -> bool:
    """Detecta saudacoes sociais sem objectivo operacional acoplado."""

    normalized = normalize_alias_text(message or "")
    if not normalized:
        return False
    if not any(_has_phrase(normalized, phrase) for phrase in (*GREETING_PHRASES, *SOCIAL_PHRASES)):
        return False

    residual = normalized
    for phrase in sorted((*GREETING_PHRASES, *SOCIAL_PHRASES), key=len, reverse=True):
        residual = re.sub(rf"(?<!\w){re.escape(normalize_alias_text(phrase))}(?!\w)", " ", residual)

    tokens = [token for token in residual.split() if token]
    return all(token in ADDRESS_TOKENS or token in FILLER_TOKENS for token in tokens)


def build_greeting_response(*, user, is_admin_like: bool, language: str = "pt") -> GreetingBuild:
    current_time = timezone.localtime(timezone.now())
    period_key, period_pt, period_en = _period_for_hour(current_time.hour)
    recipient = _recipient_for_user(user=user, is_admin_like=is_admin_like, language=language)

    if language == "en":
        answer = f"Hello {recipient}, {period_en}. How are you? How can I help now?"
        time_greeting = period_en
    else:
        answer = f"Olá {recipient}, {period_pt}, tudo bem aí? Em que posso ajudar agora?"
        time_greeting = period_pt

    return GreetingBuild(
        answer=answer,
        metadata={
            "detected": True,
            "period": period_key,
            "time_greeting": time_greeting,
            "current_time": current_time.isoformat(),
            "timezone": str(current_time.tzinfo),
            "recipient": recipient,
        },
    )


def _has_phrase(normalized: str, raw_phrase: str) -> bool:
    phrase = normalize_alias_text(raw_phrase)
    if not phrase:
        return False
    return bool(re.search(rf"(?<!\w){re.escape(phrase)}(?!\w)", normalized))


def _period_for_hour(hour: int) -> tuple[str, str, str]:
    if 5 <= hour < 12:
        return "morning", "bom dia", "good morning"
    if 12 <= hour < 18:
        return "afternoon", "boa tarde", "good afternoon"
    return "night", "boa noite", "good evening"


def _recipient_for_user(*, user, is_admin_like: bool, language: str) -> str:
    if is_admin_like:
        return "admin" if language != "en" else "admin"

    first_name = str(getattr(user, "first_name", "") or "").strip()
    if first_name:
        return first_name

    return "utilizador" if language != "en" else "user"
