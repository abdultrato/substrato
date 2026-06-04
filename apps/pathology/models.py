from __future__ import annotations

from decimal import Decimal

from django.core.exceptions import ValidationError
from django.core.validators import MaxValueValidator, MinValueValidator
from django.db import models
from django.utils import timezone

from core.models.base import NoNameCoreModel

MIN_ZERO = MinValueValidator(Decimal("0.00"))
PERCENT_VALIDATORS = [MinValueValidator(Decimal("0.00")), MaxValueValidator(Decimal("100.00"))]


class PathologyPriority(models.TextChoices):
    ROUTINE = "ROUTINE", "Rotina"
    URGENT = "URGENT", "Urgente"
    STAT = "STAT", "Emergência"


class PathologySampleReception(NoNameCoreModel):
    class Source(models.TextChoices):
        OUTPATIENT = "OUTPATIENT", "Ambulatório"
        INPATIENT = "INPATIENT", "Internamento"
        OPERATING_ROOM = "OPERATING_ROOM", "Bloco operatório"
        EXTERNAL = "EXTERNAL", "Externo"
        OTHER = "OTHER", "Outro"

    class SpecimenType(models.TextChoices):
        BIOPSY = "BIOPSY", "Biópsia"
        SURGICAL_SPECIMEN = "SURGICAL_SPECIMEN", "Peça cirúrgica"
        CYTOLOGY = "CYTOLOGY", "Citologia"
        FLUID = "FLUID", "Líquido"
        SMEAR = "SMEAR", "Esfregaço"
        OTHER = "OTHER", "Outro"

    class Status(models.TextChoices):
        RECEIVED = "RECEIVED", "Recebida"
        ACCEPTED = "ACCEPTED", "Aceite"
        REJECTED = "REJECTED", "Rejeitada"
        IN_GROSSING = "IN_GROSSING", "Em macroscopia"
        IN_PROCESSING = "IN_PROCESSING", "Em processamento"
        READY_FOR_REPORT = "READY_FOR_REPORT", "Pronta para laudo"
        REPORTED = "REPORTED", "Laudada"
        ARCHIVED = "ARCHIVED", "Arquivada"
        CANCELLED = "CANCELLED", "Cancelada"

    prefix = "PATREC"

    patient = models.ForeignKey(
        "clinical.Patient",
        verbose_name="Paciente",
        on_delete=models.PROTECT,
        related_name="pathology_samples",
        db_index=True,
    )
    lab_request = models.ForeignKey(
        "clinical.LabRequest",
        verbose_name="Requisição laboratorial",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="pathology_samples",
    )
    surgery = models.ForeignKey(
        "cirurgia.Surgery",
        verbose_name="Cirurgia associada",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="pathology_samples",
    )
    received_by = models.ForeignKey(
        "recursos_humanos.Employee",
        verbose_name="Recebido por",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="pathology_samples_received",
    )
    accession_number = models.CharField("Número de patologia", max_length=64, blank=True, default="", db_index=True)
    source = models.CharField("Origem", max_length=24, choices=Source.choices, default=Source.OUTPATIENT, db_index=True)
    specimen_type = models.CharField("Tipo de amostra", max_length=32, choices=SpecimenType.choices, default=SpecimenType.BIOPSY, db_index=True)
    anatomical_site = models.CharField("Sítio anatómico", max_length=180, blank=True, default="", db_index=True)
    container_count = models.PositiveSmallIntegerField("Número de recipientes", default=1, validators=[MinValueValidator(1)])
    fixation_type = models.CharField("Fixador", max_length=120, blank=True, default="Formol 10%")
    priority = models.CharField("Prioridade", max_length=16, choices=PathologyPriority.choices, default=PathologyPriority.ROUTINE, db_index=True)
    status = models.CharField("Estado", max_length=24, choices=Status.choices, default=Status.RECEIVED, db_index=True)
    received_at = models.DateTimeField("Recebida em", default=timezone.now, db_index=True)
    accepted_at = models.DateTimeField("Aceite em", null=True, blank=True)
    rejected_at = models.DateTimeField("Rejeitada em", null=True, blank=True)
    rejection_reason = models.TextField("Motivo de rejeição", blank=True, default="")
    clinical_history = models.TextField("História clínica", blank=True, default="")
    notes = models.TextField("Observações", blank=True, default="")

    class Meta:
        db_table = "patologia_recepcao_amostra"
        verbose_name = "Recepção de Amostra de Patologia"
        verbose_name_plural = "Recepção de Amostras de Patologia"
        ordering = ["-received_at", "-created_at"]
        constraints = [
            models.UniqueConstraint(
                fields=["tenant", "accession_number"],
                condition=~models.Q(accession_number=""),
                name="uq_pathology_accession_tenant",
            ),
        ]
        indexes = [
            models.Index(fields=["tenant", "patient", "received_at"]),
            models.Index(fields=["tenant", "status", "priority"]),
            models.Index(fields=["tenant", "specimen_type", "received_at"]),
            models.Index(fields=["tenant", "surgery"]),
        ]

    def clean(self):
        super().clean()
        _validate_same_tenant(self, "patient")
        _validate_same_tenant(self, "lab_request")
        _validate_same_tenant(self, "surgery")
        _validate_same_tenant(self, "received_by")
        _validate_patient_match(self, "lab_request")
        _validate_patient_match(self, "surgery")
        if self.status == self.Status.REJECTED and not (self.rejection_reason or "").strip():
            raise ValidationError({"rejection_reason": "Informe o motivo quando a amostra é rejeitada."})
        if self.accepted_at and self.accepted_at < self.received_at:
            raise ValidationError({"accepted_at": "A aceitação não pode ser anterior à recepção."})
        if self.rejected_at and self.rejected_at < self.received_at:
            raise ValidationError({"rejected_at": "A rejeição não pode ser anterior à recepção."})

    def save(self, *args, **kwargs):
        _propagate_tenant_from(self, "patient")
        if self.status == self.Status.ACCEPTED and not self.accepted_at:
            self.accepted_at = timezone.now()
        if self.status == self.Status.REJECTED and not self.rejected_at:
            self.rejected_at = timezone.now()
        self.full_clean()
        return super().save(*args, **kwargs)

    def __str__(self) -> str:
        code = self.accession_number or self.custom_id or self.pk
        return f"Patologia {code} - {getattr(self.patient, 'name', '')}"


