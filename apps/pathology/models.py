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


class PathologyRequest(NoNameCoreModel):
    class RequestType(models.TextChoices):
        BREAST_BIOPSY = "BREAST_BIOPSY", "Biópsia mamária"
        GASTRIC_BIOPSY = "GASTRIC_BIOPSY", "Biópsia gástrica"
        SURGICAL_SPECIMEN = "SURGICAL_SPECIMEN", "Peça cirúrgica"
        CERVICAL_CYTOLOGY = "CERVICAL_CYTOLOGY", "Citologia cervical"
        FNAC = "FNAC", "Punção aspirativa"
        OTHER = "OTHER", "Outro"

    class Status(models.TextChoices):
        REQUESTED = "REQUESTED", "Solicitado"
        RECEIVED = "RECEIVED", "Amostra recebida"
        IN_PROGRESS = "IN_PROGRESS", "Em execução"
        REPORTED = "REPORTED", "Laudado"
        CANCELLED = "CANCELLED", "Cancelado"

    prefix = "PATREQ"

    patient = models.ForeignKey(
        "clinical.Patient",
        verbose_name="Paciente",
        on_delete=models.PROTECT,
        related_name="pathology_requests",
        db_index=True,
    )
    lab_request = models.ForeignKey(
        "clinical.LabRequest",
        verbose_name="Requisição laboratorial",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="pathology_requests",
    )
    requesting_doctor = models.ForeignKey(
        "recursos_humanos.Employee",
        verbose_name="Médico solicitante",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="pathology_requests",
    )
    service = models.CharField("Serviço", max_length=160, blank=True, default="", db_index=True)
    request_type = models.CharField(
        "Tipo de pedido", max_length=32, choices=RequestType.choices, default=RequestType.OTHER, db_index=True
    )
    priority = models.CharField(
        "Prioridade", max_length=16, choices=PathologyPriority.choices, default=PathologyPriority.ROUTINE, db_index=True
    )
    status = models.CharField("Estado", max_length=16, choices=Status.choices, default=Status.REQUESTED, db_index=True)
    requested_at = models.DateTimeField("Solicitado em", default=timezone.now, db_index=True)
    clinical_diagnosis = models.TextField("Diagnóstico clínico", blank=True, default="")
    icd_code = models.CharField("CID/ICD", max_length=40, blank=True, default="", db_index=True)
    anatomical_site = models.CharField("Procedência anatómica", max_length=180, blank=True, default="", db_index=True)
    notes = models.TextField("Observações", blank=True, default="")

    class Meta:
        db_table = "patologia_pedido"
        verbose_name = "Pedido de Patologia"
        verbose_name_plural = "Pedidos de Patologia"
        ordering = ["-requested_at", "-created_at"]
        indexes = [
            models.Index(fields=["tenant", "patient", "requested_at"]),
            models.Index(fields=["tenant", "requesting_doctor", "requested_at"]),
            models.Index(fields=["tenant", "status", "priority"]),
            models.Index(fields=["tenant", "request_type", "requested_at"]),
        ]

    def clean(self):
        super().clean()
        _validate_same_tenant(self, "patient")
        _validate_same_tenant(self, "lab_request")
        _validate_same_tenant(self, "requesting_doctor")
        _validate_patient_match(self, "lab_request")

    def save(self, *args, **kwargs):
        _propagate_tenant_from(self, "patient")
        self.full_clean()
        return super().save(*args, **kwargs)

    def __str__(self) -> str:
        code = self.custom_id or self.pk
        return f"Pedido {code} - {getattr(self.patient, 'name', '')}"


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
    request = models.ForeignKey(
        PathologyRequest,
        verbose_name="Pedido de patologia",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="sample_receptions",
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
    specimen_type = models.CharField(
        "Tipo de amostra", max_length=32, choices=SpecimenType.choices, default=SpecimenType.BIOPSY, db_index=True
    )
    anatomical_site = models.CharField("Sítio anatómico", max_length=180, blank=True, default="", db_index=True)
    container_count = models.PositiveSmallIntegerField(
        "Número de recipientes", default=1, validators=[MinValueValidator(1)]
    )
    fixation_type = models.CharField("Fixador", max_length=120, blank=True, default="Formol 10%")
    priority = models.CharField(
        "Prioridade", max_length=16, choices=PathologyPriority.choices, default=PathologyPriority.ROUTINE, db_index=True
    )
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
        _validate_same_tenant(self, "request")
        _validate_same_tenant(self, "lab_request")
        _validate_same_tenant(self, "surgery")
        _validate_same_tenant(self, "received_by")
        _validate_patient_match(self, "request")
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


class PathologyAccession(NoNameCoreModel):
    class BarcodeType(models.TextChoices):
        QR = "QR", "QR Code"
        DATAMATRIX = "DATAMATRIX", "DataMatrix"
        RFID = "RFID", "RFID"
        CODE128 = "CODE128", "Code 128"

    class Status(models.TextChoices):
        ACTIVE = "ACTIVE", "Ativo"
        SUPERSEDED = "SUPERSEDED", "Substituído"
        CANCELLED = "CANCELLED", "Cancelado"

    prefix = "PATACC"

    sample = models.ForeignKey(
        PathologySampleReception,
        verbose_name="Amostra",
        on_delete=models.CASCADE,
        related_name="accessions",
        db_index=True,
    )
    accessioned_by = models.ForeignKey(
        "recursos_humanos.Employee",
        verbose_name="Acessionado por",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="pathology_accessions",
    )
    accession_number = models.CharField("Número único", max_length=64, db_index=True)
    sub_sample_code = models.CharField("Sub-amostra", max_length=16, blank=True, default="A", db_index=True)
    barcode_type = models.CharField(
        "Tipo de código", max_length=16, choices=BarcodeType.choices, default=BarcodeType.QR, db_index=True
    )
    barcode_value = models.CharField("Valor do código", max_length=120, blank=True, default="")
    accessioned_at = models.DateTimeField("Acessionado em", default=timezone.now, db_index=True)
    status = models.CharField("Estado", max_length=16, choices=Status.choices, default=Status.ACTIVE, db_index=True)
    notes = models.TextField("Observações", blank=True, default="")

    class Meta:
        db_table = "patologia_acessionamento"
        verbose_name = "Acessionamento de Patologia"
        verbose_name_plural = "Acessionamentos de Patologia"
        ordering = ["-accessioned_at", "accession_number", "sub_sample_code"]
        constraints = [
            models.UniqueConstraint(
                fields=["tenant", "accession_number", "sub_sample_code"], name="uq_pathology_accession_subsample_tenant"
            ),
        ]
        indexes = [
            models.Index(fields=["tenant", "sample", "accessioned_at"]),
            models.Index(fields=["tenant", "accession_number"]),
            models.Index(fields=["tenant", "status"]),
        ]

    @property
    def full_code(self) -> str:
        suffix = (self.sub_sample_code or "").strip()
        return f"{self.accession_number}-{suffix}" if suffix else self.accession_number

    def clean(self):
        super().clean()
        _validate_same_tenant(self, "sample")
        _validate_same_tenant(self, "accessioned_by")

    def save(self, *args, **kwargs):
        _propagate_tenant_from(self, "sample")
        if not self.barcode_value:
            self.barcode_value = self.full_code
        self.full_clean()
        saved = super().save(*args, **kwargs)
        if self.status == self.Status.ACTIVE and self.sample_id:
            updates = {}
            if not self.sample.accession_number:
                updates["accession_number"] = self.accession_number
            if self.sample.status == PathologySampleReception.Status.RECEIVED:
                updates["status"] = PathologySampleReception.Status.ACCEPTED
                updates["accepted_at"] = timezone.now()
            if updates:
                PathologySampleReception.objects.filter(pk=self.sample_id).update(**updates)
        return saved

    def __str__(self) -> str:
        return self.full_code


class PathologyGrossExamination(NoNameCoreModel):
    class Status(models.TextChoices):
        PENDING = "PENDING", "Pendente"
        IN_PROGRESS = "IN_PROGRESS", "Em execução"
        COMPLETED = "COMPLETED", "Concluída"
        CANCELLED = "CANCELLED", "Cancelada"

    prefix = "PATMAC"

    sample = models.ForeignKey(
        PathologySampleReception,
        verbose_name="Amostra",
        on_delete=models.CASCADE,
        related_name="gross_examinations",
        db_index=True,
    )
    pathologist = models.ForeignKey(
        "recursos_humanos.Employee",
        verbose_name="Patologista",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="pathology_gross_examinations",
    )
    performed_at = models.DateTimeField("Realizada em", default=timezone.now, db_index=True)
    status = models.CharField("Estado", max_length=16, choices=Status.choices, default=Status.PENDING, db_index=True)
    specimen_weight_g = models.DecimalField(
        "Peso (g)", max_digits=10, decimal_places=2, default=Decimal("0.00"), validators=[MIN_ZERO]
    )
    dimensions = models.CharField("Dimensões", max_length=160, blank=True, default="")
    fragment_count = models.PositiveSmallIntegerField(
        "Número de fragmentos", default=1, validators=[MinValueValidator(1)]
    )
    cassette_count = models.PositiveSmallIntegerField(
        "Número de cassetes", default=1, validators=[MinValueValidator(1)]
    )
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

    sample = models.ForeignKey(
        PathologySampleReception,
        verbose_name="Amostra",
        on_delete=models.CASCADE,
        related_name="processing_records",
        db_index=True,
    )
    processor = models.ForeignKey(
        "recursos_humanos.Employee",
        verbose_name="Técnico responsável",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="pathology_processing_records",
    )
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
        indexes = [
            models.Index(fields=["tenant", "sample", "started_at"]),
            models.Index(fields=["tenant", "status"]),
            models.Index(fields=["tenant", "batch_number"]),
        ]

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


class PathologyEmbedding(NoNameCoreModel):
    class Status(models.TextChoices):
        PENDING = "PENDING", "Pendente"
        EMBEDDED = "EMBEDDED", "Incluído"
        REWORK = "REWORK", "Retrabalho"
        CANCELLED = "CANCELLED", "Cancelado"

    prefix = "PATEMB"

    sample = models.ForeignKey(
        PathologySampleReception,
        verbose_name="Amostra",
        on_delete=models.CASCADE,
        related_name="embeddings",
        db_index=True,
    )
    processing = models.ForeignKey(
        PathologyProcessing,
        verbose_name="Processamento",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="embeddings",
    )
    embedded_by = models.ForeignKey(
        "recursos_humanos.Employee",
        verbose_name="Incluído por",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="pathology_embeddings",
    )
    block_number = models.CharField("Número do bloco", max_length=80, db_index=True)
    cassette_number = models.CharField("Cassete", max_length=80, blank=True, default="", db_index=True)
    paraffin_type = models.CharField("Tipo de parafina", max_length=120, blank=True, default="")
    embedding_station = models.CharField("Estação de inclusão", max_length=120, blank=True, default="")
    embedded_at = models.DateTimeField("Incluído em", default=timezone.now, db_index=True)
    status = models.CharField("Estado", max_length=16, choices=Status.choices, default=Status.PENDING, db_index=True)
    notes = models.TextField("Observações", blank=True, default="")

    class Meta:
        db_table = "patologia_inclusao"
        verbose_name = "Inclusão em Parafina"
        verbose_name_plural = "Inclusões em Parafina"
        ordering = ["-embedded_at", "block_number"]
        constraints = [
            models.UniqueConstraint(fields=["tenant", "block_number"], name="uq_pathology_block_number_tenant")
        ]
        indexes = [
            models.Index(fields=["tenant", "sample", "embedded_at"]),
            models.Index(fields=["tenant", "processing"]),
            models.Index(fields=["tenant", "status"]),
            models.Index(fields=["tenant", "cassette_number"]),
        ]

    def clean(self):
        super().clean()
        _validate_same_tenant(self, "sample")
        _validate_same_tenant(self, "processing")
        _validate_same_tenant(self, "embedded_by")
        if self.processing_id and self.sample_id and self.processing.sample_id != self.sample_id:
            raise ValidationError({"processing": "O processamento deve pertencer à mesma amostra."})

    def save(self, *args, **kwargs):
        _propagate_tenant_from(self, "sample")
        self.full_clean()
        return super().save(*args, **kwargs)

    def __str__(self) -> str:
        return self.block_number


class PathologyMicrotomy(NoNameCoreModel):
    class Status(models.TextChoices):
        PENDING = "PENDING", "Pendente"
        CUT = "CUT", "Cortado"
        REPEAT = "REPEAT", "Repetir"
        CANCELLED = "CANCELLED", "Cancelado"

    prefix = "PATMIC"

    sample = models.ForeignKey(
        PathologySampleReception,
        verbose_name="Amostra",
        on_delete=models.CASCADE,
        related_name="microtomies",
        db_index=True,
    )
    embedding = models.ForeignKey(
        PathologyEmbedding, verbose_name="Bloco", on_delete=models.CASCADE, related_name="microtomies", db_index=True
    )
    cut_by = models.ForeignKey(
        "recursos_humanos.Employee",
        verbose_name="Técnico responsável",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="pathology_microtomies",
    )
    microtome = models.ForeignKey(
        "equipamentos.Equipment",
        verbose_name="Micrótomo",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="pathology_microtomies",
    )
    section_thickness_microns = models.DecimalField(
        "Espessura do corte (µm)", max_digits=6, decimal_places=2, default=Decimal("4.00"), validators=[MIN_ZERO]
    )
    section_count = models.PositiveSmallIntegerField("Número de secções", default=1, validators=[MinValueValidator(1)])
    slide_count = models.PositiveSmallIntegerField("Lâminas produzidas", default=1, validators=[MinValueValidator(1)])
    cut_at = models.DateTimeField("Cortado em", default=timezone.now, db_index=True)
    status = models.CharField("Estado", max_length=16, choices=Status.choices, default=Status.PENDING, db_index=True)
    notes = models.TextField("Observações", blank=True, default="")

    class Meta:
        db_table = "patologia_microtomia"
        verbose_name = "Microtomia"
        verbose_name_plural = "Microtomias"
        ordering = ["-cut_at", "-created_at"]
        indexes = [
            models.Index(fields=["tenant", "sample", "cut_at"]),
            models.Index(fields=["tenant", "embedding"]),
            models.Index(fields=["tenant", "status"]),
            models.Index(fields=["tenant", "microtome"]),
        ]

    def clean(self):
        super().clean()
        _validate_same_tenant(self, "sample")
        _validate_same_tenant(self, "embedding")
        _validate_same_tenant(self, "cut_by")
        _validate_same_tenant(self, "microtome")
        if self.embedding_id and self.sample_id and self.embedding.sample_id != self.sample_id:
            raise ValidationError({"embedding": "O bloco deve pertencer à mesma amostra."})

    def save(self, *args, **kwargs):
        _propagate_tenant_from(self, "sample")
        self.full_clean()
        return super().save(*args, **kwargs)

    def __str__(self) -> str:
        return self.custom_id or f"Microtomia {self.pk}"


class PathologyHistologySlide(NoNameCoreModel):
    class Status(models.TextChoices):
        CREATED = "CREATED", "Criada"
        PREPARED = "PREPARED", "Preparada"
        STAINED = "STAINED", "Corada"
        REVIEW = "REVIEW", "Em revisão"
        REVIEWED = "REVIEWED", "Revista"
        APPROVED = "APPROVED", "Aprovada"
        REPEAT = "REPEAT", "Repetir"
        ARCHIVED = "ARCHIVED", "Arquivada"
        LOST = "LOST", "Perdida"
        DESTROYED = "DESTROYED", "Destruída"

    prefix = "PATHIS"

    sample = models.ForeignKey(
        PathologySampleReception,
        verbose_name="Amostra",
        on_delete=models.CASCADE,
        related_name="histology_slides",
        db_index=True,
    )
    processing = models.ForeignKey(
        PathologyProcessing,
        verbose_name="Processamento",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="slides",
    )
    microtomy = models.ForeignKey(
        PathologyMicrotomy,
        verbose_name="Microtomia",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="slides",
    )
    prepared_by = models.ForeignKey(
        "recursos_humanos.Employee",
        verbose_name="Preparada por",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="pathology_slides_prepared",
    )
    slide_number = models.CharField("Número da lâmina", max_length=80, db_index=True)
    block_number = models.CharField("Número do bloco", max_length=80, blank=True, default="", db_index=True)
    stain = models.CharField("Coloração", max_length=80, default="H&E", db_index=True)
    prepared_at = models.DateTimeField("Preparada em", default=timezone.now, db_index=True)
    status = models.CharField("Estado", max_length=16, choices=Status.choices, default=Status.CREATED, db_index=True)
    current_location = models.CharField("Localização actual", max_length=160, blank=True, default="", db_index=True)
    quality = models.CharField("Qualidade", max_length=120, blank=True, default="")
    notes = models.TextField("Observações", blank=True, default="")

    class Meta:
        db_table = "patologia_histologia"
        verbose_name = "Lâmina Histológica"
        verbose_name_plural = "Lâminas Histológicas"
        ordering = ["-prepared_at", "slide_number"]
        constraints = [
            models.UniqueConstraint(fields=["tenant", "slide_number"], name="uq_pathology_slide_number_tenant")
        ]
        indexes = [
            models.Index(fields=["tenant", "sample", "prepared_at"]),
            models.Index(fields=["tenant", "status"]),
            models.Index(fields=["tenant", "block_number"]),
        ]

    def clean(self):
        super().clean()
        _validate_same_tenant(self, "sample")
        _validate_same_tenant(self, "processing")
        _validate_same_tenant(self, "microtomy")
        _validate_same_tenant(self, "prepared_by")
        if self.processing_id and self.sample_id and self.processing.sample_id != self.sample_id:
            raise ValidationError({"processing": "O processamento deve pertencer à mesma amostra."})
        if self.microtomy_id and self.sample_id and self.microtomy.sample_id != self.sample_id:
            raise ValidationError({"microtomy": "A microtomia deve pertencer à mesma amostra."})

    def save(self, *args, **kwargs):
        _propagate_tenant_from(self, "sample")
        self.full_clean()
        return super().save(*args, **kwargs)

    def __str__(self) -> str:
        return self.slide_number


class PathologyStaining(NoNameCoreModel):
    class StainType(models.TextChoices):
        HE = "HE", "Hematoxilina e Eosina"
        PAS = "PAS", "PAS"
        ZIEHL_NEELSEN = "ZIEHL_NEELSEN", "Ziehl-Neelsen"
        GIEMSA = "GIEMSA", "Giemsa"
        MASSON = "MASSON", "Masson"
        SILVER = "SILVER", "Prata"
        OTHER = "OTHER", "Outra"

    class Status(models.TextChoices):
        PENDING = "PENDING", "Pendente"
        IN_PROGRESS = "IN_PROGRESS", "Em execução"
        COMPLETED = "COMPLETED", "Concluída"
        FAILED = "FAILED", "Falhou"
        REPEAT = "REPEAT", "Repetir"
        CANCELLED = "CANCELLED", "Cancelada"

    prefix = "PATCOR"

    sample = models.ForeignKey(
        PathologySampleReception,
        verbose_name="Amostra",
        on_delete=models.CASCADE,
        related_name="stainings",
        db_index=True,
    )
    slide = models.ForeignKey(
        PathologyHistologySlide,
        verbose_name="Lâmina",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="stainings",
    )
    microtomy = models.ForeignKey(
        PathologyMicrotomy,
        verbose_name="Microtomia",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="stainings",
    )
    stained_by = models.ForeignKey(
        "recursos_humanos.Employee",
        verbose_name="Corada por",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="pathology_stainings",
    )
    equipment = models.ForeignKey(
        "equipamentos.Equipment",
        verbose_name="Equipamento",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="pathology_stainings",
    )
    stain_type = models.CharField(
        "Tipo de coloração", max_length=24, choices=StainType.choices, default=StainType.HE, db_index=True
    )
    stain_name = models.CharField("Nome da coloração", max_length=120, blank=True, default="H&E", db_index=True)
    protocol = models.CharField("Protocolo", max_length=160, blank=True, default="")
    reagent_lot = models.CharField("Lote do reagente", max_length=80, blank=True, default="", db_index=True)
    performed_at = models.DateTimeField("Realizada em", default=timezone.now, db_index=True)
    status = models.CharField("Estado", max_length=16, choices=Status.choices, default=Status.PENDING, db_index=True)
    billable = models.BooleanField("Faturável", default=True, db_index=True)
    unit_price = models.DecimalField(
        "Preço unitário", max_digits=12, decimal_places=2, default=Decimal("0.00"), validators=[MIN_ZERO]
    )
    notes = models.TextField("Observações", blank=True, default="")

    class Meta:
        db_table = "patologia_coloracao"
        verbose_name = "Coloração de Patologia"
        verbose_name_plural = "Colorações de Patologia"
        ordering = ["-performed_at", "stain_name"]
        indexes = [
            models.Index(fields=["tenant", "sample", "performed_at"]),
            models.Index(fields=["tenant", "slide"]),
            models.Index(fields=["tenant", "stain_type"]),
            models.Index(fields=["tenant", "status"]),
            models.Index(fields=["tenant", "billable"]),
        ]

    def clean(self):
        super().clean()
        _validate_same_tenant(self, "sample")
        _validate_same_tenant(self, "slide")
        _validate_same_tenant(self, "microtomy")
        _validate_same_tenant(self, "stained_by")
        _validate_same_tenant(self, "equipment")
        if self.slide_id and self.sample_id and self.slide.sample_id != self.sample_id:
            raise ValidationError({"slide": "A lâmina deve pertencer à mesma amostra."})
        if self.microtomy_id and self.sample_id and self.microtomy.sample_id != self.sample_id:
            raise ValidationError({"microtomy": "A microtomia deve pertencer à mesma amostra."})

    def save(self, *args, **kwargs):
        _propagate_tenant_from(self, "sample")
        self.full_clean()
        saved = super().save(*args, **kwargs)
        if self.status == self.Status.COMPLETED and self.slide_id:
            PathologyHistologySlide.objects.filter(pk=self.slide_id).update(
                stain=self.stain_name or self.stain_type,
                status=PathologyHistologySlide.Status.STAINED,
            )
        return saved

    def __str__(self) -> str:
        return self.stain_name or self.stain_type


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

    sample = models.ForeignKey(
        PathologySampleReception,
        verbose_name="Amostra",
        on_delete=models.CASCADE,
        related_name="cytology_cases",
        db_index=True,
    )
    cytologist = models.ForeignKey(
        "recursos_humanos.Employee",
        verbose_name="Citologista",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="pathology_cytology_cases",
    )
    specimen_source = models.CharField("Fonte da amostra", max_length=160, blank=True, default="")
    preparation_method = models.CharField("Método de preparação", max_length=160, blank=True, default="")
    adequacy = models.CharField(
        "Adequabilidade", max_length=20, choices=Adequacy.choices, default=Adequacy.ADEQUATE, db_index=True
    )
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
        indexes = [
            models.Index(fields=["tenant", "sample"]),
            models.Index(fields=["tenant", "status"]),
            models.Index(fields=["tenant", "adequacy"]),
        ]

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

    sample = models.ForeignKey(
        PathologySampleReception,
        verbose_name="Amostra",
        on_delete=models.CASCADE,
        related_name="immunohistochemistry_tests",
        db_index=True,
    )
    slide = models.ForeignKey(
        PathologyHistologySlide,
        verbose_name="Lâmina",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="immunohistochemistry_tests",
    )
    interpreted_by = models.ForeignKey(
        "recursos_humanos.Employee",
        verbose_name="Interpretado por",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="pathology_ihc_interpretations",
    )
    equipment = models.ForeignKey(
        "equipamentos.Equipment",
        verbose_name="Equipamento",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="pathology_ihc_tests",
    )
    marker = models.CharField("Marcador", max_length=80, db_index=True)
    clone = models.CharField("Clone", max_length=80, blank=True, default="")
    antibody_lot = models.CharField("Lote do anticorpo", max_length=80, blank=True, default="", db_index=True)
    result = models.CharField("Resultado", max_length=16, choices=Result.choices, default=Result.PENDING, db_index=True)
    intensity = models.CharField("Intensidade", max_length=80, blank=True, default="")
    percentage_positive = models.DecimalField(
        "Percentual positivo", max_digits=5, decimal_places=2, default=Decimal("0.00"), validators=PERCENT_VALIDATORS
    )
    control_status = models.CharField(
        "Controlo", max_length=16, choices=ControlStatus.choices, default=ControlStatus.VALID, db_index=True
    )
    performed_at = models.DateTimeField("Realizado em", default=timezone.now, db_index=True)
    billable = models.BooleanField("Faturável", default=True, db_index=True)
    unit_price = models.DecimalField(
        "Preço unitário", max_digits=12, decimal_places=2, default=Decimal("0.00"), validators=[MIN_ZERO]
    )
    notes = models.TextField("Observações", blank=True, default="")

    class Meta:
        db_table = "patologia_imunohistoquimica"
        verbose_name = "Imunohistoquímica"
        verbose_name_plural = "Imunohistoquímica"
        ordering = ["-performed_at", "marker"]
        indexes = [
            models.Index(fields=["tenant", "sample", "performed_at"]),
            models.Index(fields=["tenant", "marker"]),
            models.Index(fields=["tenant", "result"]),
        ]

    def clean(self):
        super().clean()
        _validate_same_tenant(self, "sample")
        _validate_same_tenant(self, "slide")
        _validate_same_tenant(self, "interpreted_by")
        _validate_same_tenant(self, "equipment")
        if self.slide_id and self.sample_id and self.slide.sample_id != self.sample_id:
            raise ValidationError({"slide": "A lâmina deve pertencer à mesma amostra."})

    def save(self, *args, **kwargs):
        _propagate_tenant_from(self, "sample")
        self.full_clean()
        return super().save(*args, **kwargs)

    def __str__(self) -> str:
        return f"{self.marker} - {self.result}"


class PathologyMolecularTest(NoNameCoreModel):
    class TestType(models.TextChoices):
        PCR = "PCR", "PCR"
        HPV = "HPV", "HPV"
        EGFR = "EGFR", "EGFR"
        KRAS = "KRAS", "KRAS"
        BRAF = "BRAF", "BRAF"
        ALK = "ALK", "ALK"
        NGS = "NGS", "NGS"
        OTHER = "OTHER", "Outro"

    class Status(models.TextChoices):
        REQUESTED = "REQUESTED", "Solicitado"
        RUNNING = "RUNNING", "Em execução"
        COMPLETED = "COMPLETED", "Concluído"
        FAILED = "FAILED", "Falhou"
        CANCELLED = "CANCELLED", "Cancelado"

    prefix = "PATMOL"

    sample = models.ForeignKey(
        PathologySampleReception,
        verbose_name="Amostra",
        on_delete=models.CASCADE,
        related_name="molecular_tests",
        db_index=True,
    )
    slide = models.ForeignKey(
        PathologyHistologySlide,
        verbose_name="Lâmina",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="molecular_tests",
    )
    requested_by = models.ForeignKey(
        "recursos_humanos.Employee",
        verbose_name="Solicitado por",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="pathology_molecular_requests",
    )
    performed_by = models.ForeignKey(
        "recursos_humanos.Employee",
        verbose_name="Executado por",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="pathology_molecular_tests",
    )
    equipment = models.ForeignKey(
        "equipamentos.Equipment",
        verbose_name="Equipamento",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="pathology_molecular_tests",
    )
    test_type = models.CharField(
        "Tipo de teste", max_length=16, choices=TestType.choices, default=TestType.PCR, db_index=True
    )
    target = models.CharField("Alvo/marcador", max_length=120, blank=True, default="", db_index=True)
    gene_panel = models.CharField("Painel genético", max_length=160, blank=True, default="")
    specimen_quality = models.CharField("Qualidade da amostra", max_length=120, blank=True, default="")
    reagent_lot = models.CharField("Lote do reagente", max_length=80, blank=True, default="", db_index=True)
    status = models.CharField("Estado", max_length=16, choices=Status.choices, default=Status.REQUESTED, db_index=True)
    result = models.TextField("Resultado", blank=True, default="")
    interpretation = models.TextField("Interpretação", blank=True, default="")
    performed_at = models.DateTimeField("Realizado em", null=True, blank=True, db_index=True)
    billable = models.BooleanField("Faturável", default=True, db_index=True)
    unit_price = models.DecimalField(
        "Preço unitário", max_digits=12, decimal_places=2, default=Decimal("0.00"), validators=[MIN_ZERO]
    )
    notes = models.TextField("Observações", blank=True, default="")

    class Meta:
        db_table = "patologia_molecular"
        verbose_name = "Patologia Molecular"
        verbose_name_plural = "Patologia Molecular"
        ordering = ["-performed_at", "-created_at"]
        indexes = [
            models.Index(fields=["tenant", "sample", "performed_at"]),
            models.Index(fields=["tenant", "test_type"]),
            models.Index(fields=["tenant", "target"]),
            models.Index(fields=["tenant", "status"]),
            models.Index(fields=["tenant", "billable"]),
        ]

    def clean(self):
        super().clean()
        _validate_same_tenant(self, "sample")
        _validate_same_tenant(self, "slide")
        _validate_same_tenant(self, "requested_by")
        _validate_same_tenant(self, "performed_by")
        _validate_same_tenant(self, "equipment")
        if self.slide_id and self.sample_id and self.slide.sample_id != self.sample_id:
            raise ValidationError({"slide": "A lâmina deve pertencer à mesma amostra."})
        if self.status == self.Status.COMPLETED and not (self.result or self.interpretation):
            raise ValidationError({"result": "Informe resultado ou interpretação para concluir o teste molecular."})

    def save(self, *args, **kwargs):
        _propagate_tenant_from(self, "sample")
        if self.status == self.Status.COMPLETED and not self.performed_at:
            self.performed_at = timezone.now()
        self.full_clean()
        return super().save(*args, **kwargs)

    def __str__(self) -> str:
        return f"{self.test_type} {self.target}".strip()


class PathologyDiagnosisReview(NoNameCoreModel):
    class ReviewType(models.TextChoices):
        PRIMARY = "PRIMARY", "Diagnóstico primário"
        SECOND_OPINION = "SECOND_OPINION", "Segunda opinião"
        DIGITAL = "DIGITAL", "Patologia digital"
        AI_ASSISTED = "AI_ASSISTED", "IA assistida"

    class Status(models.TextChoices):
        DRAFT = "DRAFT", "Rascunho"
        REVIEW = "REVIEW", "Em revisão"
        SECOND_OPINION = "SECOND_OPINION", "Segunda opinião"
        FINAL = "FINAL", "Final"
        CANCELLED = "CANCELLED", "Cancelado"

    prefix = "PATDIA"

    sample = models.ForeignKey(
        PathologySampleReception,
        verbose_name="Amostra",
        on_delete=models.CASCADE,
        related_name="diagnosis_reviews",
        db_index=True,
    )
    report = models.ForeignKey(
        "PathologyReport",
        verbose_name="Laudo",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="diagnosis_reviews",
    )
    pathologist = models.ForeignKey(
        "recursos_humanos.Employee",
        verbose_name="Patologista",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="pathology_diagnoses",
    )
    reviewer = models.ForeignKey(
        "recursos_humanos.Employee",
        verbose_name="Revisor",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="pathology_diagnosis_reviews",
    )
    review_type = models.CharField(
        "Tipo de revisão", max_length=20, choices=ReviewType.choices, default=ReviewType.PRIMARY, db_index=True
    )
    status = models.CharField("Estado", max_length=20, choices=Status.choices, default=Status.DRAFT, db_index=True)
    digital_viewer_url = models.URLField("Visualizador digital", blank=True, default="")
    diagnosis = models.TextField("Diagnóstico", blank=True, default="")
    staging = models.CharField("Estadiamento", max_length=160, blank=True, default="")
    margins = models.CharField("Margens", max_length=160, blank=True, default="")
    histologic_grade = models.CharField("Grau histológico", max_length=120, blank=True, default="")
    comments = models.TextField("Comentários", blank=True, default="")
    reviewed_at = models.DateTimeField("Revisto em", null=True, blank=True, db_index=True)
    signed_at = models.DateTimeField("Assinado em", null=True, blank=True, db_index=True)
    notes = models.TextField("Observações", blank=True, default="")

    class Meta:
        db_table = "patologia_diagnostico"
        verbose_name = "Diagnóstico de Patologia"
        verbose_name_plural = "Diagnósticos de Patologia"
        ordering = ["-reviewed_at", "-created_at"]
        indexes = [
            models.Index(fields=["tenant", "sample", "reviewed_at"]),
            models.Index(fields=["tenant", "report"]),
            models.Index(fields=["tenant", "review_type"]),
            models.Index(fields=["tenant", "status"]),
            models.Index(fields=["tenant", "pathologist"]),
        ]

    def clean(self):
        super().clean()
        _validate_same_tenant(self, "sample")
        _validate_same_tenant(self, "report")
        _validate_same_tenant(self, "pathologist")
        _validate_same_tenant(self, "reviewer")
        if self.report_id and self.sample_id and self.report.sample_id != self.sample_id:
            raise ValidationError({"report": "O laudo deve pertencer à mesma amostra."})
        if self.status == self.Status.FINAL and not (self.diagnosis or self.comments):
            raise ValidationError({"diagnosis": "Informe diagnóstico ou comentários antes de finalizar."})

    def save(self, *args, **kwargs):
        _propagate_tenant_from(self, "sample")
        if self.status == self.Status.FINAL and not self.signed_at:
            self.signed_at = timezone.now()
        if self.status in {self.Status.REVIEW, self.Status.SECOND_OPINION, self.Status.FINAL} and not self.reviewed_at:
            self.reviewed_at = timezone.now()
        self.full_clean()
        return super().save(*args, **kwargs)

    def __str__(self) -> str:
        return self.custom_id or f"Diagnóstico {self.pk}"


class PathologyReport(NoNameCoreModel):
    class Status(models.TextChoices):
        DRAFT = "DRAFT", "Rascunho"
        PRELIMINARY = "PRELIMINARY", "Preliminar"
        FINAL = "FINAL", "Final"
        AMENDED = "AMENDED", "Retificado"
        CANCELLED = "CANCELLED", "Cancelado"

    prefix = "PATLAU"

    sample = models.ForeignKey(
        PathologySampleReception,
        verbose_name="Amostra",
        on_delete=models.CASCADE,
        related_name="reports",
        db_index=True,
    )
    pathologist = models.ForeignKey(
        "recursos_humanos.Employee",
        verbose_name="Patologista",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="pathology_reports",
    )
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
        indexes = [
            models.Index(fields=["tenant", "sample"]),
            models.Index(fields=["tenant", "status"]),
            models.Index(fields=["tenant", "pathologist", "signed_at"]),
        ]

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


class PathologyBillingEvent(NoNameCoreModel):
    class EventType(models.TextChoices):
        RECEPTION = "RECEPTION", "Recepção"
        GROSSING = "GROSSING", "Macroscopia"
        PROCESSING = "PROCESSING", "Processamento"
        HE_STAIN = "HE_STAIN", "Coloração H&E"
        SPECIAL_STAIN = "SPECIAL_STAIN", "Coloração especial"
        CYTOLOGY = "CYTOLOGY", "Citologia"
        IHC = "IHC", "Imunohistoquímica"
        MOLECULAR = "MOLECULAR", "Molecular"
        SECOND_OPINION = "SECOND_OPINION", "Segunda opinião"
        URGENCY = "URGENCY", "Urgência"
        ARCHIVE = "ARCHIVE", "Arquivo"
        OTHER = "OTHER", "Outro"

    class BillingStatus(models.TextChoices):
        DRAFT = "DRAFT", "Rascunho"
        READY = "READY", "Pronto para faturar"
        BILLED = "BILLED", "Faturado"
        CANCELLED = "CANCELLED", "Cancelado"

    prefix = "PATFAT"

    sample = models.ForeignKey(
        PathologySampleReception,
        verbose_name="Amostra",
        on_delete=models.CASCADE,
        related_name="billing_events",
        db_index=True,
    )
    report = models.ForeignKey(
        PathologyReport,
        verbose_name="Laudo",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="billing_events",
    )
    slide = models.ForeignKey(
        PathologyHistologySlide,
        verbose_name="Lâmina",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="billing_events",
    )
    staining = models.ForeignKey(
        PathologyStaining,
        verbose_name="Coloração",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="billing_events",
    )
    immunohistochemistry = models.ForeignKey(
        PathologyImmunohistochemistry,
        verbose_name="Imunohistoquímica",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="billing_events",
    )
    molecular_test = models.ForeignKey(
        PathologyMolecularTest,
        verbose_name="Teste molecular",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="billing_events",
    )
    invoice = models.ForeignKey(
        "faturamento.Invoice",
        verbose_name="Fatura",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="pathology_billing_events",
    )
    event_type = models.CharField(
        "Evento faturável", max_length=24, choices=EventType.choices, default=EventType.RECEPTION, db_index=True
    )
    description = models.CharField("Descrição", max_length=220, blank=True, default="")
    quantity = models.DecimalField(
        "Quantidade",
        max_digits=10,
        decimal_places=2,
        default=Decimal("1.00"),
        validators=[MinValueValidator(Decimal("0.01"))],
    )
    unit_price = models.DecimalField(
        "Preço unitário", max_digits=12, decimal_places=2, default=Decimal("0.00"), validators=[MIN_ZERO]
    )
    vat_percentage = models.DecimalField(
        "IVA (%)", max_digits=5, decimal_places=2, default=Decimal("0.00"), validators=PERCENT_VALIDATORS
    )
    line_total = models.DecimalField(
        "Total sem IVA", max_digits=12, decimal_places=2, default=Decimal("0.00"), validators=[MIN_ZERO]
    )
    total_with_vat = models.DecimalField(
        "Total com IVA", max_digits=12, decimal_places=2, default=Decimal("0.00"), validators=[MIN_ZERO]
    )
    status = models.CharField(
        "Estado", max_length=16, choices=BillingStatus.choices, default=BillingStatus.DRAFT, db_index=True
    )
    billable = models.BooleanField("Faturável", default=True, db_index=True)
    billed_at = models.DateTimeField("Faturado em", null=True, blank=True, db_index=True)
    notes = models.TextField("Observações", blank=True, default="")

    class Meta:
        db_table = "patologia_evento_faturacao"
        verbose_name = "Evento de Faturação de Patologia"
        verbose_name_plural = "Eventos de Faturação de Patologia"
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["tenant", "sample", "event_type"]),
            models.Index(fields=["tenant", "status", "billable"]),
            models.Index(fields=["tenant", "invoice"]),
            models.Index(fields=["tenant", "billed_at"]),
        ]

    def clean(self):
        super().clean()
        _validate_same_tenant(self, "sample")
        _validate_same_tenant(self, "report")
        _validate_same_tenant(self, "slide")
        _validate_same_tenant(self, "staining")
        _validate_same_tenant(self, "immunohistochemistry")
        _validate_same_tenant(self, "molecular_test")
        _validate_same_tenant(self, "invoice")
        for attr in ("report", "slide", "staining", "immunohistochemistry", "molecular_test"):
            related = getattr(self, attr, None)
            if related and self.sample_id and getattr(related, "sample_id", None) != self.sample_id:
                raise ValidationError({attr: "O registo relacionado deve pertencer à mesma amostra."})
        if (
            self.invoice_id
            and self.invoice.patient_id
            and self.sample_id
            and self.invoice.patient_id != self.sample.patient_id
        ):
            raise ValidationError({"invoice": "A fatura deve pertencer ao mesmo paciente da amostra."})

    def save(self, *args, **kwargs):
        _propagate_tenant_from(self, "sample")
        line_total = ((self.quantity or Decimal("0.00")) * (self.unit_price or Decimal("0.00"))).quantize(
            Decimal("0.01")
        )
        vat_amount = (line_total * (self.vat_percentage or Decimal("0.00")) / Decimal("100.00")).quantize(
            Decimal("0.01")
        )
        self.line_total = line_total
        self.total_with_vat = (line_total + vat_amount).quantize(Decimal("0.01"))
        if self.status == self.BillingStatus.BILLED and not self.billed_at:
            self.billed_at = timezone.now()
        self.full_clean()
        return super().save(*args, **kwargs)

    def __str__(self) -> str:
        return self.description or self.event_type


