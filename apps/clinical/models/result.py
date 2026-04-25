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
        on_delete=models.CASCADE,
        related_name="result",
    )

    analyst = models.ForeignKey(

        User,

        db_column="analyst_id",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
    )

    finalized = models.BooleanField(

        db_column="finalized",

        default=False)

    class Meta:
        db_table = "clinico_resultado"
        ordering = ["-created_at"]

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
        from .result_item import ResultItem

        # evita recriar itens se já existirem
        if self.items.exists():
            return

        items_to_create = []
        tenant = self.tenant

        request_items = self.request.items.select_related("exam").prefetch_related("exam__campos")

        for item in request_items:
            # Requisições podem conter itens de exam médico (imagem) que não
            # geram `ResultadoItem`. Evita error quando `item.exam` é None.
            if not item.exam_id:
                continue

            for campo in item.exam.campos.all():
                items_to_create.append(
                    ResultItem(
                        result=self,
                        exam_field=campo,
                        tenant=tenant,  # ESSENCIAL para multi-tenant
                    )
                )

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
