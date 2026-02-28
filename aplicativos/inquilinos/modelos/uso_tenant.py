from django.db import models
from nucleo.modelos.base import InqCoreModel


class UsoTenant(InqCoreModel):
    """
    Controle de uso mensal do tenant.

    ✔ Isolado por tenant
    ✔ Seguro contra ausência de plano
    ✔ Preparado para billing
    """

    prefixo = "UT"

    inquilino = models.OneToOneField(
        "inquilinos.Inquilino",
        on_delete=models.CASCADE,
        related_name="uso",
    )

    usuarios_ativos = models.PositiveIntegerField(default=0)
    requisicoes_mes_atual = models.PositiveIntegerField(default=0)

    class Meta:
        verbose_name = "Uso do Tenant"
        verbose_name_plural = "Usos dos Tenants"

    def obter_limite_requisicoes(self):
        """
        Obtém limite do plano ativo via AssinaturaTenant.
        Retorna None se não houver assinatura ativa.
        """

        assinatura = getattr(self.inquilino, "assinatura_ativa", None)

        if not assinatura:
            return None

        plano = getattr(assinatura, "plano", None)

        if not plano:
            return None

        return plano.limite_requisicoes_mes

    def percentual_uso_requisicoes(self):
        """
        Calcula percentual de uso de requisições.
        Seguro contra ausência de plano e divisão por zero.
        """

        limite = self.obter_limite_requisicoes()

        if not limite or limite == 0:
            return 0

        return (self.requisicoes_mes_atual / limite) * 100

    def __str__(self):
        return f"Uso - {self.inquilino.nome}"
