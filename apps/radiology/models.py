from __future__ import annotations

import os

from django.core.exceptions import ValidationError
from django.core.validators import MinValueValidator
from django.db import models
from django.utils import timezone

from core.models.base import CoreModel, NoNameCoreModel


class ImagingModality(models.TextChoices):
    XRAY = "XRAY", "Raio-X"
    ULTRASOUND = "ULTRASOUND", "Ultrassom"
    CT = "CT", "Tomografia"
    MRI = "MRI", "Ressonância magnética"
    MAMMOGRAPHY = "MAMMOGRAPHY", "Mamografia"
    FLUOROSCOPY = "FLUOROSCOPY", "Fluoroscopia"
    DENSITOMETRY = "DENSITOMETRY", "Densitometria"
    OTHER = "OTHER", "Outra"


class ImagingBodyRegion(models.TextChoices):
    HEAD = "HEAD", "Cabeça"
    NECK = "NECK", "Pescoço"
    CHEST = "CHEST", "Tórax"
    ABDOMEN = "ABDOMEN", "Abdómen"
    PELVIS = "PELVIS", "Pelve"
    SPINE = "SPINE", "Coluna"
    UPPER_LIMB = "UPPER_LIMB", "Membro superior"
    LOWER_LIMB = "LOWER_LIMB", "Membro inferior"
    BREAST = "BREAST", "Mama"
    VASCULAR = "VASCULAR", "Vascular"
    WHOLE_BODY = "WHOLE_BODY", "Corpo inteiro"
    OTHER = "OTHER", "Outra"


class ImagingEquipment(CoreModel):
    class Status(models.TextChoices):
        ACTIVE = "ACTIVE", "Ativo"
        MAINTENANCE = "MAINTENANCE", "Em manutenção"
        INACTIVE = "INACTIVE", "Inativo"

    prefix = "RADQ"

    code = models.CharField("Código", max_length=40, db_index=True)
    modality = models.CharField("Modalidade", max_length=24, choices=ImagingModality.choices, db_index=True)
    status = models.CharField("Estado", max_length=16, choices=Status.choices, default=Status.ACTIVE, db_index=True)
    manufacturer = models.CharField("Fabricante", max_length=120, blank=True, default="")
    model = models.CharField("Modelo", max_length=120, blank=True, default="")
    serial_number = models.CharField("Número de série", max_length=80, blank=True, default="", db_index=True)
    ae_title = models.CharField("AE Title PACS", max_length=64, blank=True, default="", db_index=True)
    station_name = models.CharField("Estação", max_length=120, blank=True, default="")
    location = models.CharField("Localização", max_length=120, blank=True, default="")
    pacs_endpoint = models.CharField("Endpoint PACS/RIS", max_length=255, blank=True, default="")
    last_quality_control = models.DateField("Último controlo de qualidade", null=True, blank=True)
    next_quality_control = models.DateField("Próximo controlo de qualidade", null=True, blank=True, db_index=True)
    notes = models.TextField("Observações", blank=True, default="")

    class Meta:
        db_table = "radiologia_equipamento"
        verbose_name = "Equipamento de Imagem"
        verbose_name_plural = "Equipamentos de Imagem"
        ordering = ["name", "code"]
        constraints = [
            models.UniqueConstraint(fields=["tenant", "code"], name="uq_radiology_equipment_code_tenant"),
            models.UniqueConstraint(
                fields=["tenant", "serial_number"],
                condition=~models.Q(serial_number=""),
                name="uq_radiology_equipment_serial_tenant",
            ),
            models.UniqueConstraint(
                fields=["tenant", "ae_title"],
                condition=~models.Q(ae_title=""),
                name="uq_radiology_equipment_ae_tenant",
            ),
        ]
        indexes = [
            models.Index(fields=["tenant", "modality"]),
            models.Index(fields=["tenant", "status"]),
            models.Index(fields=["tenant", "next_quality_control"]),
        ]

    def __str__(self) -> str:
        return f"{self.code} - {self.name}"


