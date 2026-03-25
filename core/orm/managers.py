from django.db import models

from .querysets import AtivoQuerySet


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