class PathologyGrossExamination(NoNameCoreModel):
    class Status(models.TextChoices):
        PENDING = "PENDING", "Pendente"
        IN_PROGRESS = "IN_PROGRESS", "Em execução"
        COMPLETED = "COMPLETED", "Concluída"
        CANCELLED = "CANCELLED", "Cancelada"

    prefix = "PATMAC"

    sample = models.ForeignKey(PathologySampleReception, verbose_name="Amostra", on_delete=models.CASCADE, related_name="gross_examinations", db_index=True)
    pathologist = models.ForeignKey("recursos_humanos.Employee", verbose_name="Patologista", on_delete=models.SET_NULL, null=True, blank=True, related_name="pathology_gross_examinations")
    performed_at = models.DateTimeField("Realizada em", default=timezone.now, db_index=True)
    status = models.CharField("Estado", max_length=16, choices=Status.choices, default=Status.PENDING, db_index=True)
    specimen_weight_g = models.DecimalField("Peso (g)", max_digits=10, decimal_places=2, default=Decimal("0.00"), validators=[MIN_ZERO])
    dimensions = models.CharField("Dimensões", max_length=160, blank=True, default="")
    fragment_count = models.PositiveSmallIntegerField("Número de fragmentos", default=1, validators=[MinValueValidator(1)])
    cassette_count = models.PositiveSmallIntegerField("Número de cassetes", default=1, validators=[MinValueValidator(1)])
    gross_description = models.TextField("Descrição macroscópica", blank=True, default="")
    notes = models.TextField("Observações", blank=True, default="")

    class Meta:
        db_table = "patologia_macroscopia"
        verbose_name = "Macroscopia"
        verbose_name_plural = "Macroscopia"
        ordering = ["-performed_at", "-created_at"]
        indexes = [models.Index(fields=["tenant", "sample", "performed_at"]), models.Index(fields=["tenant", "status"])]

    def clean(self):
        super().clean()
        _validate_same_tenant(self, "sample")
        _validate_same_tenant(self, "pathologist")

    def save(self, *args, **kwargs):
        _propagate_tenant_from(self, "sample")
        self.full_clean()
        return super().save(*args, **kwargs)

    def __str__(self) -> str:
        return self.custom_id or f"Macroscopia {self.pk}"


