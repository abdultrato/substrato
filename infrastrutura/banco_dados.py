from django.conf import settings
from infrastrutura.contexto.inquilino import get_inquilino


class TenantDatabaseRouter:
    """
    Router para sharding por tenant.

    ✔ Baseado no tenant atual
    ✔ Compatível com ContextVar
    ✔ Seguro para migrations
    ✔ Escalável horizontalmente
    """

    SHARD_COUNT = 4  # ajuste conforme necessidade

    # =====================================================
    # READ
    # =====================================================

    def db_for_read(self, model, **hints):
        inquilino = get_inquilino()

        if not inquilino:
            return "default"

        return self._resolve_shard(inquilino.id)

    # =====================================================
    # WRITE
    # =====================================================

    def db_for_write(self, model, **hints):
        inquilino = get_inquilino()

        if not inquilino:
            return "default"

        return self._resolve_shard(inquilino.id)

    # =====================================================
    # MIGRATIONS
    # =====================================================

    def allow_migrate(self, db, app_label, model_name=None, **hints):
        """
        Permite migrations apenas no banco default
        para apps globais.

        Ajuste conforme sua estratégia.
        """
        return db == "default"

    # =====================================================
    # SHARD RESOLUTION
    # =====================================================

    def _resolve_shard(self, tenant_id: int):
        shard_index = tenant_id % self.SHARD_COUNT
        shard_name = f"tenant_{shard_index}"

        if shard_name not in settings.DATABASES:
            return "default"

        return shard_name


# =========================================================
# DEBUG UTIL
# =========================================================

from django.db import connection


def consultas_ativas():
    return connection.queries
