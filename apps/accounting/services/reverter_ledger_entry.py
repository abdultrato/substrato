"""Facade simples para reverter lançamentos contábeis."""

from application.accounting.reverse_ledger_entry import execute as executar

# Alias amigável mantendo assinatura consistente
execute = executar

__all__ = ["executar", "execute"]
