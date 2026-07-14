"""Itens vinculados a uma requisição (exame lab ou exame médico)."""

from django.core.exceptions import ValidationError
from django.db import models

from core.mixins.model.position import ScopedPositionMixin
from core.mixins.tenant_propagation import TenantPropagationMixin
from core.models.base import NoNameCoreModel

from .medical_exam import MedicalExam
from .result import Result
from .result_item import ResultItem


class LabRequestItem(TenantPropagationMixin, ScopedPositionMixin, NoNameCoreModel):
    """Linha de exame da requisição (lab ou médico)."""

    tenant_source = "patient"  # Propaga tenant a partir do paciente

    request = models.ForeignKey(

        "LabRequest",

        db_column="request_id",
        on_delete=models.CASCADE,
        related_name="items",
        verbose_name="Requisição",
    )

    exam = models.ForeignKey(

        "laboratorio.LabTest",

        db_column="exam_id",
        on_delete=models.PROTECT,
        related_name="lab_request_items",
        null=True,
        blank=True,
        verbose_name="Exame laboratorial",
    )

    medical_exam = models.ForeignKey(

        MedicalExam,

        db_column="medical_exam_id",
        on_delete=models.PROTECT,
        related_name="lab_request_items",
        null=True,
        blank=True,
        verbose_name="Exame médico",
    )

    # Ponte para o LIS (clinical_laboratory): exames de método especializado
    # (cultura, baciloscopia, GeneXpert, PCR) preenchem-se no seu sector
    # dedicado; este elo guarda o item de pedido do sector para deep-link e
    # leitura de estado.
    sector_order_item = models.ForeignKey(
        "laboratorio.LabOrderItem",
        db_column="sector_order_item_id",
        on_delete=models.SET_NULL,
        related_name="+",
        null=True,
        blank=True,
        verbose_name="Item do sector (LIS)",
    )

    class SampleStatus(models.TextChoices):
        AWAITING = "aguardando", "Aguardando receção"
        COLLECTED = "coletada", "Amostra coletada"
        RECEIVED = "recebida", "Amostra recebida"
        REJECTED = "rejeitada", "Amostra rejeitada"

    sample_status = models.CharField(
        db_column="sample_status",
        max_length=20,
        choices=SampleStatus.choices,
        default=SampleStatus.AWAITING,
        db_index=True,
        verbose_name="Estado da amostra",
    )

    rejection_reasons = models.ManyToManyField(
        "clinical.SampleRejectionReason",
        blank=True,
        related_name="rejected_items",
        verbose_name="Motivos de rejeição",
    )

    rejection_note = models.TextField(
        db_column="rejection_note",
        blank=True,
        default="",
        verbose_name="Observação da rejeição",
    )

    sample_received_at = models.DateTimeField(
        db_column="sample_received_at",
        null=True,
        blank=True,
        verbose_name="Amostra recebida em",
    )

    def colher_amostra(self, user=None, *, cascade_same_sample=False):
        if self.sample_status == self.SampleStatus.COLLECTED:
            raise ValidationError("Amostra já marcada como coletada.")
        if self.sample_status == self.SampleStatus.RECEIVED:
            raise ValidationError("Amostra já recebida pelo laboratório.")
        self.sample_status = self.SampleStatus.COLLECTED
        self.sample_received_at = None
        self.rejection_note = ""
        self.save(update_fields=["sample_status", "sample_received_at", "rejection_note", "updated_at"])
        self.rejection_reasons.clear()
        if cascade_same_sample:
            self._colher_itens_da_mesma_amostra(user=user)
        return self

    def receber_amostra(self, user=None, *, cascade_same_sample=False):
        from django.utils import timezone

        if self.sample_status == self.SampleStatus.RECEIVED:
            raise ValidationError("Amostra já marcada como recebida.")
        self.sample_status = self.SampleStatus.RECEIVED
        self.sample_received_at = timezone.now()
        self.rejection_note = ""
        self.save(update_fields=["sample_status", "sample_received_at", "rejection_note", "updated_at"])
        self.rejection_reasons.clear()
        self._resolver_rejeicoes_pendentes(user=user)
        if cascade_same_sample:
            self._receber_itens_da_mesma_amostra(user=user)
        return self

    def _colher_itens_da_mesma_amostra(self, user=None):
        """Coleta agrupada por tipo de amostra."""
        exam = self.exam
        primary_sample_type = getattr(exam, "sample_type", None) if exam else None
        if not primary_sample_type:
            return

        pendentes = (
            self.__class__.objects.filter(
                request_id=self.request_id,
                exam__isnull=False,
                sample_status=self.SampleStatus.AWAITING,
            )
            .exclude(pk=self.pk)
            .select_related("exam")
        )
        for item in pendentes:
            if item.exam and item.exam.sample_type == primary_sample_type:
                item.colher_amostra(user=user, cascade_same_sample=False)

    def _receber_itens_da_mesma_amostra(self, user=None):
        """Coleta agrupada por tipo de amostra."""
        exam = self.exam
        primary_sample_type = getattr(exam, "sample_type", None) if exam else None
        if not primary_sample_type:
            return

        pendentes = (
            self.__class__.objects.filter(
                request_id=self.request_id,
                exam__isnull=False,
                sample_status=self.SampleStatus.AWAITING,
            )
            .exclude(pk=self.pk)
            .select_related("exam")
        )
        for item in pendentes:
            if item.exam and item.exam.sample_type == primary_sample_type:
                item.receber_amostra(user=user, cascade_same_sample=False)

    def rejeitar_amostra(self, reasons, note="", user=None):
        if not reasons:
            raise ValidationError("Indique pelo menos um motivo de rejeição.")
        self.sample_status = self.SampleStatus.REJECTED
        self.sample_received_at = None
        self.rejection_note = note or ""
        self.save(update_fields=["sample_status", "sample_received_at", "rejection_note", "updated_at"])
        self.rejection_reasons.set(reasons)

        # Regista o evento de rejeição (histórico independente do estado do item),
        # para alimentar a página de Rejeições (pendentes vs resolvidas).
        from .sample_rejection import SampleRejectionRecord

        reasons_text = ", ".join(
            (getattr(r, "name", "") or getattr(r, "get_code_display", lambda: "")()) for r in reasons
        ).strip(", ")
        SampleRejectionRecord.objects.create(
            tenant_id=self.tenant_id,
            request_id=self.request_id,
            request_item=self,
            reasons_text=reasons_text,
            note=note or "",
            status=SampleRejectionRecord.Status.PENDING,
            created_by=user if getattr(user, "pk", None) else None,
        )
        return self

    def _resolver_rejeicoes_pendentes(self, user=None):
        """Marca como resolvidas as rejeições pendentes deste item — chamado
        quando a amostra (reconferida pela enfermagem) é recebida sem nova
        rejeição."""
        from django.utils import timezone

        from .sample_rejection import SampleRejectionRecord

        self.rejections.filter(status=SampleRejectionRecord.Status.PENDING).update(
            status=SampleRejectionRecord.Status.RESOLVED,
            resolved_at=timezone.now(),
            resolved_by=user if getattr(user, "pk", None) else None,
        )

    class Meta:
        db_table = "clinico_requisicaoitem"
        ordering = ["request", "position", "id"]
        indexes = [
            models.Index(fields=["request", "exam"]),
            models.Index(fields=["request", "medical_exam"]),
        ]
        verbose_name = "Item de requisição"
        verbose_name_plural = "Itens de requisições"

    position_scope_fields = ("request",)

    # -----------------------------------------------------

    def clean(self):
        # exige exatamente um type de exam
        if bool(self.exam) == bool(self.medical_exam):
            raise ValidationError("Informe um exam (laboratorial OU médico) por item.")

        # Se a requisição ainda não foi salva, não há validações dependentes dela.
        if not self.request_id:
            return

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
        if self.request_id:
            self.request._sync_samples_from_items()

    def delete(self, *args, **kwargs):
        request = self.request if self.request_id else None
        super().delete(*args, **kwargs)
        if request is not None:
            request._sync_samples_from_items()

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

        # LabTest usa related_name "fields"; LabExam (médico) usa "campos"
        fields = getattr(exam_base, "fields", None) or getattr(exam_base, "campos", None)
        if fields is None:
            return
        field_model = getattr(fields, "model", None)
        if field_model is not None and any(f.name == "sequence" for f in field_model._meta.fields):
            fields_queryset = fields.all().order_by("sequence", "id")
        else:
            fields_queryset = fields.all().order_by("position", "id")

        items = []
        next_position = (
            ResultItem.all_objects.filter(result=result).aggregate(max_position=models.Max("position")).get("max_position")
            or 0
        ) + 1

        for field in fields_queryset:
            # evita duplicação
            # result para exam laboratorial usa ResultadoItem
            if self.exam:
                if ResultItem.objects.filter(
                    result=result,
                    exam_field=field,
                ).exists():
                    continue
                items.append(
                    ResultItem(
                        result=result,
                        exam_field=field,
                        tenant=tenant,
                        position=next_position,
                    )
                )
                next_position += 1
            # exams médicos não geram itens específicos (imagem/laudo)

        if items:
            ResultItem.objects.bulk_create(items)

    # -----------------------------------------------------

    def __str__(self):
        name = getattr(self.exam, "name", None) or getattr(self.medical_exam, "name", "")
        return f"{self.request.custom_id} - {name}"
