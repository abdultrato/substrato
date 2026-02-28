from django.db import models
from nucleo.modelos.base import CoreModel


class Seguradora(CoreModel):
    """
    Representa uma seguradora / convênio.
    """

    prefixo = "SEG"

    codigo_externo = models.CharField(max_length=50, blank=True, null=True)
    email = models.EmailField(blank=True, null=True)
    telefone = models.CharField(max_length=20, blank=True, null=True)

    ativa = models.BooleanField(default=True)

    class Meta:
        verbose_name = "Seguradora"
        verbose_name_plural = "Seguradoras"

    def __str__(self):
        return self.nome