class ImagingProtocol(CoreModel):
    prefix = "RADP"

    code = models.CharField("Código", max_length=40, db_index=True)
    modality = models.CharField("Modalidade", max_length=24, choices=ImagingModality.choices, db_index=True)
    body_region = models.CharField("Região anatómica", max_length=24, choices=ImagingBodyRegion.choices, default=ImagingBodyRegion.OTHER, db_index=True)
    contrast_required = models.BooleanField("Requer contraste", default=False)
    typical_duration_minutes = models.PositiveSmallIntegerField("Duração típica (min)", default=0)
    preparation = models.TextField("Preparação", blank=True, default="")
    acquisition_instructions = models.TextField("Instruções de aquisição", blank=True, default="")
    default_report_template = models.TextField("Modelo de laudo", blank=True, default="")
    notes = models.TextField("Observações", blank=True, default="")

    class Meta:
        db_table = "radiologia_protocolo"
        verbose_name = "Protocolo de Imagem"
        verbose_name_plural = "Protocolos de Imagem"
        ordering = ["modality", "name"]
        constraints = [
            models.UniqueConstraint(fields=["tenant", "code"], name="uq_radiology_protocol_code_tenant"),
        ]
        indexes = [
            models.Index(fields=["tenant", "modality"]),
            models.Index(fields=["tenant", "body_region"]),
            models.Index(fields=["tenant", "contrast_required"]),
        ]

    def __str__(self) -> str:
        return f"{self.code} - {self.name}"


