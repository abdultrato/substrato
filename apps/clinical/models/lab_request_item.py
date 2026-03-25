from django.core.exceptions import ValidationError
from django.db import models

from core.mixins.tenant_propagation import PropagarInquilinoMixin
from core.models.base import NoNameCoreModel

from .lab_exam import LabExam
from .medical_exam import MedicalExam
from .result import Result
from .result_item import ResultItem


class LabRequestItem(PropagarInquilinoMixin, NoNameCoreModel):
    fonte_tenant = "patient"

    request = models.ForeignKey(

        "LabRequest",

        db_column="requisicao_id",
        on_delete=models.CASCADE,
        related_name="itens",
    )

    exam = models.ForeignKey(

        LabExam,

        db_column="exame_id",
        on_delete=models.PROTECT,
        related_name="requisicoes",
        null=True,
        blank=True,
    )

    medical_exam = models.ForeignKey(

        MedicalExam,

        db_column="exame_medico_id",
        on_delete=models.PROTECT,
        related_name="requisicoes",
        null=True,
        blank=True,
    )

    class Meta:
        db_table = "clinico_requisicaoitem"
        indexes = [
            models.Index(fields=["request", "exam"]),
            models.Index(fields=["request", "medical_exam"]),
        ]

    # -----------------------------------------------------

    def clean(self):
        # exige exatamente um type de exam
        if bool(self.exam) == bool(self.medical_exam):
            raise ValidationError("Informe um exam (laboratorial OU médico) por item.")

        # garante compatibilidade com o type/sector da requisição
        if self.request_id:
            type = getattr(self.request, "type", None)
            if type == self.request.Tipo.LABORATORIO and self.medical_exam_id:
                raise ValidationError("Esta requisição é laboratorial e não aceita exams médicos.")
            if type == self.request.Tipo.EXAME_MEDICO and self.exam_id:
                raise ValidationError("Esta requisição é de exams médicos e não aceita exams laboratoriais.")

            # defesa: evita cross-tenant por ID
            if self.exam_id and self.exam.tenant_id != self.request.tenant_id:
                raise ValidationError("Exame não pertence ao mesmo tenant da requisição.")
            if self.medical_exam_id and self.medical_exam.tenant_id != self.request.tenant_id:
                raise ValidationError("Exame médico não pertence ao mesmo tenant da requisição.")

        # evita duplicidade manualmente (já que removemos unique_together)
        qs = self.__class__.all_objects.filter(request=self.request)
        if self.exam and qs.filter(exam=self.exam).exclude(pk=self.pk).exists():
            raise ValidationError("Exame já adicionado à requisição.")
        if self.medical_exam and qs.filter(medical_exam=self.medical_exam).exclude(pk=self.pk).exists():
            raise ValidationError("Exame médico já adicionado à requisição.")

    def save(self, *args, **kwargs):

        if not self.tenant_id and self.request:
            self.tenant_id = self.request.tenant_id

        self.full_clean()
        super().save(*args, **kwargs)

    # -----------------------------------------------------

    def _create_results(self):
        request = self.request
        tenant = request.tenant

        # garante que exista um result para a requisição
        result, _ = Result.objects.get_or_create(
            request=request,
            defaults={"tenant": tenant},
        )

        exam_base = self.exam or self.medical_exam
        if not exam_base:
            return

        campos = getattr(exam_base, "campos", None)
        if campos is None:
            return
        campos_qs = campos.all()

        itens = []

        for campo in campos_qs:
            # evita duplicação
            # result para exam laboratorial usa ResultadoItem
            if self.exam:
                if ResultItem.objects.filter(
                    result=result,
                    exam_field=campo,
                ).exists():
                    continue
                itens.append(
                    ResultItem(
                        result=result,
                        exam_field=campo,
                        tenant=tenant,
                    )
                )
            # exams médicos não geram itens específicos (imagem/laudo)

        if itens:
            ResultItem.objects.bulk_create(itens)

    _criar_resultados = _create_results

    # -----------------------------------------------------

    def __str__(self):
        name = getattr(self.exam, "name", None) or getattr(self.medical_exam, "name", "")
        return f"{self.request.custom_id} - {name}"