class PathologyInventoryUsage(NoNameCoreModel):
    prefix = "PATINV"

    sample = models.ForeignKey(
        PathologySampleReception,
        verbose_name="Amostra",
        on_delete=models.CASCADE,
        related_name="inventory_usages",
        db_index=True,
    )
    processing = models.ForeignKey(
        PathologyProcessing,
        verbose_name="Processamento",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="inventory_usages",
    )
    staining = models.ForeignKey(
        PathologyStaining,
        verbose_name="Coloração",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="inventory_usages",
    )
    molecular_test = models.ForeignKey(
        PathologyMolecularTest,
        verbose_name="Teste molecular",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="inventory_usages",
    )
    product = models.ForeignKey(
        "farmacia.Product",
        verbose_name="Produto/reagente",
        on_delete=models.PROTECT,
        related_name="pathology_usages",
        db_index=True,
    )
    consumed_by = models.ForeignKey(
        "recursos_humanos.Employee",
        verbose_name="Consumido por",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="pathology_inventory_usages",
    )
    quantity = models.DecimalField(
        "Quantidade",
        max_digits=10,
        decimal_places=2,
        default=Decimal("1.00"),
        validators=[MinValueValidator(Decimal("0.01"))],
    )
    unit = models.CharField("Unidade", max_length=24, blank=True, default="un")
    unit_cost = models.DecimalField(
        "Custo unitário", max_digits=12, decimal_places=2, default=Decimal("0.00"), validators=[MIN_ZERO]
    )
    line_total = models.DecimalField(
        "Custo total", max_digits=12, decimal_places=2, default=Decimal("0.00"), validators=[MIN_ZERO]
    )
    lot_number = models.CharField("Lote", max_length=80, blank=True, default="", db_index=True)
    consumed_at = models.DateTimeField("Consumido em", default=timezone.now, db_index=True)
    notes = models.TextField("Observações", blank=True, default="")

    class Meta:
        db_table = "patologia_consumo_inventario"
        verbose_name = "Consumo de Inventário de Patologia"
        verbose_name_plural = "Consumos de Inventário de Patologia"
        ordering = ["-consumed_at", "-created_at"]
        indexes = [
            models.Index(fields=["tenant", "sample", "consumed_at"]),
            models.Index(fields=["tenant", "product"]),
            models.Index(fields=["tenant", "lot_number"]),
        ]

    def clean(self):
        super().clean()
        _validate_same_tenant(self, "sample")
        _validate_same_tenant(self, "processing")
        _validate_same_tenant(self, "staining")
        _validate_same_tenant(self, "molecular_test")
        _validate_same_tenant(self, "product")
        _validate_same_tenant(self, "consumed_by")
        for attr in ("processing", "staining", "molecular_test"):
            related = getattr(self, attr, None)
            if related and self.sample_id and getattr(related, "sample_id", None) != self.sample_id:
                raise ValidationError({attr: "O registo relacionado deve pertencer à mesma amostra."})

    def save(self, *args, **kwargs):
        _propagate_tenant_from(self, "sample")
        self.line_total = ((self.quantity or Decimal("0.00")) * (self.unit_cost or Decimal("0.00"))).quantize(
            Decimal("0.01")
        )
        self.full_clean()
        return super().save(*args, **kwargs)

    def __str__(self) -> str:
        return f"{self.product} - {self.quantity} {self.unit}".strip()


