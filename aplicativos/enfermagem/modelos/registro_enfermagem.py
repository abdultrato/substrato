from django.db import models

from nucleo.modelos.base import CoreModel


class RegistroEnfermagem(CoreModel):
    prefixo = "ENF"

    class Prioridade(models.TextChoices):
        BAIXA = "BAIXA", "Baixa"
        NORMAL = "NORMAL", "Normal"
        ALTA = "ALTA", "Alta"
        CRITICA = "CRITICA", "Crítica"

    paciente = models.ForeignKey(
        "clinico.Paciente",
        on_delete=models.PROTECT,
        related_name="registros_enfermagem",
        db_index=True,
    )
    prioridade = models.CharField(
        max_length=10,
        choices=Prioridade.choices,
        default=Prioridade.NORMAL,
        db_index=True,
    )
    observacao = models.TextField(blank=True, default="")
    data_registro = models.DateTimeField(auto_now_add=True, db_index=True)

    class Meta:
        ordering = ["-data_registro", "-criado_em"]
        indexes = [
            models.Index(fields=["inquilino", "paciente"]),
            models.Index(fields=["prioridade"]),
            models.Index(fields=["data_registro"]),
        ]

    def save(self, *args, **kwargs):
        if not self.inquilino_id and self.paciente_id:
            self.inquilino_id = self.paciente.inquilino_id
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.id_custom} - {self.paciente.nome}"
