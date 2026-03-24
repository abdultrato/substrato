from __future__ import annotations

from decimal import ROUND_HALF_UP, Decimal

from django.core.exceptions import ValidationError
from django.db import models
from django.utils import timezone

from apps.consultations.utils.precificacao import (
    calcular_multiplicador_preco,
    calcular_tipo_horario,
    is_feriado,
    obter_datetime_local,
    obter_timezone_inquilino,
)
from infrastructure.orm.fields.dinheiro_field import DinheiroField
from core.models.base import NoNameCoreModel


class MedicalConsultation(NoNameCoreModel):
    """
    App comercial: consultas médicas (marcação + registro).

    - Relaciona paciente e médico
    - Guarda preço da consulta
    - Permite vincular faturamento (via Fatura.origem=CONSULTA)
    """

    prefixo = "CONS"

    class Estado(models.TextChoices):
        MARCADA = "MARCADA", "Marcada"
        CONCLUIDA = "CONCLUIDA", "Concluída"
        CANCELADA = "CANCELADA", "Cancelada"

    class Horario(models.TextChoices):
        NORMAL = "NORMAL", "Normal (08h-18h)"
        FORA_EXPEDIENTE = "FORA_EXPEDIENTE", "Fora de expediente (19h-07h)"
        FIM_SEMANA = "FIM_SEMANA", "Fim de semana"
        FERIADO_MANUAL = "FERIADO_MANUAL", "Feriado (marcado)"

    paciente = models.ForeignKey(
        "clinico.Patient",
        verbose_name="Paciente",
        on_delete=models.PROTECT,
        related_name="consultas_medicas",
        db_index=True,
    )
    medico = models.ForeignKey(
        "recursos_humanos.Employee",
        verbose_name="Médico",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="consultas_realizadas",
        db_index=True,
    )

    especialidade = models.ForeignKey(
        "consultas.ConsultationSpecialty",
        verbose_name="Especialidade",
        on_delete=models.PROTECT,
        null=True,
        blank=True,
        related_name="consultas",
        db_index=True,
    )

    tipo = models.CharField("Tipo de consulta", max_length=120, db_index=True)
    descricao = models.TextField("Descrição", blank=True, default="")

    agendada_para = models.DateTimeField("Agendada para", default=timezone.now, db_index=True)
    estado = models.CharField(
        "Estado",
        max_length=20,
        choices=Estado.choices,
        default=Estado.MARCADA,
        db_index=True,
    )

    preco = DinheiroField("Preço", default=Decimal("0.00"))
    multiplicador_preco = models.DecimalField(
        "Multiplicador de preço",
        max_digits=5,
        decimal_places=2,
        default=Decimal("1.00"),
        help_text="Fator aplicado sobre o preço base conforme horário/feriado.",
    )
    tipo_horario = models.CharField(
        "Tipo de horário",
        max_length=32,
        choices=Horario.choices,
        default=Horario.NORMAL,
        db_index=True,
    )
    feriado_manual = models.BooleanField(
        "Feriado (manual)",
        default=False,
        help_text="Marque se a data for feriado mesmo não sendo fim de semana.",
    )

    concluida_em = models.DateTimeField("Concluída em", null=True, blank=True)
    cancelada_em = models.DateTimeField("Cancelada em", null=True, blank=True)

    class Meta:
        verbose_name = "Consulta Médica"
        verbose_name_plural = "Consultas Médicas"
        ordering = ["-agendada_para", "-criado_em"]
        indexes = [
            models.Index(fields=["inquilino", "paciente", "agendada_para"]),
            models.Index(fields=["inquilino", "medico", "agendada_para"]),
            models.Index(fields=["inquilino", "estado", "agendada_para"]),
            models.Index(fields=["inquilino", "tipo"]),
        ]

    def clean(self):
        super().clean()

        if not (self.tipo or "").strip():
            raise ValidationError({"tipo": "Informe o tipo/nome do serviço da consulta."})

        if self.preco is None or self.preco < Decimal("0.00"):
            raise ValidationError({"preco": "Preço inválido."})

        if self.multiplicador_preco is None or self.multiplicador_preco <= Decimal("0.00"):
            raise ValidationError({"multiplicador_preco": "Multiplicador inválido."})

        if self.paciente_id and self.inquilino_id and self.paciente.inquilino_id != self.inquilino_id:
            raise ValidationError({"paciente": "Paciente e consulta devem pertencer ao mesmo inquilino."})

        if self.medico_id and self.inquilino_id and self.medico.inquilino_id != self.inquilino_id:
            raise ValidationError({"medico": "Médico e consulta devem pertencer ao mesmo inquilino."})

        if self.especialidade_id and self.inquilino_id and self.especialidade.inquilino_id != self.inquilino_id:
            raise ValidationError({"especialidade": "Especialidade e consulta devem pertencer ao mesmo inquilino."})

    def _tenant_timezone(self):
        """
        Retorna ZoneInfo do tenant (ou None para timezone default).
        """
        return obter_timezone_inquilino(self.inquilino)

    def _is_feriado(self) -> bool:
        return is_feriado(self.inquilino, self.agendada_para)

    def _tenant_local_datetime(self):
        return obter_datetime_local(self.inquilino, self.agendada_para)

    def _tipo_horario_atual(self) -> str:
        return calcular_tipo_horario(self.inquilino, self.agendada_para, feriado_manual=self.feriado_manual)

    def _multiplicador_preco_atual(self) -> Decimal:
        return calcular_multiplicador_preco(self.inquilino, self.agendada_para, feriado_manual=self.feriado_manual)

    def _sincronizar_especialidade_e_preco(self, update_fields: set[str] | None = None) -> None:
        """
        Se houver especialidade, sincroniza:
        - tipo = especialidade.nome
        - tipo_horario + multiplicador conforme data/hora/feriado manual
        - preco = preco_base * multiplicador
        """
        if not self.especialidade_id:
            return

        especialidade = getattr(self, "especialidade", None)
        if not especialidade:
            return

        self.tipo = (especialidade.nome or "").strip()

        base = especialidade.preco_base if especialidade.preco_base is not None else Decimal("0.00")

        self.tipo_horario = self._tipo_horario_atual()
        self.multiplicador_preco = self._multiplicador_preco_atual()

        try:
            final = (base * self.multiplicador_preco).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)
        except Exception:
            final = base

        self.preco = final

        if update_fields is not None:
            update_fields.update({"tipo", "preco", "tipo_horario", "multiplicador_preco"})

    def save(self, *args, **kwargs):
        update_fields = kwargs.get("update_fields")
        update_set: set[str] | None = set(update_fields) if update_fields else None

        if not self.inquilino_id and self.paciente_id:
            self.inquilino_id = self.paciente.inquilino_id
            if update_set is not None:
                update_set.add("inquilino")

        self._sincronizar_especialidade_e_preco(update_set)

        if update_set is not None:
            kwargs["update_fields"] = list(update_set)

        self.full_clean()
        return super().save(*args, **kwargs)

    def __str__(self) -> str:
        return f"{self.id_custom} - {self.paciente.nome} ({self.tipo})"
