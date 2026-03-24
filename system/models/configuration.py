from django.db import models


class SystemConfiguration(models.Model):
    """
    Configuração global da platform.
    Mantém um único registro.
    """

    maintenance_mode = models.BooleanField(default=False)
    atualizado_em = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "Configuração do Sistema"
        verbose_name_plural = "Configurações do Sistema"

    def __str__(self):
        return "Configuração Global"

    @classmethod
    def get(cls):
        """
        Obtém a configuração global, criando se necessário.
        """

        obj, _ = cls.objects.get_or_create(pk=1)
        return obj


ConfiguracaoSistema = SystemConfiguration
SystemConfiguration.obter = classmethod(SystemConfiguration.get.__func__)