class ImagingStudy(NoNameCoreModel):
    class Status(models.TextChoices):
        REQUESTED = "REQUESTED", "Solicitado"
        SCHEDULED = "SCHEDULED", "Agendado"
        IN_PROGRESS = "IN_PROGRESS", "Em aquisição"
        ACQUIRED = "ACQUIRED", "Imagem adquirida"
        REPORTING = "REPORTING", "Em laudo"
        REPORTED = "REPORTED", "Laudado"
        VALIDATED = "VALIDATED", "Validado"
        DELIVERED = "DELIVERED", "Entregue"
        CANCELLED = "CANCELLED", "Cancelado"

    class Priority(models.TextChoices):
        ROUTINE = "ROUTINE", "Rotina"
        URGENT = "URGENT", "Urgente"
        STAT = "STAT", "Emergência"

    prefix = "RADS"

    patient = models.ForeignKey(
        "clinical.Patient",
        verbose_name="Paciente",
        on_delete=models.PROTECT,
        related_name="imaging_studies",
        db_index=True,
    )
    requesting_doctor = models.ForeignKey(
        "recursos_humanos.Employee",
        verbose_name="Médico requisitante",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="requested_imaging_studies",
        db_index=True,
    )
    radiologist = models.ForeignKey(
        "recursos_humanos.Employee",
        verbose_name="Radiologista",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="assigned_imaging_studies",
        db_index=True,
    )
    consultation = models.ForeignKey(
        "consultas.MedicalConsultation",
        verbose_name="Consulta associada",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="imaging_studies",
    )
    medical_record = models.ForeignKey(
        "prontuario.MedicalRecordEntry",
        verbose_name="Cardex/Prontuário",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="imaging_studies",
    )
    prescription_item = models.ForeignKey(
        "prontuario.PrescriptionItem",
        verbose_name="Item de prescrição médica",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="imaging_studies",
    )
    protocol = models.ForeignKey(
        ImagingProtocol,
        verbose_name="Protocolo",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="studies",
    )
    equipment = models.ForeignKey(
        ImagingEquipment,
        verbose_name="Equipamento",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="studies",
    )
    accession_number = models.CharField("Número de acesso", max_length=64, blank=True, default="", db_index=True)
    study_instance_uid = models.CharField("Study Instance UID", max_length=128, blank=True, default="", db_index=True)
    modality = models.CharField("Modalidade", max_length=24, choices=ImagingModality.choices, default=ImagingModality.OTHER, db_index=True)
    body_region = models.CharField("Região anatómica", max_length=24, choices=ImagingBodyRegion.choices, default=ImagingBodyRegion.OTHER, db_index=True)
    status = models.CharField("Estado", max_length=16, choices=Status.choices, default=Status.REQUESTED, db_index=True)
    priority = models.CharField("Prioridade", max_length=16, choices=Priority.choices, default=Priority.ROUTINE, db_index=True)
    clinical_indication = models.TextField("Indicação clínica", blank=True, default="")
    requested_at = models.DateTimeField("Solicitado em", default=timezone.now, db_index=True)
    scheduled_at = models.DateTimeField("Agendado para", null=True, blank=True, db_index=True)
    started_at = models.DateTimeField("Aquisição iniciada em", null=True, blank=True)
    acquired_at = models.DateTimeField("Imagem adquirida em", null=True, blank=True)
    completed_at = models.DateTimeField("Concluído em", null=True, blank=True)
    contrast_used = models.BooleanField("Contraste utilizado", default=False)
    contrast_details = models.CharField("Detalhes do contraste", max_length=180, blank=True, default="")
    images_available = models.BooleanField("Imagens disponíveis", default=False, db_index=True)
    image_count = models.PositiveIntegerField("Número de imagens", default=0)
    storage_uri = models.CharField("URI de armazenamento", max_length=500, blank=True, default="")
    notes = models.TextField("Observações", blank=True, default="")

    class Meta:
        db_table = "radiologia_estudo"
        verbose_name = "Estudo de Imagem"
        verbose_name_plural = "Estudos de Imagem"
        ordering = ["-requested_at", "-created_at"]
        constraints = [
            models.UniqueConstraint(
                fields=["tenant", "accession_number"],
                condition=~models.Q(accession_number=""),
                name="uq_radiology_study_accession_tenant",
            ),
            models.UniqueConstraint(
                fields=["tenant", "study_instance_uid"],
                condition=~models.Q(study_instance_uid=""),
                name="uq_radiology_study_uid_tenant",
            ),
        ]
        indexes = [
            models.Index(fields=["tenant", "patient", "requested_at"]),
            models.Index(fields=["tenant", "status", "requested_at"]),
            models.Index(fields=["tenant", "modality", "requested_at"]),
            models.Index(fields=["tenant", "priority", "scheduled_at"]),
            models.Index(fields=["tenant", "radiologist", "requested_at"]),
        ]

    def clean(self):
        super().clean()
        _validate_same_tenant(self, "patient")
        _validate_same_tenant(self, "requesting_doctor")
        _validate_same_tenant(self, "radiologist")
        _validate_same_tenant(self, "consultation")
        _validate_same_tenant(self, "medical_record")
        _validate_same_tenant(self, "prescription_item")
        _validate_same_tenant(self, "protocol")
        _validate_same_tenant(self, "equipment")
        _validate_patient_match(self, "consultation")
        _validate_patient_match(self, "medical_record")
        _validate_prescription_patient_match(self)
        if self.protocol_id and self.modality != ImagingModality.OTHER and self.protocol.modality != self.modality:
            raise ValidationError({"protocol": "O protocolo deve ter a mesma modalidade do estudo."})
        if self.equipment_id and self.modality != ImagingModality.OTHER and self.equipment.modality != self.modality:
            raise ValidationError({"equipment": "O equipamento deve ter a mesma modalidade do estudo."})
        if self.completed_at and self.started_at and self.completed_at < self.started_at:
            raise ValidationError({"completed_at": "A conclusão não pode ser anterior ao início da aquisição."})
        if self.acquired_at and self.started_at and self.acquired_at < self.started_at:
            raise ValidationError({"acquired_at": "A aquisição não pode terminar antes de iniciar."})

    def save(self, *args, **kwargs):
        _propagate_tenant_from(self, "patient")
        if self.protocol_id:
            if self.modality == ImagingModality.OTHER:
                self.modality = self.protocol.modality
            if self.body_region == ImagingBodyRegion.OTHER:
                self.body_region = self.protocol.body_region
        elif self.equipment_id and self.modality == ImagingModality.OTHER:
            self.modality = self.equipment.modality
        self.images_available = self.images_available or bool(self.image_count or self.storage_uri or self.study_instance_uid)
        self.full_clean()
        return super().save(*args, **kwargs)

    def recalculate_image_count(self) -> None:
        series_total = self.series.aggregate(total=models.Sum("image_count"))["total"] or 0
        file_total = self.files.count()
        total = max(series_total, file_total)
        fields: list[str] = []
        if self.image_count != total:
            self.image_count = total
            fields.append("image_count")
        if total and not self.images_available:
            self.images_available = True
            fields.append("images_available")
        if fields:
            self.save(update_fields=fields)

    def mark_reported(self) -> None:
        terminal_statuses = {self.Status.VALIDATED, self.Status.DELIVERED, self.Status.CANCELLED}
        fields: list[str] = []
        if self.status not in terminal_statuses:
            self.status = self.Status.REPORTED
            fields.append("status")
        if not self.completed_at:
            self.completed_at = timezone.now()
            fields.append("completed_at")
        if fields:
            self.save(update_fields=fields)

    def __str__(self) -> str:
        return self.accession_number or self.custom_id or f"Estudo {self.pk}"


