from django.db import models


class QuerySetAtivo(models.QuerySet):
    def ativos(self):
        return self.filter(ativo=True, deletado=False)

    def inativos(self):
        return self.filter(ativo=False, deletado=False)

    def deletados(self):
        return self.filter(deletado=True)


class ManagerAtivo(models.Manager):
    def get_queryset(self):
        return QuerySetAtivo(self.model, using=self._db).filter(deletado=False)

    def ativos(self):
        return self.get_queryset().ativos()

    def inativos(self):
        return self.get_queryset().inativos()

    def deletados(self):
        return QuerySetAtivo(self.model, using=self._db).deletados()