class PathologyProcessing(NoNameCoreModel):
    class Status(models.TextChoices):
        QUEUED = "QUEUED", "Em fila"
        PROCESSING = "PROCESSING", "Em processamento"
        COMPLETED = "COMPLETED", "Concluído"
        FAILED = "FAILED", "Falhou"
        CANCELLED = "CANCELLED", "Cancelado"

    prefix = "PATPRO"

    sample = models.ForeignKey(PathologySampleReception, verbose_name="Amostra", on_delete=models.CASCADE, related_name="processing_records", db_index=True)
    processor = models.ForeignKey("recursos_humanos.Employee", verbose_name="Técnico responsável", on_delete=models.SET_NULL, null=True, blank=True, related_name="pathology_processing_records")
    batch_number = models.CharField("Lote de processamento", max_length=80, blank=True, default="", db_index=True)
    protocol = models.CharField("Protocolo", max_length=160, blank=True, default="")
    processor_machine = models.CharField("Processador", max_length=120, blank=True, default="")
    cassette_count = models.PositiveSmallIntegerField("Cassetes", default=1, validators=[MinValueValidator(1)])
    started_at = models.DateTimeField("Iniciado em", default=timezone.now, db_index=True)
    completed_at = models.DateTimeField("Concluído em", null=True, blank=True, db_index=True)
    status = models.CharField("Estado", max_length=16, choices=Status.choices, default=Status.QUEUED, db_index=True)
    reagents = models.JSONField("Reagentes", default=list, blank=True)
    notes = models.TextField("Observações", blank=True, default="")

    class Meta:
        db_table = "patologia_processamento"
        verbose_name = "Processamento Histológico"
        verbose_name_plural = "Processamentos Histológicos"
        ordering = ["-started_at", "-created_at"]
        indexes = [models.Index(fields=["tenant", "sample", "started_at"]), models.Index(fields=["tenant", "status"]), models.Index(fields=["tenant", "batch_number"])]

    def clean(self):
        super().clean()
        _validate_same_tenant(self, "sample")
        _validate_same_tenant(self, "processor")
        if self.completed_at and self.completed_at < self.started_at:
            raise ValidationError({"completed_at": "A conclusão não pode ser anterior ao início."})

    def save(self, *args, **kwargs):
        _propagate_tenant_from(self, "sample")
        self.full_clean()
        return super().save(*args, **kwargs)

    def __str__(self) -> str:
        return self.custom_id or f"Processamento {self.pk}"


class PathologyHistologySlide(NoNameCoreModel):
    class Status(models.TextChoices):
        PREPARED = "PREPARED", "Preparada"
        REVIEW = "REVIEW", "Em revisão"
        APPROVED = "APPROVED", "Aprovada"
        REPEAT = "REPEAT", "Repetir"
        ARCHIVED = "ARCHIVED", "Arquivada"

    prefix = "PATHIS"

    sample = models.ForeignKey(PathologySampleReception, verbose_name="Amostra", on_delete=models.CASCADE, related_name="histology_slides", db_index=True)
    processing = models.ForeignKey(PathologyProcessing, verbose_name="Processamento", on_delete=models.SET_NULL, null=True, blank=True, related_name="slides")
    prepared_by = models.ForeignKey("recursos_humanos.Employee", verbose_name="Preparada por", on_delete=models.SET_NULL, null=True, blank=True, related_name="pathology_slides_prepared")
    slide_number = models.CharField("Número da lâmina", max_length=80, db_index=True)
    block_number = models.CharField("Número do bloco", max_length=80, blank=True, default="", db_index=True)
    stain = models.CharField("Coloração", max_length=80, default="H&E", db_index=True)
    prepared_at = models.DateTimeField("Preparada em", default=timezone.now, db_index=True)
    status = models.CharField("Estado", max_length=16, choices=Status.choices, default=Status.PREPARED, db_index=True)
    quality = models.CharField("Qualidade", max_length=120, blank=True, default="")
    notes = models.TextField("Observações", blank=True, default="")

    class Meta:
        db_table = "patologia_histologia"
        verbose_name = "Lâmina Histológica"
        verbose_name_plural = "Lâminas Histológicas"
        ordering = ["-prepared_at", "slide_number"]
        constraints = [models.UniqueConstraint(fields=["tenant", "slide_number"], name="uq_pathology_slide_number_tenant")]
        indexes = [models.Index(fields=["tenant", "sample", "prepared_at"]), models.Index(fields=["tenant", "status"]), models.Index(fields=["tenant", "block_number"])]

    def clean(self):
        super().clean()
        _validate_same_tenant(self, "sample")
        _validate_same_tenant(self, "processing")
        _validate_same_tenant(self, "prepared_by")
        if self.processing_id and self.sample_id and self.processing.sample_id != self.sample_id:
            raise ValidationError({"processing": "O processamento deve pertencer à mesma amostra."})

    def save(self, *args, **kwargs):
        _propagate_tenant_from(self, "sample")
        self.full_clean()
        return super().save(*args, **kwargs)

    def __str__(self) -> str:
        return self.slide_number


