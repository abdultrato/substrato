"""Equipamento físico/operacional do hospital."""

from __future__ import annotations

from django.db import models

from core.models.base import CoreModel


class Equipment(CoreModel):
    """Dados de identificação e estado de um equipamento."""

    prefix = "EQP"  # Prefixo para IDs amigáveis

    class AcquisitionStatus(models.TextChoices):
        NEW = "NOVO", "Novo"
        USED = "USADO", "Usado"

    class OperationalStatus(models.TextChoices):
        WORKING = "FUNCIONANDO", "A funcionar"
        BROKEN = "AVARIADO", "Avariado"
        OFFLINE = "DESLIGADO", "Desligado"

    serial_number = models.CharField(

        "Número de série",

        db_column="serial_number",
        max_length=120,
        db_index=True,
    )
    acquisition_date = models.DateField("Data de aquisição",
        db_column="acquisition_date",
         null=True, blank=True)

    acquisition_status = models.CharField(

        "Estado na aquisição",

        db_column="acquisition_status",
        max_length=20,
        choices=AcquisitionStatus.choices,
        default=AcquisitionStatus.NEW,
        db_index=True,
    )
    initial_operational_status = models.CharField(
        "Estado operacional inicial",
        db_column="initial_operational_status",
        max_length=20,
        choices=OperationalStatus.choices,
        default=OperationalStatus.WORKING,
        db_index=True,
    )

    initial_failure_type = models.CharField(

        "Tipo de avaria inicial",

        db_column="initial_failure_type",
        max_length=120,
        blank=True,
        default="",
    )

    manufacturer = models.CharField(
        db_column="manufacturer",
        verbose_name="Fabricante",
        max_length=120, blank=True, default="")
    model = models.CharField(
        db_column="model",
        verbose_name="Modelo",
        max_length=120, blank=True, default="")

    location = models.CharField("Localização",

        db_column="location",

         max_length=255, blank=True, default="")
    responsible = models.CharField("Responsável",
        db_column="responsible",
         max_length=120, blank=True, default="")

    active = models.BooleanField(
        db_column="active",
        verbose_name="Ativo",
        default=True, db_index=True)
    requires_maintenance = models.BooleanField(
        "Requer manutenção",
        db_column="requires_maintenance",
        default=False,
        db_index=True)
    maintenance_required_since = models.DateTimeField(
        "Manutenção requerida desde",
        db_column="maintenance_required_since",
        blank=True,
        null=True,
        db_index=True)

    class Meta:
        db_table = "equipamentos_equipamento"
        verbose_name = "Equipamento"
        verbose_name_plural = "Equipamentos"
        ordering = ["name"]
        indexes = [
            models.Index(fields=["tenant", "serial_number"]),
            models.Index(fields=["tenant", "active"]),
            models.Index(fields=["tenant", "initial_operational_status"]),
            models.Index(fields=["tenant", "requires_maintenance"]),
        ]
        constraints = [
            models.UniqueConstraint(
                fields=["tenant", "serial_number"],
                name="uq_equipment_serial_number_tenant",
            )
        ]

    def __str__(self) -> str:
        return self.name or f"Equipamento {self.pk}"

    def last_inspection(self):
        if not self.pk:
            return None
        if hasattr(self, "_last_inspection_cache"):
            return self._last_inspection_cache
        from apps.inspections.models.daily_inspection import DailyInspection

        ultima = (
            DailyInspection.objects.filter(equipment_id=self.pk)
            .order_by("-date", "-created_at")
            .first()
        )
        self._last_inspection_cache = ultima
        return ultima

    @property
    def current_status(self) -> str:
        """
        Estado operacional atual calculado a partir da última inspeção.
        """
        ultima = self.last_inspection()
        if ultima and ultima.operation_status:
            return ultima.operation_status
        return self.initial_operational_status

    @property
    def current_status_label(self) -> str:
        value = self.current_status
        if not value:
            return ""
        try:
            return self.OperationalStatus(value).label
        except Exception:
            return str(value)
