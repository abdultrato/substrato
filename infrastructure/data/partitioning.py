"""Funções de particionamento temporal e roteamento simples por tenant."""

from datetime import datetime


def get_temporal_partition(value: datetime):
    """
    Retorna a chave de partição ano/mês.
    """
    return f"{value.year}_{str(value.month).zfill(2)}"


def get_partitioned_table_name(base_name: str, value: datetime):
    """
    Ex:
        historico_financeiro_2026_03
    """
    partition = get_temporal_partition(value)
    return f"{base_name}_{partition}"


class TenantDatabaseRouter:
    def db_for_read(self, model, **hints):
        tenant_id = hints.get("tenant_id")
        if tenant_id:
            return f"tenant_{tenant_id % 4}"
        return None

    def db_for_write(self, model, **hints):
        tenant_id = hints.get("tenant_id")
        if tenant_id:
            return f"tenant_{tenant_id % 4}"
        return None


__all__ = [
    "TenantDatabaseRouter",
    "get_partitioned_table_name",
    "get_temporal_partition",
]
