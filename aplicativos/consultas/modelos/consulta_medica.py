from __future__ import annotations

from decimal import ROUND_HALF_UP, Decimal
from zoneinfo import ZoneInfo

from django.conf import settings
from django.core.exceptions import ValidationError
from django.db import models
from django.utils import timezone

from infrastrutura.orm.fields.dinheiro_field import DinheiroField
from nucleo.modelos.base import NoNameCoreModel

User = settings.AUTH_USER_MODEL


class ConsultaMedica(NoNameCoreModel):
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

    paciente = models.ForeignKey(
        "clinico.Paciente",
        on_delete=models.PROTECT,
        related_name="consultas_medicas",
        db_index=True,
    )
    medico = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="consultas_realizadas",
        db_index=True,
    )

    especialidade = models.ForeignKey(
        "consultas.EspecialidadeConsulta",
        on_delete=models.PROTECT,
        null=True,
        blank=True,
        related_name="consultas",
        db_index=True,
    )

    tipo = models.CharField(max_length=120, db_index=True)
    descricao = models.TextField(blank=True, default="")

    agendada_para = models.DateTimeField(default=timezone.now, db_index=True)
    estado = models.CharField(
        max_length=20,
        choices=Estado.choices,
        default=Estado.MARCADA,
        db_index=True,
    )

    preco = DinheiroField(default=Decimal("0.00"))

    concluida_em = models.DateTimeField(null=True, blank=True)
    cancelada_em = models.DateTimeField(null=True, blank=True)

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
        try:
            cfg = getattr(self.inquilino, "configuracao", None)
            tz = (getattr(cfg, "fuso_horario", "") or "").strip()
            if not tz:
                return None
            return ZoneInfo(tz)
        except Exception:
            return None

    def _is_feriado(self) -> bool:
        if not self.inquilino_id or not self.agendada_para:
            return False
        from .feriado import Feriado

        tz = self._tenant_timezone()
        if timezone.is_aware(self.agendada_para):
            local_date = (
                timezone.localtime(self.agendada_para, tz).date()
                if tz
                else timezone.localtime(self.agendada_para).date()
            )
        else:
            local_date = self.agendada_para.date()

        return Feriado.objects.filter(inquilino_id=self.inquilino_id, data=local_date, ativo=True).exists()

    def _acrescimo_percentual_feriado(self) -> Decimal:
        try:
            cfg = getattr(self.inquilino, "configuracao", None)
            raw = getattr(cfg, "acrescimo_percentual_consulta_feriado", None)
        except Exception:
            raw = None

        if raw is None or raw == "":
            return Decimal("0.00")
        try:
            return Decimal(raw)
        except Exception:
            return Decimal("0.00")

    def _sincronizar_especialidade_e_preco(self, update_fields: set[str] | None = None) -> None:
        """
        Se houver especialidade, sincroniza:
        - tipo = especialidade.nome
        - preco = preco_base (+ acrescimo feriado)
        """
        if not self.especialidade_id:
            return

        especialidade = getattr(self, "especialidade", None)
        if not especialidade:
            return

        self.tipo = (especialidade.nome or "").strip()

        base = especialidade.preco_base if especialidade.preco_base is not None else Decimal("0.00")
        final = base

        if self._is_feriado():
            perc = self._acrescimo_percentual_feriado()
            try:
                multiplier = Decimal("1.00") + (perc / Decimal("100.00"))
                final = (base * multiplier).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)
            except Exception:
                final = base

        self.preco = final

        if update_fields is not None:
            update_fields.add("tipo")
            update_fields.add("preco")

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