class ImagingSeries(NoNameCoreModel):
    prefix = "RADSE"

    study = models.ForeignKey(
        ImagingStudy,
        verbose_name="Estudo",
        on_delete=models.CASCADE,
        related_name="series",
        db_index=True,
    )
    series_instance_uid = models.CharField("Series Instance UID", max_length=128, blank=True, default="", db_index=True)
    series_number = models.PositiveSmallIntegerField("Número da série", default=1, validators=[MinValueValidator(1)])
    modality = models.CharField("Modalidade", max_length=24, choices=ImagingModality.choices, default=ImagingModality.OTHER, db_index=True)
    body_region = models.CharField("Região anatómica", max_length=24, choices=ImagingBodyRegion.choices, default=ImagingBodyRegion.OTHER, db_index=True)
    description = models.CharField("Descrição", max_length=255, blank=True, default="")
    image_count = models.PositiveIntegerField("Número de imagens", default=0)
    storage_uri = models.CharField("URI de armazenamento", max_length=500, blank=True, default="")
    acquisition_started_at = models.DateTimeField("Aquisição iniciada em", null=True, blank=True)
    acquisition_completed_at = models.DateTimeField("Aquisição concluída em", null=True, blank=True)
    notes = models.TextField("Observações", blank=True, default="")

    class Meta:
        db_table = "radiologia_serie"
        verbose_name = "Série de Imagem"
        verbose_name_plural = "Séries de Imagem"
        ordering = ["study", "series_number", "id"]
        constraints = [
            models.UniqueConstraint(
                fields=["tenant", "series_instance_uid"],
                condition=~models.Q(series_instance_uid=""),
                name="uq_radiology_series_uid_tenant",
            ),
            models.UniqueConstraint(fields=["study", "series_number"], name="uq_radiology_series_number_study"),
        ]
        indexes = [
            models.Index(fields=["tenant", "study", "series_number"]),
            models.Index(fields=["tenant", "modality"]),
            models.Index(fields=["tenant", "body_region"]),
        ]

    def clean(self):
        super().clean()
        _validate_same_tenant(self, "study")
        if self.acquisition_completed_at and self.acquisition_started_at and self.acquisition_completed_at < self.acquisition_started_at:
            raise ValidationError({"acquisition_completed_at": "A conclusão não pode ser anterior ao início."})

    def save(self, *args, **kwargs):
        _propagate_tenant_from(self, "study")
        if self.study_id:
            if self.modality == ImagingModality.OTHER:
                self.modality = self.study.modality
            if self.body_region == ImagingBodyRegion.OTHER:
                self.body_region = self.study.body_region
        self.full_clean()
        result = super().save(*args, **kwargs)
        if self.study_id:
            self.study.recalculate_image_count()
        return result

    def __str__(self) -> str:
        return self.series_instance_uid or f"Série {self.series_number}"


