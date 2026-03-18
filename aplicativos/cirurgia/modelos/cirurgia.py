from __future__ import annotations

from decimal import Decimal

from django.conf import settings
from django.core.exceptions import ValidationError
from django.db import models
from django.utils import timezone

from infrastrutura.orm.fields.dinheiro_field import DinheiroField

from nucleo.modelos.base import NoNameCoreModel

User = settings.AUTH_USER_MODEL


class Cirurgia(NoNameCoreModel):
    """
    Registro de cirurgia (MVP).

    Inclui agendamento e estado básico. Pode ser expandido com equipe,
    sala cirúrgica, checklists, anestesia, materiais, etc.
    """

    prefixo = "CIR"

    class Estado(models.TextChoices):
        AGENDADA = "AGENDADA", "Agendada"
        EM_ANDAMENTO = "EM_ANDAMENTO", "Em andamento"
        CONCLUIDA = "CONCLUIDA", "Concluída"
        CANCELADA = "CANCELADA", "Cancelada"

    paciente = models.ForeignKey(
        "clinico.Paciente",
        verbose_name="Paciente",
        on_delete=models.PROTECT,
        related_name="cirurgias",
        db_index=True,
    )
    cirurgiao = models.ForeignKey(
        User,
        verbose_name="Cirurgião",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="cirurgias_realizadas",
        db_index=True,
    )

    procedimentos = models.ManyToManyField(
        "cirurgia.ProcedimentoCirurgico",
        verbose_name="Procedimentos cirúrgicos",
        blank=True,
        related_name="cirurgias",
    )

    procedimento = models.CharField(
        verbose_name="Procedimento (texto livre)",
        max_length=160,
        blank=True,
        default="",
        db_index=True,
        help_text="Use quando o procedimento não estiver no catálogo.",
    )
    descricao = models.TextField(verbose_name="Descrição", blank=True, default="")

    preco_estimado = DinheiroField(verbose_name="Preço estimado", default=Decimal("0.00"))
    iva_percentual = models.DecimalField(verbose_name="IVA (%)", max_digits=5, decimal_places=2, default=Decimal("16.00"))
    aplica_iva_por_padrao = models.BooleanField(verbose_name="Aplicar IVA por padrão", default=True)

    agendada_para = models.DateTimeField(verbose_name="Agendada para", default=timezone.now, db_index=True)
    estado = models.CharField(
        verbose_name="Estado",
        max_length=20,
        choices=Estado.choices,
        default=Estado.AGENDADA,
        db_index=True,
    )

    concluida_em = models.DateTimeField(verbose_name="Concluída em", null=True, blank=True)
    cancelada_em = models.DateTimeField(verbose_name="Cancelada em", null=True, blank=True)

    class Meta:
        verbose_name = "Cirurgia"
        verbose_name_plural = "Cirurgias"
        ordering = ["-agendada_para", "-criado_em"]
        indexes = [
            models.Index(fields=["inquilino", "paciente", "agendada_para"]),
            models.Index(fields=["inquilino", "cirurgiao", "agendada_para"]),
            models.Index(fields=["inquilino", "estado", "agendada_para"]),
        ]

    def clean(self):
        super().clean()

        if not self.procedimentos.exists() and not (self.procedimento or "").strip():
            raise ValidationError(
                {"procedimentos": "Informe ao menos um procedimento cirúrgico (catálogo) ou preencha o texto livre."}
            )

        if self.paciente_id and self.inquilino_id and self.paciente.inquilino_id != self.inquilino_id:
            raise ValidationError({"paciente": "Paciente e cirurgia devem pertencer ao mesmo inquilino."})

        if self.cirurgiao_id and self.inquilino_id and self.cirurgiao.inquilino_id != self.inquilino_id:
            raise ValidationError({"cirurgiao": "Cirurgião e cirurgia devem pertencer ao mesmo inquilino."})

    def save(self, *args, **kwargs):
        if not self.inquilino_id and self.paciente_id:
            self.inquilino_id = self.paciente.inquilino_id
        self.full_clean()
        return super().save(*args, **kwargs)

    def __str__(self) -> str:
        return self.id_custom or f"Cirurgia {self.pk}"