class PathologyCytologyCase(NoNameCoreModel):
    class Adequacy(models.TextChoices):
        ADEQUATE = "ADEQUATE", "Adequada"
        LIMITED = "LIMITED", "Limitada"
        UNSATISFACTORY = "UNSATISFACTORY", "Insatisfatória"

    class Status(models.TextChoices):
        RECEIVED = "RECEIVED", "Recebida"
        SCREENING = "SCREENING", "Em triagem"
        REVIEW = "REVIEW", "Em revisão"
        REPORTED = "REPORTED", "Laudada"
        CANCELLED = "CANCELLED", "Cancelada"

    prefix = "PATCIT"

    sample = models.ForeignKey(PathologySampleReception, verbose_name="Amostra", on_delete=models.CASCADE, related_name="cytology_cases", db_index=True)
    cytologist = models.ForeignKey("recursos_humanos.Employee", verbose_name="Citologista", on_delete=models.SET_NULL, null=True, blank=True, related_name="pathology_cytology_cases")
    specimen_source = models.CharField("Fonte da amostra", max_length=160, blank=True, default="")
    preparation_method = models.CharField("Método de preparação", max_length=160, blank=True, default="")
    adequacy = models.CharField("Adequabilidade", max_length=20, choices=Adequacy.choices, default=Adequacy.ADEQUATE, db_index=True)
    status = models.CharField("Estado", max_length=16, choices=Status.choices, default=Status.RECEIVED, db_index=True)
    screened_at = models.DateTimeField("Triada em", null=True, blank=True, db_index=True)
    microscopic_description = models.TextField("Descrição microscópica", blank=True, default="")
    interpretation = models.TextField("Interpretação", blank=True, default="")
    notes = models.TextField("Observações", blank=True, default="")

    class Meta:
        db_table = "patologia_citologia"
        verbose_name = "Citologia"
        verbose_name_plural = "Citologia"
        ordering = ["-created_at"]
        indexes = [models.Index(fields=["tenant", "sample"]), models.Index(fields=["tenant", "status"]), models.Index(fields=["tenant", "adequacy"])]

    def clean(self):
        super().clean()
        _validate_same_tenant(self, "sample")
        _validate_same_tenant(self, "cytologist")

    def save(self, *args, **kwargs):
        _propagate_tenant_from(self, "sample")
        self.full_clean()
        return super().save(*args, **kwargs)

    def __str__(self) -> str:
        return self.custom_id or f"Citologia {self.pk}"


