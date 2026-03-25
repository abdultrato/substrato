from django.conf import settings
from django.db import models

from core.models.base import NoNameCoreModel

from .lab_request import LabRequest

User = settings.AUTH_USER_MODEL


class Result(NoNameCoreModel):
    prefix = "RESG"

    request = models.OneToOneField(

        LabRequest,

        db_column="requisicao_id",
        on_delete=models.CASCADE,
        related_name="result",
    )

    analyst = models.ForeignKey(

        User,

        db_column="analista_id",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
    )

    finalized = models.BooleanField(

        db_column="finalizado",

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
        if self.itens.exists():
            return

        itens = []
        tenant = self.tenant

        request_itens = self.request.itens.select_related("exam").prefetch_related("exam__campos")

        for item in request_itens:
            # Requisições podem conter itens de exam médico (imagem) que não
            # geram `ResultadoItem`. Evita error quando `item.exam` é None.
            if not item.exam_id:
                continue

            for campo in item.exam.campos.all():
                itens.append(
                    ResultItem(
                        result=self,
                        exam_field=campo,
                        tenant=tenant,  # ESSENCIAL para multi-tenant
                    )
                )

        if itens:
            ResultItem.objects.bulk_create(itens)

    _criar_itens = _create_items

    # -----------------------------------------------------

    def __str__(self):
        return f"{self.custom_id} - {self.request}"
