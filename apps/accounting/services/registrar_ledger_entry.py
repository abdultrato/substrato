"""Facade para registrar lançamentos contábeis a partir do domínio da app."""

from __future__ import annotations

from types import SimpleNamespace  # Estrutura leve para acessar atributos

from application.accounting.register_ledger_entry import execute as register_ledger_entry


def _normalize_line(line):
    """Aceita dict ou objeto e devolve um objeto com atributos esperados."""
    if isinstance(line, dict):
        return SimpleNamespace(
            account=line["account"],
            value=line["value"],
            nature=line["nature"],
        )
    return line  # Já está no formato correto


def executar(*, tenant, description, accounting_date, linhas, idempotency_key=None):
    """Normaliza linhas e delega para o caso de uso de domínio."""
    normalized_lines = [_normalize_line(line) for line in linhas]
    return register_ledger_entry(
        tenant=tenant,
        description=description,
        accounting_date=accounting_date,
        linhas=normalized_lines,
        idempotency_key=idempotency_key,
    )


# Alias amigável para manter API existente
execute = executar

__all__ = ["executar", "execute"]