class PathologyQualityControl(NoNameCoreModel):
    class ControlType(models.TextChoices):
        TURNAROUND_TIME = "TURNAROUND_TIME", "Turnaround time"
        REJECTION_RATE = "REJECTION_RATE", "Taxa de rejeição"
        REWORK = "REWORK", "Retrabalho"
        STAIN_FAILURE = "STAIN_FAILURE", "Falha de coloração"
        DIAGNOSTIC_CONCORDANCE = "DIAGNOSTIC_CONCORDANCE", "Concordância diagnóstica"
        EQUIPMENT = "EQUIPMENT", "Equipamento"
        OTHER = "OTHER", "Outro"

    class Status(models.TextChoices):
        OPEN = "OPEN", "Aberto"
        PASS = "PASS", "Conforme"
        WARNING = "WARNING", "Atenção"
        FAIL = "FAIL", "Não conforme"
        CLOSED = "CLOSED", "Fechado"

    prefix = "PATQC"

    sample = models.ForeignKey(
        PathologySampleReception,
        verbose_name="Amostra",
        on_delete=models.CASCADE,
        related_name="quality_controls",
        db_index=True,
    )
    slide = models.ForeignKey(
        PathologyHistologySlide,
        verbose_name="Lâmina",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="quality_controls",
    )
    staining = models.ForeignKey(
        PathologyStaining,
        verbose_name="Coloração",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="quality_controls",
    )
    report = models.ForeignKey(
        PathologyReport,
        verbose_name="Laudo",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="quality_controls",
    )
    reviewed_by = models.ForeignKey(
        "recursos_humanos.Employee",
        verbose_name="Revisto por",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="pathology_quality_controls",
    )
    control_type = models.CharField(
        "Tipo de controlo",
        max_length=32,
        choices=ControlType.choices,
        default=ControlType.TURNAROUND_TIME,
        db_index=True,
    )
    status = models.CharField("Estado", max_length=16, choices=Status.choices, default=Status.OPEN, db_index=True)
    turnaround_hours = models.DecimalField(
        "Turnaround time (h)", max_digits=8, decimal_places=2, default=Decimal("0.00"), validators=[MIN_ZERO]
    )
    metric_value = models.DecimalField(
        "Valor do indicador", max_digits=10, decimal_places=2, default=Decimal("0.00"), validators=[MIN_ZERO]
    )
    metric_unit = models.CharField("Unidade do indicador", max_length=40, blank=True, default="")
    finding = models.TextField("Achado", blank=True, default="")
    corrective_action = models.TextField("Acção correctiva", blank=True, default="")
    reviewed_at = models.DateTimeField("Revisto em", null=True, blank=True, db_index=True)
    due_at = models.DateTimeField("Prazo", null=True, blank=True, db_index=True)
    notes = models.TextField("Observações", blank=True, default="")

    class Meta:
        db_table = "patologia_controlo_qualidade"
        verbose_name = "Controlo de Qualidade de Patologia"
        verbose_name_plural = "Controlos de Qualidade de Patologia"
        ordering = ["-reviewed_at", "-created_at"]
        indexes = [
            models.Index(fields=["tenant", "sample", "control_type"]),
            models.Index(fields=["tenant", "status"]),
            models.Index(fields=["tenant", "due_at"]),
        ]

    def clean(self):
        super().clean()
        _validate_same_tenant(self, "sample")
        _validate_same_tenant(self, "slide")
        _validate_same_tenant(self, "staining")
        _validate_same_tenant(self, "report")
        _validate_same_tenant(self, "reviewed_by")
        for attr in ("slide", "staining", "report"):
            related = getattr(self, attr, None)
            if related and self.sample_id and getattr(related, "sample_id", None) != self.sample_id:
                raise ValidationError({attr: "O registo relacionado deve pertencer à mesma amostra."})

    def save(self, *args, **kwargs):
        _propagate_tenant_from(self, "sample")
        if (
            self.status in {self.Status.PASS, self.Status.WARNING, self.Status.FAIL, self.Status.CLOSED}
            and not self.reviewed_at
        ):
            self.reviewed_at = timezone.now()
        self.full_clean()
        return super().save(*args, **kwargs)

    def __str__(self) -> str:
        return f"{self.control_type} - {self.status}"


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

    sample = models.ForeignKey(
        PathologySampleReception,
        verbose_name="Amostra",
        on_delete=models.CASCADE,
        related_name="archives",
        db_index=True,
    )
    report = models.ForeignKey(
        PathologyReport, verbose_name="Laudo", on_delete=models.SET_NULL, null=True, blank=True, related_name="archives"
    )
    responsible = models.ForeignKey(
        "recursos_humanos.Employee",
        verbose_name="Responsável",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="pathology_archives",
    )
    archive_type = models.CharField(
        "Tipo de arquivo", max_length=16, choices=ArchiveType.choices, default=ArchiveType.BLOCK, db_index=True
    )
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
        indexes = [
            models.Index(fields=["tenant", "sample"]),
            models.Index(fields=["tenant", "archive_type", "status"]),
            models.Index(fields=["tenant", "location", "box_number"]),
        ]

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