class PathologyImmunohistochemistry(NoNameCoreModel):
    class Result(models.TextChoices):
        POSITIVE = "POSITIVE", "Positivo"
        NEGATIVE = "NEGATIVE", "Negativo"
        EQUIVOCAL = "EQUIVOCAL", "Duvidoso"
        PENDING = "PENDING", "Pendente"

    class ControlStatus(models.TextChoices):
        VALID = "VALID", "Válido"
        INVALID = "INVALID", "Inválido"
        NOT_APPLICABLE = "NA", "Não aplicável"

    prefix = "PATIHC"

    sample = models.ForeignKey(PathologySampleReception, verbose_name="Amostra", on_delete=models.CASCADE, related_name="immunohistochemistry_tests", db_index=True)
    slide = models.ForeignKey(PathologyHistologySlide, verbose_name="Lâmina", on_delete=models.SET_NULL, null=True, blank=True, related_name="immunohistochemistry_tests")
    interpreted_by = models.ForeignKey("recursos_humanos.Employee", verbose_name="Interpretado por", on_delete=models.SET_NULL, null=True, blank=True, related_name="pathology_ihc_interpretations")
    marker = models.CharField("Marcador", max_length=80, db_index=True)
    clone = models.CharField("Clone", max_length=80, blank=True, default="")
    result = models.CharField("Resultado", max_length=16, choices=Result.choices, default=Result.PENDING, db_index=True)
    intensity = models.CharField("Intensidade", max_length=80, blank=True, default="")
    percentage_positive = models.DecimalField("Percentual positivo", max_digits=5, decimal_places=2, default=Decimal("0.00"), validators=PERCENT_VALIDATORS)
    control_status = models.CharField("Controlo", max_length=16, choices=ControlStatus.choices, default=ControlStatus.VALID, db_index=True)
    performed_at = models.DateTimeField("Realizado em", default=timezone.now, db_index=True)
    notes = models.TextField("Observações", blank=True, default="")

    class Meta:
        db_table = "patologia_imunohistoquimica"
        verbose_name = "Imunohistoquímica"
        verbose_name_plural = "Imunohistoquímica"
        ordering = ["-performed_at", "marker"]
        indexes = [models.Index(fields=["tenant", "sample", "performed_at"]), models.Index(fields=["tenant", "marker"]), models.Index(fields=["tenant", "result"])]

    def clean(self):
        super().clean()
        _validate_same_tenant(self, "sample")
        _validate_same_tenant(self, "slide")
        _validate_same_tenant(self, "interpreted_by")
        if self.slide_id and self.sample_id and self.slide.sample_id != self.sample_id:
            raise ValidationError({"slide": "A lâmina deve pertencer à mesma amostra."})

    def save(self, *args, **kwargs):
        _propagate_tenant_from(self, "sample")
        self.full_clean()
        return super().save(*args, **kwargs)

    def __str__(self) -> str:
        return f"{self.marker} - {self.result}"


class PathologyReport(NoNameCoreModel):
    class Status(models.TextChoices):
        DRAFT = "DRAFT", "Rascunho"
        PRELIMINARY = "PRELIMINARY", "Preliminar"
        FINAL = "FINAL", "Final"
        AMENDED = "AMENDED", "Retificado"
        CANCELLED = "CANCELLED", "Cancelado"

    prefix = "PATLAU"

    sample = models.ForeignKey(PathologySampleReception, verbose_name="Amostra", on_delete=models.CASCADE, related_name="reports", db_index=True)
    pathologist = models.ForeignKey("recursos_humanos.Employee", verbose_name="Patologista", on_delete=models.SET_NULL, null=True, blank=True, related_name="pathology_reports")
    report_number = models.CharField("Número do laudo", max_length=80, blank=True, default="", db_index=True)
    status = models.CharField("Estado", max_length=16, choices=Status.choices, default=Status.DRAFT, db_index=True)
    diagnosis = models.TextField("Diagnóstico", blank=True, default="")
    gross_summary = models.TextField("Resumo macroscópico", blank=True, default="")
    microscopic_description = models.TextField("Descrição microscópica", blank=True, default="")
    immunohistochemistry_summary = models.TextField("Resumo de imunohistoquímica", blank=True, default="")
    conclusion = models.TextField("Conclusão", blank=True, default="")
    icd_code = models.CharField("CID/ICD", max_length=40, blank=True, default="", db_index=True)
    signed_at = models.DateTimeField("Assinado em", null=True, blank=True, db_index=True)
    delivered_at = models.DateTimeField("Entregue em", null=True, blank=True, db_index=True)
    notes = models.TextField("Observações", blank=True, default="")

    class Meta:
        db_table = "patologia_laudo"
        verbose_name = "Laudo de Patologia"
        verbose_name_plural = "Laudos de Patologia"
        ordering = ["-signed_at", "-created_at"]
        constraints = [
            models.UniqueConstraint(
                fields=["tenant", "report_number"],
                condition=~models.Q(report_number=""),
                name="uq_pathology_report_number_tenant",
            ),
        ]
        indexes = [models.Index(fields=["tenant", "sample"]), models.Index(fields=["tenant", "status"]), models.Index(fields=["tenant", "pathologist", "signed_at"])]

    def clean(self):
        super().clean()
        _validate_same_tenant(self, "sample")
        _validate_same_tenant(self, "pathologist")
        if self.delivered_at and self.signed_at and self.delivered_at < self.signed_at:
            raise ValidationError({"delivered_at": "A entrega não pode ser anterior à assinatura."})
        if self.status in {self.Status.FINAL, self.Status.AMENDED} and not (self.diagnosis or self.conclusion):
            raise ValidationError({"diagnosis": "Informe diagnóstico ou conclusão antes de finalizar o laudo."})

    def save(self, *args, **kwargs):
        _propagate_tenant_from(self, "sample")
        if self.status in {self.Status.FINAL, self.Status.AMENDED} and not self.signed_at:
            self.signed_at = timezone.now()
        self.full_clean()
        return super().save(*args, **kwargs)

    def __str__(self) -> str:
        return self.report_number or self.custom_id or f"Laudo {self.pk}"


