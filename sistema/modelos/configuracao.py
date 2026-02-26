from django.db import models


class ConfiguracaoSistema(models.Model):
    """
    Configuração global da plataforma.
    Deve existir apenas um registro.
    """

    maintenance_mode = models.BooleanField(default=False)

    atualizado_em = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "Configuração do Sistema"
        verbose_name_plural = "Configurações do Sistema"

    def __str__(self):
        return "Configuração Global"

    @classmethod
    def obter(cls):
        """
        Garante que sempre exista uma configuração.
        """
        obj, _ = cls.objects.get_or_create(pk=1)
        return obj
