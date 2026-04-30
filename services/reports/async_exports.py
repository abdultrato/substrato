"""Gestão de jobs assíncronos para exportação de documentos (PDF/CSV/Word)."""

from __future__ import annotations

import base64
from contextlib import suppress
from uuid import uuid4

from django.conf import settings
from django.core.cache import cache
from django.utils import timezone

DEFAULT_EXPORT_JOB_TTL_SECONDS = 60 * 60
_LOCAL_FALLBACK_STORE: dict[str, object] = {}


def _job_ttl_seconds() -> int:
    try:
        value = int(getattr(settings, "EXPORT_JOB_TTL_SECONDS", DEFAULT_EXPORT_JOB_TTL_SECONDS))
        return max(60, value)
    except Exception:
        return DEFAULT_EXPORT_JOB_TTL_SECONDS


def export_job_state_key(job_id: str) -> str:
    return f"export_job:state:{job_id}"


def export_job_payload_key(job_id: str) -> str:
    return f"export_job:payload:{job_id}"


def export_job_result_key(job_id: str) -> str:
    return f"export_job:result:{job_id}"


def _now_iso() -> str:
    return timezone.localtime().isoformat()


def _cache_set(key: str, value, ttl: int) -> None:
    with suppress(Exception):
        cache.set(key, value, timeout=ttl)
    _LOCAL_FALLBACK_STORE[key] = value


def _cache_get(key: str):
    try:
        value = cache.get(key)
    except Exception:
        value = None
    if value is not None:
        return value
    return _LOCAL_FALLBACK_STORE.get(key)


def create_export_job(
    *,
    export_key: str,
    payload: dict,
    tenant_id=None,
    user_id=None,
    content_disposition: str = "inline",
) -> dict:
    job_id = str(uuid4())
    now_iso = _now_iso()
    state = {
        "id": job_id,
        "export_key": export_key,
        "status": "queued",
        "tenant_id": str(tenant_id or ""),
        "user_id": int(user_id) if user_id else None,
        "content_disposition": content_disposition or "inline",
        "created_at": now_iso,
        "updated_at": now_iso,
        "started_at": None,
        "finished_at": None,
        "filename": None,
        "content_type": None,
        "error": None,
    }
    ttl = _job_ttl_seconds()
    _cache_set(export_job_state_key(job_id), state, ttl=ttl)
    _cache_set(export_job_payload_key(job_id), payload or {}, ttl=ttl)
    return state


def get_export_job_state(job_id: str) -> dict | None:
    state = _cache_get(export_job_state_key(job_id))
    if not isinstance(state, dict):
        return None
    return state


def get_export_job_payload(job_id: str) -> dict:
    payload = _cache_get(export_job_payload_key(job_id))
    if not isinstance(payload, dict):
        return {}
    return payload


def _persist_state(state: dict) -> dict:
    state["updated_at"] = _now_iso()
    _cache_set(export_job_state_key(state["id"]), state, ttl=_job_ttl_seconds())
    return state


def mark_export_job_processing(job_id: str) -> dict | None:
    state = get_export_job_state(job_id)
    if not state:
        return None
    if state.get("started_at") is None:
        state["started_at"] = _now_iso()
    state["status"] = "processing"
    state["error"] = None
    return _persist_state(state)


def mark_export_job_ready(
    job_id: str,
    *,
    file_bytes: bytes,
    filename: str,
    content_type: str = "application/pdf",
) -> dict | None:
    state = get_export_job_state(job_id)
    if not state:
        return None

    encoded = base64.b64encode(file_bytes or b"").decode("ascii")
    _cache_set(export_job_result_key(job_id), encoded, ttl=_job_ttl_seconds())

    state["status"] = "ready"
    state["finished_at"] = _now_iso()
    state["filename"] = filename or f"export-{job_id}.bin"
    state["content_type"] = content_type or "application/octet-stream"
    state["error"] = None
    return _persist_state(state)


def mark_export_job_failed(job_id: str, error_message: str) -> dict | None:
    state = get_export_job_state(job_id)
    if not state:
        return None
    state["status"] = "failed"
    state["finished_at"] = _now_iso()
    state["error"] = (error_message or "Falha ao processar exportação.")[:500]
    return _persist_state(state)


def get_export_job_result(job_id: str) -> tuple[bytes, str, str] | None:
    state = get_export_job_state(job_id)
    if not state or state.get("status") != "ready":
        return None

    encoded = _cache_get(export_job_result_key(job_id))
    if not encoded:
        return None
    try:
        file_bytes = base64.b64decode(str(encoded))
    except Exception:
        return None

    filename = state.get("filename") or f"export-{job_id}.bin"
    content_type = state.get("content_type") or "application/octet-stream"
    return file_bytes, filename, content_type


def can_access_export_job(state: dict, *, tenant_id, user_id, is_superuser: bool) -> bool:
    if is_superuser:
        return True

    state_tenant = str(state.get("tenant_id") or "")
    if state_tenant and str(tenant_id or "") != state_tenant:
        return False

    state_user_id = state.get("user_id")
    return not (state_user_id and int(user_id or 0) != int(state_user_id))
