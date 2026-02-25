from django.db import models
from aplicativos.clinico.modelos.paciente import Paciente

class Fatura(models.Model):
    paciente = models.ForeignKey(Paciente, on_delete=models.PROTECT)

    data_emissao = models.DateTimeField(auto_now_add=True)
    status = models.CharField(
        max_length=30,
        default="pendente"
    )

    total = models.DecimalField(max_digits=10, decimal_places=2, default=0)

    def __str__(self):
        return f"Fatura #{self.id}"
