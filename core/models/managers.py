# LOCAL: nucleo/models/managers.py

from django.db import models


class QuerySetAtivo(models.QuerySet):
    def ativos(self):
        return self.filter(ativo=True, deletado=False)

    def inativos(self):
        return self.filter(ativo=False, deletado=False)

    def deletados(self):
        return self.filter(deletado=True)


class ManagerAtivo(models.Manager.from_queryset(QuerySetAtivo)):
    def get_queryset(self):
        return super().get_queryset().filter(deletado=False)
