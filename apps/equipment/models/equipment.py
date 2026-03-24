from __future__ import annotations

from django.db import models

from core.models.base import CoreModel


class Equipment(CoreModel):
    """
    Equipamento físico/operacional da empresa.
    """

    prefixo = "EQP"

    class EstadoAquisicao(models.TextChoices):
        NOVO = "NOVO", "Novo"
        USADO = "USADO", "Usado"

    class EstadoOperacional(models.TextChoices):
        FUNCIONANDO = "FUNCIONANDO", "A funcionar"
        AVARIADO = "AVARIADO", "Avariado"
        DESLIGADO = "DESLIGADO", "Desligado"

    numero_serie = models.CharField(
        "Número de série",
        max_length=120,
        db_index=True,
    )
    data_aquisicao = models.DateField("Data de aquisição", null=True, blank=True)

    estado_aquisicao = models.CharField(
        "Estado na aquisição",
        max_length=20,
        choices=EstadoAquisicao.choices,
        default=EstadoAquisicao.NOVO,
        db_index=True,
    )
    estado_operacional_inicial = models.CharField(
        "Estado operacional inicial",
        max_length=20,
        choices=EstadoOperacional.choices,
        default=EstadoOperacional.FUNCIONANDO,
        db_index=True,
    )

    tipo_avaria_inicial = models.CharField(
        "Tipo de avaria inicial",
        max_length=120,
        blank=True,
        default="",
    )

    fabricante = models.CharField(max_length=120, blank=True, default="")
    modelo = models.CharField(max_length=120, blank=True, default="")

    localizacao = models.CharField("Localização", max_length=255, blank=True, default="")
    responsavel = models.CharField("Responsável", max_length=120, blank=True, default="")

    ativo = models.BooleanField(default=True, db_index=True)

    class Meta:
        verbose_name = "Equipamento"
        verbose_name_plural = "Equipamentos"
        ordering = ["nome"]
        indexes = [
            models.Index(fields=["inquilino", "numero_serie"]),
            models.Index(fields=["inquilino", "ativo"]),
            models.Index(fields=["inquilino", "estado_operacional_inicial"]),
        ]
        constraints = [
            models.UniqueConstraint(
                fields=["inquilino", "numero_serie"],
                name="uq_equipamento_numero_serie_inquilino",
            )
        ]

    def __str__(self) -> str:
        return self.nome or f"Equipamento {self.pk}"

    def ultima_inspecao(self):
        if not self.pk:
            return None
        if hasattr(self, "_ultima_inspecao_cache"):
            return self._ultima_inspecao_cache
        from apps.inspections.models.daily_inspection import DailyInspection

        ultima = (
            DailyInspection.objects.filter(equipamento_id=self.pk)
            .order_by("-data", "-criado_em")
            .first()
        )
        self._ultima_inspecao_cache = ultima
        return ultima

    @property
    def estado_atual(self) -> str:
        """
        Estado operacional atual calculado a partir da última inspeção.
        """
        ultima = self.ultima_inspecao()
        if ultima and ultima.funcionamento:
            return ultima.funcionamento
        return self.estado_operacional_inicial

    @property
    def estado_atual_label(self) -> str:
        valor = self.estado_atual
        if not valor:
            return ""
        try:
            return self.EstadoOperacional(valor).label
        except Exception:
            return str(valor)
