from django.conf import settings
from django.db import connection

from infrastructure.context.tenant import get_tenant


class TenantDatabaseRouter:
    """
    Router para sharding por tenant.
    """

    SHARD_COUNT = 4  # ajuste conforme necessidade

    # =====================================================
    # READ
    # =====================================================

    def db_for_read(self, model, **hints):
        tenant = get_tenant()

        if not tenant:
            return "default"

        return self._resolve_shard(tenant.id)

    # =====================================================
    # WRITE
    # =====================================================

    def db_for_write(self, model, **hints):
        tenant = get_tenant()

        if not tenant:
            return "default"

        return self._resolve_shard(tenant.id)

    # =====================================================
    # MIGRATIONS
    # =====================================================

    def allow_migrate(self, db, app_label, model_name=None, **hints):
        """
        Permite migrations no banco default para apps globais.
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


def active_queries():
    return connection.queries


consultas_ativas = active_queries
