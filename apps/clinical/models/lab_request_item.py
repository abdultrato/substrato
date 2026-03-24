from django.core.exceptions import ValidationError
from django.db import models

from core.mixins.tenant_propagation import PropagarInquilinoMixin
from core.models.base import NoNameCoreModel

from .lab_exam import LabExam
from .medical_exam import MedicalExam
from .result import Result
from .result_item import ResultItem


class LabRequestItem(PropagarInquilinoMixin, NoNameCoreModel):
    fonte_inquilino = "paciente"

    requisicao = models.ForeignKey(
        "RequisicaoAnalise",
        on_delete=models.CASCADE,
        related_name="itens",
    )

    exame = models.ForeignKey(
        LabExam,
        on_delete=models.PROTECT,
        related_name="requisicoes",
        null=True,
        blank=True,
    )

    exame_medico = models.ForeignKey(
        MedicalExam,
        on_delete=models.PROTECT,
        related_name="requisicoes",
        null=True,
        blank=True,
    )

    class Meta:
        indexes = [
            models.Index(fields=["requisicao", "exame"]),
            models.Index(fields=["requisicao", "exame_medico"]),
        ]

    # -----------------------------------------------------

    def clean(self):
        # exige exatamente um tipo de exame
        if bool(self.exame) == bool(self.exame_medico):
            raise ValidationError("Informe um exame (laboratorial OU médico) por item.")

        # garante compatibilidade com o tipo/setor da requisição
        if self.requisicao_id:
            tipo = getattr(self.requisicao, "tipo", None)
            if tipo == self.requisicao.Tipo.LABORATORIO and self.exame_medico_id:
                raise ValidationError("Esta requisição é laboratorial e não aceita exames médicos.")
            if tipo == self.requisicao.Tipo.EXAME_MEDICO and self.exame_id:
                raise ValidationError("Esta requisição é de exames médicos e não aceita exames laboratoriais.")

            # defesa: evita cross-tenant por ID
            if self.exame_id and self.exame.inquilino_id != self.requisicao.inquilino_id:
                raise ValidationError("Exame não pertence ao mesmo inquilino da requisição.")
            if self.exame_medico_id and self.exame_medico.inquilino_id != self.requisicao.inquilino_id:
                raise ValidationError("Exame médico não pertence ao mesmo inquilino da requisição.")

        # evita duplicidade manualmente (já que removemos unique_together)
        qs = self.__class__.all_objects.filter(requisicao=self.requisicao)
        if self.exame and qs.filter(exame=self.exame).exclude(pk=self.pk).exists():
            raise ValidationError("Exame já adicionado à requisição.")
        if self.exame_medico and qs.filter(exame_medico=self.exame_medico).exclude(pk=self.pk).exists():
            raise ValidationError("Exame médico já adicionado à requisição.")

    def save(self, *args, **kwargs):

        if not self.inquilino_id and self.requisicao:
            self.inquilino_id = self.requisicao.inquilino_id

        self.full_clean()
        super().save(*args, **kwargs)

    # -----------------------------------------------------

    def _create_results(self):
        requisicao = self.requisicao
        inquilino = requisicao.inquilino

        # garante que exista um resultado para a requisição
        resultado, _ = Result.objects.get_or_create(
            requisicao=requisicao,
            defaults={"inquilino": inquilino},
        )

        exame_base = self.exame or self.exame_medico
        if not exame_base:
            return

        campos = getattr(exame_base, "campos", None)
        if campos is None:
            return
        campos_qs = campos.all()

        itens = []

        for campo in campos_qs:
            # evita duplicação
            # resultado para exame laboratorial usa ResultadoItem
            if self.exame:
                if ResultItem.objects.filter(
                    resultado=resultado,
                    exame_campo=campo,
                ).exists():
                    continue
                itens.append(
                    ResultItem(
                        resultado=resultado,
                        exame_campo=campo,
                        inquilino=inquilino,
                    )
                )
            # exames médicos não geram itens específicos (imagem/laudo)

        if itens:
            ResultItem.objects.bulk_create(itens)

    _criar_resultados = _create_results

    # -----------------------------------------------------

    def __str__(self):
        nome = getattr(self.exame, "nome", None) or getattr(self.exame_medico, "nome", "")
        return f"{self.requisicao.id_custom} - {nome}"
