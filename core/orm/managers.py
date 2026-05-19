"""Managers customizados (tenant-aware, ativos, etc.)."""

from django.db import models

from .querysets import AtivoQuerySet, TenantAwareQuerySet


class AtivoManager(models.Manager):
    """
    Manager corporativo padrão.
    Oculta soft-deleted por padrão.
    """

    def get_queryset(self):
        return AtivoQuerySet(self.model, using=self._db).filter(deleted=False)

    def ativos(self):
        return self.get_queryset().ativos()

    def inativos(self):
        return self.get_queryset().inativos()

    def deletados(self):
        return AtivoQuerySet(self.model, using=self._db).deletados()

    def com_deletados(self):
        return AtivoQuerySet(self.model, using=self._db)


class AllObjectsManager(models.Manager.from_queryset(AtivoQuerySet)):
    pass


# =========================================================
# TENANT-AWARE MANAGERS
# =========================================================


class TenantAwareManager(models.Manager.from_queryset(TenantAwareQuerySet)):
    """
    Manager que força filtro automático por tenant_id.
    
    Garante que queries sempre retornam apenas dados do tenant no contexto.
    Lança erro em tempo de execução se tenant não estiver definido.
    
    Use: Model.objects.for_tenant()
    Ou bypass com: Model.objects.todos_os_dados() (apenas admin)
    """

    def get_queryset(self):
        """Retornar QuerySet que filtra por soft delete"""
        return TenantAwareQuerySet(self.model, using=self._db).filter(deleted=False)

    def for_tenant(self, tenant_id=None):
        """Filtrar por tenant explícito"""
        return self.get_queryset().for_tenant(tenant_id)

    def todos_os_dados(self):
        """Bypass tenant filter (apenas admin)"""
        return TenantAwareQuerySet(self.model, using=self._db).todos_os_dados()

    def ativos(self):
        """Retornar apenas ativos do tenant"""
        return self.get_queryset().ativos()

    def inativos(self):
        """Retornar apenas inativos do tenant"""
        return self.get_queryset().inativos()

    def deletados(self):
        """Retornar apenas deletados (soft delete)"""
        return TenantAwareQuerySet(self.model, using=self._db).deletados()

    def com_deletados(self):
        """Retornar com deletados (bypass soft delete)"""
        return TenantAwareQuerySet(self.model, using=self._db).todos_os_dados()
