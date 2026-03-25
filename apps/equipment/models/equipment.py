from __future__ import annotations

from django.db import models

from core.models.base import CoreModel


class Equipment(CoreModel):
    """
    Equipamento físico/operacional da empresa.
    """

    prefix = "EQP"

    class EstadoAquisicao(models.TextChoices):
        NOVO = "NOVO", "Novo"
        USADO = "USADO", "Usado"

    class EstadoOperacional(models.TextChoices):
        FUNCIONANDO = "FUNCIONANDO", "A funcionar"
        AVARIADO = "AVARIADO", "Avariado"
        DESLIGADO = "DESLIGADO", "Desligado"

    serial_number = models.CharField(

        "Número de série",

        db_column="numero_serie",
        max_length=120,
        db_index=True,
    )
    acquisition_date = models.DateField("Data de aquisição", 
        db_column="data_aquisicao",
         null=True, blank=True)

    acquisition_status = models.CharField(

        "Estado na aquisição",

        db_column="estado_aquisicao",
        max_length=20,
        choices=EstadoAquisicao.choices,
        default=EstadoAquisicao.NOVO,
        db_index=True,
    )
    initial_operational_status = models.CharField(
        "Estado operacional inicial",
        db_column="estado_operacional_inicial",
        max_length=20,
        choices=EstadoOperacional.choices,
        default=EstadoOperacional.FUNCIONANDO,
        db_index=True,
    )

    initial_failure_type = models.CharField(

        "Tipo de avaria inicial",

        db_column="tipo_avaria_inicial",
        max_length=120,
        blank=True,
        default="",
    )

    manufacturer = models.CharField(

        db_column="fabricante",

        max_length=120, blank=True, default="")
    model = models.CharField(
        db_column="modelo",
        max_length=120, blank=True, default="")

    location = models.CharField("Localização", 

        db_column="localizacao",

         max_length=255, blank=True, default="")
    responsible = models.CharField("Responsável", 
        db_column="responsavel",
         max_length=120, blank=True, default="")

    active = models.BooleanField(

        db_column="ativo",

        default=True, db_index=True)

    class Meta:
        db_table = "equipamentos_equipamento"
        verbose_name = "Equipamento"
        verbose_name_plural = "Equipamentos"
        ordering = ["name"]
        indexes = [
            models.Index(fields=["tenant", "serial_number"]),
            models.Index(fields=["tenant", "active"]),
            models.Index(fields=["tenant", "initial_operational_status"]),
        ]
        constraints = [
            models.UniqueConstraint(
                fields=["tenant", "serial_number"],
                name="uq_equipment_serial_number_tenant",
            )
        ]

    def __str__(self) -> str:
        return self.name or f"Equipamento {self.pk}"

    def ultima_inspecao(self):
        if not self.pk:
            return None
        if hasattr(self, "_ultima_inspecao_cache"):
            return self._ultima_inspecao_cache
        from apps.inspections.models.daily_inspection import DailyInspection

        ultima = (
            DailyInspection.objects.filter(equipment_id=self.pk)
            .order_by("-date", "-created_at")
            .first()
        )
        self._ultima_inspecao_cache = ultima
        return ultima

    @property
    def status_atual(self) -> str:
        """
        Estado operacional atual calculado a partir da última inspeção.
        """
        ultima = self.ultima_inspecao()
        if ultima and ultima.operation_status:
            return ultima.operation_status
        return self.initial_operational_status

    @property
    def status_atual_label(self) -> str:
        value = self.status_atual
        if not value:
            return ""
        try:
            return self.EstadoOperacional(value).label
        except Exception:
            return str(value)
