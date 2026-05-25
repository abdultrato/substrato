from __future__ import annotations

from datetime import timedelta
import re
from typing import Any

from django.utils import timezone

from security.permissions.rbac import GROUPS as RBAC_GROUPS

TASK_GROUPS = (
    RBAC_GROUPS["ADMIN"],
    RBAC_GROUPS["ENFERMAGEM"],
    RBAC_GROUPS["LABORATORIO"],
    RBAC_GROUPS["FARMACIA"],
    RBAC_GROUPS["MEDICINA"],
    RBAC_GROUPS["MEDICINA_OCUPACIONAL"],
    RBAC_GROUPS["CONTABILIDADE"],
    RBAC_GROUPS["RECEPCAO"],
    RBAC_GROUPS["PROFESSOR"],
    RBAC_GROUPS["DIRETOR_ESCOLA"],
    RBAC_GROUPS["DIRETOR_ADJUNTO_PEDAGOGICO"],
)


def infer_operational_task_payload(
    *,
    message: str,
    active_module: str = "",
    language: str = "pt",
    request_code: str = "",
) -> dict[str, Any]:
    normalized = f"{message or ''} {active_module or ''}".lower()
    assigned_group = _assigned_group(normalized)
    module_key = _module_key(normalized, assigned_group=assigned_group, active_module=active_module)
    priority = _priority(normalized)
    due_at = timezone.now() + timedelta(hours=4 if priority in {"high", "critical"} else 24)
    source_reference = request_code or _request_code(message)

    title_pt = _title_pt(module_key=module_key, assigned_group=assigned_group, source_reference=source_reference)
    title_en = _title_en(module_key=module_key, assigned_group=assigned_group, source_reference=source_reference)
    description = _description(message=message, language=language)

    return {
        "module_key": module_key,
        "assigned_group": assigned_group,
        "priority": priority,
        "title": title_en if language == "en" else title_pt,
        "title_pt": title_pt,
        "title_en": title_en,
        "description": description,
        "due_at": due_at.isoformat(),
        "source_type": "ai_chat",
        "source_reference": source_reference,
        "allowed_groups": list(TASK_GROUPS),
    }


def _assigned_group(normalized: str) -> str:
    if any(term in normalized for term in ("enfermagem", "nursing", "enfermeiro", "colheita", "coleta", "sinais vitais")):
        return RBAC_GROUPS["ENFERMAGEM"]
    if any(term in normalized for term in ("laboratorio", "laboratório", "lab", "resultado", "amostra", "exame")):
        return RBAC_GROUPS["LABORATORIO"]
    if any(term in normalized for term in ("farmacia", "farmácia", "stock", "medicamento", "lote", "material")):
        return RBAC_GROUPS["FARMACIA"]
    if any(term in normalized for term in ("financeiro", "contabilidade", "pagamento", "fatura", "factura")):
        return RBAC_GROUPS["CONTABILIDADE"]
    if any(term in normalized for term in ("recepcao", "recepção", "recepcionista", "admissao", "admissão")):
        return RBAC_GROUPS["RECEPCAO"]
    if any(term in normalized for term in ("educacao", "educação", "escola", "estudante", "turma", "professor")):
        return RBAC_GROUPS["DIRETOR_ESCOLA"]
    if any(term in normalized for term in ("medico", "médico", "consulta", "clinico", "clínico")):
        return RBAC_GROUPS["MEDICINA"]
    return RBAC_GROUPS["ADMIN"]


def _module_key(normalized: str, *, assigned_group: str, active_module: str) -> str:
    if active_module and active_module != "ai":
        return active_module[:80]
    mapping = {
        RBAC_GROUPS["ENFERMAGEM"]: "nursing",
        RBAC_GROUPS["LABORATORIO"]: "clinical",
        RBAC_GROUPS["FARMACIA"]: "pharmacy",
        RBAC_GROUPS["CONTABILIDADE"]: "accounting",
        RBAC_GROUPS["RECEPCAO"]: "reception",
        RBAC_GROUPS["DIRETOR_ESCOLA"]: "education",
        RBAC_GROUPS["MEDICINA"]: "clinical",
        RBAC_GROUPS["ADMIN"]: "monitoring",
    }
    if "outbox" in normalized or "erro" in normalized or "error" in normalized:
        return "monitoring"
    return mapping.get(assigned_group, "monitoring")


def _priority(normalized: str) -> str:
    if any(term in normalized for term in ("crítico", "critico", "critical", "urgente", "emergência", "emergencia")):
        return "critical"
    if any(term in normalized for term in ("prioritário", "prioritario", "alta", "high", "imediato")):
        return "high"
    if any(term in normalized for term in ("baixa", "low", "quando possível", "quando possivel")):
        return "low"
    return "normal"


def _request_code(message: str) -> str:
    match = re.search(r"\bREQ-[A-Za-z0-9-]+", message or "", flags=re.IGNORECASE)
    return match.group(0).upper() if match else ""


def _title_pt(*, module_key: str, assigned_group: str, source_reference: str) -> str:
    suffix = f" {source_reference}" if source_reference else ""
    return f"Tarefa para {assigned_group} em {module_key}{suffix}"


def _title_en(*, module_key: str, assigned_group: str, source_reference: str) -> str:
    suffix = f" {source_reference}" if source_reference else ""
    return f"Task for {assigned_group} in {module_key}{suffix}"


def _description(*, message: str, language: str) -> str:
    raw = (message or "").strip()
    if language == "en":
        return f"AI-prepared operational task from user request: {raw[:1000]}"
    return f"Tarefa operacional preparada pela IA a partir do pedido do utilizador: {raw[:1000]}"
