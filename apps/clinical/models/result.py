"""Resultado consolidado de uma requisição (agrupa itens/arquivos)."""

from django.conf import settings
from django.db import models

from core.models.base import NoNameCoreModel

from .lab_request import LabRequest

User = settings.AUTH_USER_MODEL


class Result(NoNameCoreModel):
    """Cabeçalho de resultado (um por requisição)."""

    prefix = "RESG"  # Prefixo para IDs amigáveis

    request = models.OneToOneField(

        LabRequest,

        db_column="request_id",
        on_delete=models.PROTECT,
        related_name="result",
        verbose_name="requisição",
    )

    analyst = models.ForeignKey(

        User,

        db_column="analyst_id",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="results_analyst",
        verbose_name="analista",
    )

    finalized = models.BooleanField(

        db_column="finalized",

        default=False,
        verbose_name="finalizado",
        )

    class Meta:
        db_table = "clinico_resultado"
        ordering = ["-created_at"]
        verbose_name = "resultado"
        verbose_name_plural = "resultados"

    # -----------------------------------------------------

    def save(self, *args, **kwargs):
        criando = not self.pk

        # garante propagação do tenant
        if not self.tenant and self.request:
            self.tenant = self.request.tenant

        super().save(*args, **kwargs)

        if criando:
            self._create_items()

    # -----------------------------------------------------

    def _create_items(self):
        from django.db.models import Max

        from .result_item import ResultItem

        items_to_create = []
        tenant = self.tenant

        # Determina a próxima posição livre (permite adicionar campos a um
        # resultado que já tem itens, p. ex. quando um exame sem campos
        # entretanto recebe a sua configuração de campos).
        next_position = (
            ResultItem.all_objects.filter(result=self)
            .aggregate(max_pos=Max("position"))
            .get("max_pos") or 0
        ) + 1

        request_items = (
            self.request.items.select_related("exam")
            .prefetch_related("exam__fields")
            .order_by("position", "id")
        )

        from apps.clinical.lab_specialized import specialized_sector_for_method

        for item in request_items:
            # Itens de exame médico (imagiologia) não geram ResultItem.
            if not item.exam_id:
                continue

            # Exames de método especializado (cultura, baciloscopia, GeneXpert,
            # PCR) têm a sua própria área de preenchimento — não geram campos
            # genéricos de resultado.
            if specialized_sector_for_method(getattr(item.exam, "method", None)):
                continue

            fields_mgr = getattr(item.exam, "fields", None) or getattr(item.exam, "campos", None)
            if fields_mgr is None:
                continue
            for campo in fields_mgr.all().order_by("sequence", "id"):
                # Não duplica: salta campo que já tem ResultItem
                if ResultItem.objects.filter(result=self, exam_field=campo).exists():
                    continue
                items_to_create.append(
                    ResultItem(
                        result=self,
                        exam_field=campo,
                        tenant=tenant,
                        position=next_position,
                    )
                )
                next_position += 1

        if items_to_create:
            ResultItem.objects.bulk_create(items_to_create)

    _criar_itens = _create_items

    @property
    def itens(self):
        # Compatibilidade legada (português) para relation manager.
        return self.items

    # -----------------------------------------------------

    def __str__(self):
        return f"{self.custom_id} - {self.request}"
