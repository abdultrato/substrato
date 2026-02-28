# infraestrutura/dados/particionamento.py

from datetime import datetime


def obter_particao_temporal(data: datetime):
    """
    Retorna partição baseada em ano/mês.
    """
    return f"{data.year}_{str(data.month).zfill(2)}"


def nome_tabela_particionada(base: str, data: datetime):
    """
    Ex:
        historico_financeiro_2026_03
    """
    particao = obter_particao_temporal(data)
    return f"{base}_{particao}"

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
