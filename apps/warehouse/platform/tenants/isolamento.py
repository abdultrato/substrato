from __future__ import annotations


def chave_tenant(tenant_id: str | int | None) -> str:
    return f"tenant:{tenant_id or 'global'}"
