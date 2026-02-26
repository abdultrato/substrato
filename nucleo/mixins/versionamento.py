from django.db import models


class VersionamentoMixin(models.Model):
    """
    Controle de concorrência otimista.
    """

    versao = models.PositiveIntegerField(default=1)

    class Meta:
        abstract = True

    def incrementar_versao(self):
        self.versao += 1
