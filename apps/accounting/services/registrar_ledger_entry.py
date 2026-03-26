from __future__ import annotations

from types import SimpleNamespace

from application.accounting.register_ledger_entry import execute as register_ledger_entry


def _normalize_line(line):
    if isinstance(line, dict):
        return SimpleNamespace(
            account=line["account"],
            value=line["value"],
            nature=line["nature"],
        )
    return line


def executar(*, tenant, description, accounting_date, linhas, idempotency_key=None):
    normalized_lines = [_normalize_line(line) for line in linhas]
    return register_ledger_entry(
        tenant=tenant,
        description=description,
        accounting_date=accounting_date,
        linhas=normalized_lines,
        idempotency_key=idempotency_key,
    )


execute = executar

__all__ = ["executar", "execute"]
