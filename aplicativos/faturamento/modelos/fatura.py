from django.db import models
from nucleo.modelos.base import CoreModel
from aplicativos.clinico.modelos.requisicao_analise import RequisicaoAnalise
from aplicativos.clinico.modelos.paciente import Paciente


class Fatura(CoreModel):

    prefixo = "FAT"

    class Estado(models.TextChoices):
        RASCUNHO = "RASC", "Rascunho"
        EMITIDA = "EMIT", "Emitida"
        PAGA = "PAGA", "Paga"
        CANCELADA = "CANC", "Cancelada"

    requisicao = models.OneToOneField(
        RequisicaoAnalise,
        on_delete=models.CASCADE,
        related_name="fatura",
    )

    paciente = models.ForeignKey(
        Paciente,
        on_delete=models.PROTECT,
        related_name="faturas",
    )

    subtotal = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    iva_valor = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    total = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    valor_seguro = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    valor_paciente = models.DecimalField(max_digits=12, decimal_places=2, default=0)

    estado = models.CharField(
        max_length=5,
        choices=Estado.choices,
        default=Estado.RASCUNHO,
    )

    def __str__(self):
        return f"{self.id_custom} - {self.paciente.nome}"