class PathologyArchive(NoNameCoreModel):
    class ArchiveType(models.TextChoices):
        BLOCK = "BLOCK", "Bloco"
        SLIDE = "SLIDE", "Lâmina"
        SPECIMEN = "SPECIMEN", "Amostra"
        DIGITAL = "DIGITAL", "Digital"
        OTHER = "OTHER", "Outro"

    class Status(models.TextChoices):
        ARCHIVED = "ARCHIVED", "Arquivado"
        BORROWED = "BORROWED", "Emprestado"
        DISCARDED = "DISCARDED", "Descartado"
        LOST = "LOST", "Extraviado"

    prefix = "PATARQ"

    sample = models.ForeignKey(PathologySampleReception, verbose_name="Amostra", on_delete=models.CASCADE, related_name="archives", db_index=True)
    report = models.ForeignKey(PathologyReport, verbose_name="Laudo", on_delete=models.SET_NULL, null=True, blank=True, related_name="archives")
    responsible = models.ForeignKey("recursos_humanos.Employee", verbose_name="Responsável", on_delete=models.SET_NULL, null=True, blank=True, related_name="pathology_archives")
    archive_type = models.CharField("Tipo de arquivo", max_length=16, choices=ArchiveType.choices, default=ArchiveType.BLOCK, db_index=True)
    status = models.CharField("Estado", max_length=16, choices=Status.choices, default=Status.ARCHIVED, db_index=True)
    location = models.CharField("Localização", max_length=160, db_index=True)
    box_number = models.CharField("Caixa", max_length=80, blank=True, default="", db_index=True)
    shelf = models.CharField("Prateleira", max_length=80, blank=True, default="")
    archived_at = models.DateTimeField("Arquivado em", default=timezone.now, db_index=True)
    retention_until = models.DateField("Reter até", null=True, blank=True, db_index=True)
    notes = models.TextField("Observações", blank=True, default="")

    class Meta:
        db_table = "patologia_arquivamento"
        verbose_name = "Arquivamento de Patologia"
        verbose_name_plural = "Arquivamentos de Patologia"
        ordering = ["-archived_at", "location"]
        indexes = [models.Index(fields=["tenant", "sample"]), models.Index(fields=["tenant", "archive_type", "status"]), models.Index(fields=["tenant", "location", "box_number"])]

    def clean(self):
        super().clean()
        _validate_same_tenant(self, "sample")
        _validate_same_tenant(self, "report")
        _validate_same_tenant(self, "responsible")
        if self.report_id and self.sample_id and self.report.sample_id != self.sample_id:
            raise ValidationError({"report": "O laudo deve pertencer à mesma amostra."})

    def save(self, *args, **kwargs):
        _propagate_tenant_from(self, "sample")
        self.full_clean()
        return super().save(*args, **kwargs)

    def __str__(self) -> str:
        return f"{self.archive_type} - {self.location}"


def _propagate_tenant_from(instance, attr: str) -> None:
    related = getattr(instance, attr, None)
    tenant_id = getattr(related, "tenant_id", None)
    if tenant_id and not instance.tenant_id:
        instance.tenant_id = tenant_id


def _validate_same_tenant(instance, attr: str) -> None:
    related = getattr(instance, attr, None)
    if not related or not instance.tenant_id:
        return
    related_tenant_id = getattr(related, "tenant_id", None)
    if related_tenant_id and related_tenant_id != instance.tenant_id:
        raise ValidationError({attr: "O registo relacionado deve pertencer ao mesmo tenant."})


def _validate_patient_match(instance, attr: str) -> None:
    related = getattr(instance, attr, None)
    if not related or not getattr(instance, "patient_id", None):
        return
    related_patient_id = getattr(related, "patient_id", None)
    if related_patient_id and related_patient_id != instance.patient_id:
        raise ValidationError({attr: "O registo relacionado deve pertencer ao mesmo paciente."})
