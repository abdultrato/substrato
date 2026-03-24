from django.db import models


class AtivoQuerySet(models.QuerySet):
    """
    QuerySet corporativo com suporte a soft delete.
    """

    def ativos(self):
        return self.filter(ativo=True, deletado=False)

    def inativos(self):
        return self.filter(ativo=False, deletado=False)

    def deletados(self):
        return self.filter(deletado=True)

    def com_deletados(self):
        return self.all()