def _imaging_file_upload_to(instance, filename):
    study = getattr(instance, "study", None) or getattr(getattr(instance, "series", None), "study", None)
    parts = [
        "radiologia",
        str(getattr(study, "tenant_id", None) or "tenant"),
        getattr(study, "accession_number", "") or getattr(study, "custom_id", "") or str(getattr(instance, "study_id", "study")),
        filename,
    ]
    return os.path.join(*parts)


class ImagingFile(NoNameCoreModel):
    class FileType(models.TextChoices):
        DICOM = "DICOM", "DICOM"
        IMAGE = "IMAGE", "Imagem"
        REPORT_PDF = "REPORT_PDF", "PDF de laudo"
        VIDEO = "VIDEO", "Vídeo"
        OTHER = "OTHER", "Outro"

    prefix = "RADF"

    study = models.ForeignKey(
        ImagingStudy,
        verbose_name="Estudo",
        on_delete=models.CASCADE,
        related_name="files",
        db_index=True,
    )
    series = models.ForeignKey(
        ImagingSeries,
        verbose_name="Série",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="files",
    )
    file_type = models.CharField("Tipo de ficheiro", max_length=16, choices=FileType.choices, default=FileType.DICOM, db_index=True)
    file = models.FileField("Ficheiro", upload_to=_imaging_file_upload_to, null=True, blank=True)
    pacs_object_uri = models.CharField("URI no PACS", max_length=500, blank=True, default="")
    sop_instance_uid = models.CharField("SOP Instance UID", max_length=128, blank=True, default="", db_index=True)
    content_type = models.CharField("Tipo MIME", max_length=120, blank=True, default="")
    file_size = models.PositiveBigIntegerField("Tamanho do ficheiro", default=0)
    image_number = models.PositiveIntegerField("Número da imagem", default=0)
    checksum = models.CharField("Checksum", max_length=128, blank=True, default="")
    notes = models.TextField("Observações", blank=True, default="")

    class Meta:
        db_table = "radiologia_ficheiro"
        verbose_name = "Ficheiro de Imagem"
        verbose_name_plural = "Ficheiros de Imagem"
        ordering = ["study", "series", "image_number", "id"]
        constraints = [
            models.UniqueConstraint(
                fields=["tenant", "sop_instance_uid"],
                condition=~models.Q(sop_instance_uid=""),
                name="uq_radiology_file_sop_tenant",
            ),
        ]
        indexes = [
            models.Index(fields=["tenant", "study"]),
            models.Index(fields=["tenant", "series"]),
            models.Index(fields=["tenant", "file_type"]),
        ]

    def clean(self):
        super().clean()
        _validate_same_tenant(self, "study")
        _validate_same_tenant(self, "series")
        if self.series_id and self.study_id and self.series.study_id != self.study_id:
            raise ValidationError({"series": "A série deve pertencer ao mesmo estudo."})

    def save(self, *args, **kwargs):
        if not self.study_id and self.series_id:
            self.study_id = self.series.study_id
        _propagate_tenant_from(self, "study")
        if self.file and not self.file_size:
            self.file_size = getattr(self.file, "size", 0) or 0
        self.full_clean()
        result = super().save(*args, **kwargs)
        if self.study_id:
            self.study.recalculate_image_count()
        return result

    def __str__(self) -> str:
        return self.sop_instance_uid or self.pacs_object_uri or f"Ficheiro {self.pk}"


