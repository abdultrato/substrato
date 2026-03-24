from django.conf import settings
from django.db import models

from core.models.base import NoNameCoreModel

from .lab_request import LabRequest

User = settings.AUTH_USER_MODEL


class Result(NoNameCoreModel):
    prefixo = "RESG"

    requisicao = models.OneToOneField(
        LabRequest,
        on_delete=models.CASCADE,
        related_name="resultado",
    )

    analista = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
    )

    finalizado = models.BooleanField(default=False)

    class Meta:
        ordering = ["-criado_em"]

    # -----------------------------------------------------

    def save(self, *args, **kwargs):
        criando = not self.pk

        # garante propagação do tenant
        if not self.inquilino and self.requisicao:
            self.inquilino = self.requisicao.inquilino

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
        inquilino = self.inquilino

        requisicao_itens = self.requisicao.itens.select_related("exame").prefetch_related("exame__campos")

        for item in requisicao_itens:
            # Requisições podem conter itens de exame médico (imagem) que não
            # geram `ResultadoItem`. Evita erro quando `item.exame` é None.
            if not item.exame_id:
                continue

            for campo in item.exame.campos.all():
                itens.append(
                    ResultItem(
                        resultado=self,
                        exame_campo=campo,
                        inquilino=inquilino,  # ESSENCIAL para multi-tenant
                    )
                )

        if itens:
            ResultItem.objects.bulk_create(itens)

    _criar_itens = _create_items

    # -----------------------------------------------------

    def __str__(self):
        return f"{self.id_custom} - {self.requisicao}"