class ImagingReport(NoNameCoreModel):
    class Status(models.TextChoices):
        DRAFT = "DRAFT", "Rascunho"
        PRELIMINARY = "PRELIMINARY", "Preliminar"
        FINAL = "FINAL", "Final"
        AMENDED = "AMENDED", "Retificado"
        CANCELLED = "CANCELLED", "Cancelado"

    prefix = "RADL"

    study = models.ForeignKey(
        ImagingStudy,
        verbose_name="Estudo",
        on_delete=models.CASCADE,
        related_name="reports",
        db_index=True,
    )
    radiologist = models.ForeignKey(
        "recursos_humanos.Employee",
        verbose_name="Radiologista",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="imaging_reports",
        db_index=True,
    )
    status = models.CharField("Estado", max_length=16, choices=Status.choices, default=Status.DRAFT, db_index=True)
    version_number = models.PositiveSmallIntegerField("Versão", default=1, validators=[MinValueValidator(1)])
    reported_at = models.DateTimeField("Laudado em", default=timezone.now, db_index=True)
    signed_at = models.DateTimeField("Assinado em", null=True, blank=True, db_index=True)
    template_used = models.CharField("Modelo utilizado", max_length=120, blank=True, default="")
    technique = models.TextField("Técnica", blank=True, default="")
    findings = models.TextField("Achados", blank=True, default="")
    impression = models.TextField("Conclusão/Impressão", blank=True, default="")
    recommendations = models.TextField("Recomendações", blank=True, default="")
    critical_result = models.BooleanField("Resultado crítico", default=False, db_index=True)
    critical_notified_at = models.DateTimeField("Resultado crítico notificado em", null=True, blank=True)
    report_file = models.FileField("Ficheiro do laudo", upload_to=_imaging_file_upload_to, null=True, blank=True)
    notes = models.TextField("Observações", blank=True, default="")

    class Meta:
        db_table = "radiologia_laudo"
        verbose_name = "Laudo de Imagem"
        verbose_name_plural = "Laudos de Imagem"
        ordering = ["-reported_at", "-created_at"]
        constraints = [
            models.UniqueConstraint(fields=["study", "version_number"], name="uq_radiology_report_version_study"),
        ]
        indexes = [
            models.Index(fields=["tenant", "study", "reported_at"]),
            models.Index(fields=["tenant", "radiologist", "reported_at"]),
            models.Index(fields=["tenant", "status"]),
            models.Index(fields=["tenant", "critical_result"]),
        ]

    def clean(self):
        super().clean()
        _validate_same_tenant(self, "study")
        _validate_same_tenant(self, "radiologist")

    def save(self, *args, **kwargs):
        _propagate_tenant_from(self, "study")
        if self.status in {self.Status.FINAL, self.Status.AMENDED} and not self.signed_at:
            self.signed_at = timezone.now()
        self.full_clean()
        result = super().save(*args, **kwargs)
        if self.study_id and self.status in {self.Status.FINAL, self.Status.AMENDED}:
            self.study.mark_reported()
        return result

    def __str__(self) -> str:
        return self.custom_id or f"Laudo {self.pk}"


class PacsIntegrationEvent(NoNameCoreModel):
    class EventType(models.TextChoices):
        WORKLIST_CREATE = "WORKLIST_CREATE", "Criar worklist"
        WORKLIST_UPDATE = "WORKLIST_UPDATE", "Atualizar worklist"
        STUDY_SYNC = "STUDY_SYNC", "Sincronizar estudo"
        STORE = "STORE", "Armazenar imagem"
        QUERY = "QUERY", "Consultar PACS"
        RETRIEVE = "RETRIEVE", "Recuperar imagem"
        REPORT_SEND = "REPORT_SEND", "Enviar laudo"
        ERROR = "ERROR", "Erro"

    class Direction(models.TextChoices):
        OUTBOUND = "OUTBOUND", "Saída"
        INBOUND = "INBOUND", "Entrada"

    class Status(models.TextChoices):
        PENDING = "PENDING", "Pendente"
        SENT = "SENT", "Enviado"
        ACKNOWLEDGED = "ACKNOWLEDGED", "Confirmado"
        FAILED = "FAILED", "Falhou"
        IGNORED = "IGNORED", "Ignorado"

    prefix = "PACS"

    study = models.ForeignKey(
        ImagingStudy,
        verbose_name="Estudo",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="pacs_events",
        db_index=True,
    )
    equipment = models.ForeignKey(
        ImagingEquipment,
        verbose_name="Equipamento",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="pacs_events",
    )
    event_type = models.CharField("Tipo de evento", max_length=24, choices=EventType.choices, db_index=True)
    direction = models.CharField("Direção", max_length=12, choices=Direction.choices, default=Direction.OUTBOUND, db_index=True)
    status = models.CharField("Estado", max_length=16, choices=Status.choices, default=Status.PENDING, db_index=True)
    external_system = models.CharField("Sistema externo", max_length=120, blank=True, default="PACS")
    accession_number = models.CharField("Número de acesso", max_length=64, blank=True, default="", db_index=True)
    study_instance_uid = models.CharField("Study Instance UID", max_length=128, blank=True, default="", db_index=True)
    message_control_id = models.CharField("ID da mensagem", max_length=120, blank=True, default="", db_index=True)
    event_at = models.DateTimeField("Evento em", default=timezone.now, db_index=True)
    payload = models.JSONField("Payload", default=dict, blank=True)
    response = models.JSONField("Resposta", default=dict, blank=True)
    error_message = models.TextField("Mensagem de erro", blank=True, default="")
    retry_count = models.PositiveSmallIntegerField("Tentativas", default=0)

    class Meta:
        db_table = "radiologia_pacs_evento"
        verbose_name = "Evento PACS"
        verbose_name_plural = "Eventos PACS"
        ordering = ["-event_at", "-created_at"]
        indexes = [
            models.Index(fields=["tenant", "study", "event_at"]),
            models.Index(fields=["tenant", "event_type", "status"]),
            models.Index(fields=["tenant", "accession_number"]),
            models.Index(fields=["tenant", "study_instance_uid"]),
        ]

    def clean(self):
        super().clean()
        _validate_same_tenant(self, "study")
        _validate_same_tenant(self, "equipment")

    def save(self, *args, **kwargs):
        _propagate_tenant_from(self, "study")
        if not self.tenant_id:
            _propagate_tenant_from(self, "equipment")
        if self.study_id:
            self.accession_number = self.accession_number or self.study.accession_number
            self.study_instance_uid = self.study_instance_uid or self.study.study_instance_uid
        self.full_clean()
        return super().save(*args, **kwargs)

    def __str__(self) -> str:
        return f"{self.event_type} - {self.status}"


def _propagate_tenant_from(instance, field_name: str) -> None:
    if getattr(instance, "tenant_id", None):
        return
    related = getattr(instance, field_name, None)
    if related is not None and getattr(related, "tenant_id", None):
        instance.tenant_id = related.tenant_id


def _validate_same_tenant(instance, field_name: str) -> None:
    related_id = getattr(instance, f"{field_name}_id", None)
    if not related_id or not getattr(instance, "tenant_id", None):
        return
    related = getattr(instance, field_name, None)
    if related is not None and getattr(related, "tenant_id", None) != instance.tenant_id:
        raise ValidationError({field_name: "O registo relacionado deve pertencer ao mesmo tenant."})


def _validate_patient_match(instance, field_name: str) -> None:
    related_id = getattr(instance, f"{field_name}_id", None)
    patient_id = getattr(instance, "patient_id", None)
    if not related_id or not patient_id:
        return
    related = getattr(instance, field_name, None)
    related_patient_id = getattr(related, "patient_id", None)
    if related_patient_id and related_patient_id != patient_id:
        raise ValidationError({field_name: "O registo relacionado deve pertencer ao mesmo paciente."})


def _validate_prescription_patient_match(study: ImagingStudy) -> None:
    if not study.prescription_item_id or not study.patient_id:
        return
    record = getattr(study.prescription_item, "record", None)
    if record is not None and getattr(record, "patient_id", None) != study.patient_id:
        raise ValidationError({"prescription_item": "A prescrição médica deve pertencer ao paciente do estudo."})
