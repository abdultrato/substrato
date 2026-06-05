from __future__ import annotations

from decimal import Decimal

from django.core.exceptions import ValidationError
from django.core.validators import MinValueValidator
from django.db import models
from django.utils import timezone

from core.mixins.model.position import ScopedPositionMixin
from core.models.base import CoreModel, NoNameCoreModel

DENTAL_HISTORY_AUTO_MARKER = "Histórico gerado automaticamente a partir dos registos dentários anteriores."
MAX_DENTAL_HISTORY_RECORDS = 5
MAX_DENTAL_HISTORY_TREATMENT_PLANS = 5


class DentalProcedure(CoreModel):
    class Category(models.TextChoices):
        PREVENTIVE = "PREVENTIVE", "Preventivo"
        RESTORATIVE = "RESTORATIVE", "Restaurador"
        ENDODONTICS = "ENDODONTICS", "Endodontia"
        PERIODONTICS = "PERIODONTICS", "Periodontia"
        SURGERY = "SURGERY", "Cirurgia oral"
        ORTHODONTICS = "ORTHODONTICS", "Ortodontia"
        PROSTHESIS = "PROSTHESIS", "Prótese"
        IMAGING = "IMAGING", "Imagem"
        OTHER = "OTHER", "Outro"

    prefix = "DPR"

    code = models.CharField("Código", max_length=32, blank=True, default="", editable=False, db_index=True)
    category = models.CharField(
        "Categoria",
        max_length=20,
        choices=Category.choices,
        default=Category.RESTORATIVE,
        db_index=True,
    )
    default_duration_minutes = models.PositiveSmallIntegerField(
        "Duração padrão (minutos)",
        default=30,
        validators=[MinValueValidator(1)],
    )
    base_price = models.DecimalField(
        "Preço base",
        max_digits=12,
        decimal_places=2,
        default=Decimal("0.00"),
        validators=[MinValueValidator(Decimal("0.00"))],
    )
    requires_prosthesis_lab = models.BooleanField("Requer laboratório de prótese", default=False, db_index=True)
    active = models.BooleanField("Ativo", default=True, db_index=True)
    notes = models.TextField("Observações", blank=True, default="")

    class Meta:
        db_table = "odontologia_procedimento"
        verbose_name = "Procedimento Dentário"
        verbose_name_plural = "Procedimentos Dentários"
        ordering = ["name", "code"]
        constraints = [
            models.UniqueConstraint(fields=["tenant", "code"], name="uq_dental_procedure_code_tenant"),
        ]
        indexes = [
            models.Index(fields=["tenant", "category"]),
            models.Index(fields=["tenant", "active"]),
        ]

    def save(self, *args, **kwargs):
        super().save(*args, **kwargs)
        if not self.code and self.custom_id:
            self.__class__.all_objects.filter(pk=self.pk).update(code=self.custom_id)
            self.code = self.custom_id

    def __str__(self) -> str:
        return f"{self.code} - {self.name}" if self.code else self.name


class DentalAppointment(NoNameCoreModel):
    class Status(models.TextChoices):
        SCHEDULED = "SCHEDULED", "Agendada"
        CONFIRMED = "CONFIRMED", "Confirmada"
        CHECKED_IN = "CHECKED_IN", "Presente"
        IN_PROGRESS = "IN_PROGRESS", "Em atendimento"
        COMPLETED = "COMPLETED", "Concluída"
        CANCELLED = "CANCELLED", "Cancelada"
        NO_SHOW = "NO_SHOW", "Faltou"
        RESCHEDULED = "RESCHEDULED", "Reagendada"

    prefix = "DAG"

    patient = models.ForeignKey(
        "clinical.Patient",
        verbose_name="Paciente",
        on_delete=models.PROTECT,
        related_name="dental_appointments",
        db_index=True,
    )
    dentist = models.ForeignKey(
        "recursos_humanos.Employee",
        verbose_name="Dentista",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="dental_appointments",
        db_index=True,
    )
    consultation = models.ForeignKey(
        "consultas.MedicalConsultation",
        verbose_name="Consulta clínica associada",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="dental_appointments",
    )
    scheduled_start = models.DateTimeField("Início agendado", db_index=True)
    scheduled_end = models.DateTimeField("Fim agendado", null=True, blank=True, db_index=True)
    status = models.CharField("Estado", max_length=20, choices=Status.choices, default=Status.SCHEDULED, db_index=True)
    reason = models.CharField("Motivo", max_length=180, blank=True, default="")
    chair = models.CharField("Cadeira/Gabinete", max_length=60, blank=True, default="")
    notes = models.TextField("Observações", blank=True, default="")

    class Meta:
        db_table = "odontologia_agenda"
        verbose_name = "Consulta Dentária"
        verbose_name_plural = "Consultas Dentárias"
        ordering = ["-scheduled_start", "-created_at"]
        indexes = [
            models.Index(fields=["tenant", "patient", "scheduled_start"]),
            models.Index(fields=["tenant", "dentist", "scheduled_start"]),
            models.Index(fields=["tenant", "status", "scheduled_start"]),
        ]

    def clean(self):
        super().clean()
        _validate_same_tenant(self, "patient")
        _validate_same_tenant(self, "dentist")
        _validate_same_tenant(self, "consultation")
        if self.scheduled_end and self.scheduled_start and self.scheduled_end <= self.scheduled_start:
            raise ValidationError({"scheduled_end": "O fim deve ser posterior ao início agendado."})

    def save(self, *args, **kwargs):
        _propagate_tenant_from(self, "patient")
        self.full_clean()
        return super().save(*args, **kwargs)

    def __str__(self) -> str:
        return self.custom_id or f"Consulta dentária {self.pk}"


class DentalRecord(NoNameCoreModel):
    class Status(models.TextChoices):
        DRAFT = "DRAFT", "Rascunho"
        ACTIVE = "ACTIVE", "Ativo"
        FINALIZED = "FINALIZED", "Finalizado"
        CANCELLED = "CANCELLED", "Cancelado"

    prefix = "DRE"

    patient = models.ForeignKey(
        "clinical.Patient",
        verbose_name="Paciente",
        on_delete=models.PROTECT,
        related_name="dental_records",
        db_index=True,
    )
    dentist = models.ForeignKey(
        "recursos_humanos.Employee",
        verbose_name="Dentista",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="dental_records",
        db_index=True,
    )
    appointment = models.ForeignKey(
        "odontologia.DentalAppointment",
        verbose_name="Consulta dentária",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="records",
    )
    opened_at = models.DateTimeField("Abertura", default=timezone.now, db_index=True)
    closed_at = models.DateTimeField("Fecho", null=True, blank=True, db_index=True)
    status = models.CharField("Estado", max_length=20, choices=Status.choices, default=Status.DRAFT, db_index=True)
    chief_complaint = models.TextField("Queixa principal", blank=True, default="")
    dental_history = models.TextField("Histórico dentário", blank=True, default="")
    diagnosis = models.TextField("Diagnóstico dentário", blank=True, default="")
    treatment_summary = models.TextField("Resumo do tratamento", blank=True, default="")
    notes = models.TextField("Observações", blank=True, default="")

    class Meta:
        db_table = "odontologia_prontuario"
        verbose_name = "Prontuário Dentário"
        verbose_name_plural = "Prontuários Dentários"
        ordering = ["-opened_at", "-created_at"]
        indexes = [
            models.Index(fields=["tenant", "patient", "opened_at"]),
            models.Index(fields=["tenant", "dentist", "opened_at"]),
            models.Index(fields=["tenant", "status", "opened_at"]),
        ]

    def clean(self):
        super().clean()
        _validate_same_tenant(self, "patient")
        _validate_same_tenant(self, "dentist")
        _validate_same_tenant(self, "appointment")
        if self.appointment_id and self.patient_id and self.appointment.patient_id != self.patient_id:
            raise ValidationError({"appointment": "A consulta dentária deve pertencer ao mesmo paciente."})
        if self.closed_at and self.opened_at and self.closed_at < self.opened_at:
            raise ValidationError({"closed_at": "O fecho não pode ser anterior à abertura."})

    def save(self, *args, **kwargs):
        _propagate_tenant_from(self, "patient")
        history_before = self.dental_history
        if self._should_refresh_dental_history():
            self.dental_history = build_patient_dental_history(self)
        self.full_clean()
        if self.dental_history != history_before and kwargs.get("update_fields") is not None:
            update_fields = set(kwargs["update_fields"])
            update_fields.add("dental_history")
            kwargs["update_fields"] = list(update_fields)
        return super().save(*args, **kwargs)

    def _should_refresh_dental_history(self) -> bool:
        current = (self.dental_history or "").strip()
        return not current or current.startswith(DENTAL_HISTORY_AUTO_MARKER)

    def __str__(self) -> str:
        return self.custom_id or f"Prontuário dentário {self.pk}"


# Representa o atendimento clínico realizado pelo dentista.
class DentalConsultation(NoNameCoreModel):
    class Status(models.TextChoices):
        CHECKED_IN = "CHECKED_IN", "Check-in"
        IN_PROGRESS = "IN_PROGRESS", "Em atendimento"
        COMPLETED = "COMPLETED", "Concluída"
        CANCELLED = "CANCELLED", "Cancelada"

    prefix = "DCO"

    patient = models.ForeignKey(
        "clinical.Patient",
        verbose_name="Paciente",
        on_delete=models.PROTECT,
        related_name="dental_consultations",
        db_index=True,
    )
    dentist = models.ForeignKey(
        "recursos_humanos.Employee",
        verbose_name="Dentista",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="dental_consultations",
        db_index=True,
    )
    appointment = models.ForeignKey(
        "odontologia.DentalAppointment",
        verbose_name="Marcação dentária",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="dental_consultations",
    )
    record = models.ForeignKey(
        "odontologia.DentalRecord",
        verbose_name="Prontuário dentário",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="consultations",
    )
    started_at = models.DateTimeField("Início do atendimento", default=timezone.now, db_index=True)
    ended_at = models.DateTimeField("Fim do atendimento", null=True, blank=True, db_index=True)
    status = models.CharField(
        "Estado", max_length=20, choices=Status.choices, default=Status.IN_PROGRESS, db_index=True
    )
    chief_complaint = models.TextField("Queixa principal", blank=True, default="")
    present_illness_history = models.TextField("História da doença atual", blank=True, default="")
    medical_history = models.TextField("Antecedentes médicos", blank=True, default="")
    allergies = models.TextField("Alergias", blank=True, default="")
    current_medication = models.TextField("Medicação em uso", blank=True, default="")
    oral_hygiene_habits = models.TextField("Hábitos de higiene oral", blank=True, default="")
    intraoral_exam = models.TextField("Exame intraoral", blank=True, default="")
    extraoral_exam = models.TextField("Exame extraoral", blank=True, default="")
    clinical_observations = models.TextField("Observações clínicas", blank=True, default="")
    attachment_notes = models.TextField("Fotografias, radiografias e documentos associados", blank=True, default="")

    class Meta:
        db_table = "odontologia_consulta_clinica"
        verbose_name = "Atendimento Clínico Dentário"
        verbose_name_plural = "Atendimentos Clínicos Dentários"
        ordering = ["-started_at", "-created_at"]
        indexes = [
            models.Index(fields=["tenant", "patient", "started_at"]),
            models.Index(fields=["tenant", "dentist", "started_at"]),
            models.Index(fields=["tenant", "status", "started_at"]),
        ]

    def clean(self):
        super().clean()
        _validate_same_tenant(self, "patient")
        _validate_same_tenant(self, "dentist")
        _validate_same_tenant(self, "appointment")
        _validate_same_tenant(self, "record")
        if self.appointment_id and self.patient_id and self.appointment.patient_id != self.patient_id:
            raise ValidationError({"appointment": "A marcação dentária deve pertencer ao mesmo paciente."})
        if self.record_id and self.patient_id and self.record.patient_id != self.patient_id:
            raise ValidationError({"record": "O prontuário dentário deve pertencer ao mesmo paciente."})
        if self.ended_at and self.started_at and self.ended_at < self.started_at:
            raise ValidationError({"ended_at": "O fim do atendimento não pode ser anterior ao início."})

    def save(self, *args, **kwargs):
        _propagate_tenant_from(self, "patient")
        _propagate_tenant_from(self, "record")
        _propagate_tenant_from(self, "appointment")
        self.full_clean()
        return super().save(*args, **kwargs)

    def __str__(self) -> str:
        return self.custom_id or f"Atendimento dentário {self.pk}"


# Representa o mapa dentário do paciente numa determinada consulta.
class DentalOdontogram(NoNameCoreModel):
    class DentitionType(models.TextChoices):
        PERMANENT = "PERMANENT", "Dentição permanente"
        DECIDUOUS = "DECIDUOUS", "Dentição decídua"
        MIXED = "MIXED", "Dentição mista"
        EDENTULOUS = "EDENTULOUS", "Edêntulo"

    class Status(models.TextChoices):
        INITIAL = "INITIAL", "Inicial"
        UPDATED = "UPDATED", "Atualizado"
        TREATMENT_PLANNED = "TREATMENT_PLANNED", "Tratamento planeado"
        UNDER_TREATMENT = "UNDER_TREATMENT", "Em tratamento"
        POST_TREATMENT = "POST_TREATMENT", "Pós-tratamento"
        ARCHIVED = "ARCHIVED", "Arquivado"

    prefix = "DOD"

    patient = models.ForeignKey(
        "clinical.Patient",
        verbose_name="Paciente",
        on_delete=models.PROTECT,
        related_name="dental_odontograms",
        db_index=True,
    )
    consultation = models.ForeignKey(
        "odontologia.DentalConsultation",
        verbose_name="Atendimento dentário",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="odontograms",
    )
    record = models.ForeignKey(
        "odontologia.DentalRecord",
        verbose_name="Prontuário dentário",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="odontograms",
    )
    created_by_dentist = models.ForeignKey(
        "recursos_humanos.Employee",
        verbose_name="Criado pelo dentista",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="created_dental_odontograms",
        db_index=True,
    )
    charted_at = models.DateTimeField("Data do odontograma", default=timezone.now, db_index=True)
    dentition_type = models.CharField(
        "Tipo de dentição",
        max_length=20,
        choices=DentitionType.choices,
        default=DentitionType.PERMANENT,
        db_index=True,
    )
    status = models.CharField("Estado", max_length=24, choices=Status.choices, default=Status.INITIAL, db_index=True)
    notes = models.TextField("Observações", blank=True, default="")

    class Meta:
        db_table = "odontologia_mapa_odontograma"
        verbose_name = "Mapa Odontológico"
        verbose_name_plural = "Mapas Odontológicos"
        ordering = ["-charted_at", "-created_at"]
        indexes = [
            models.Index(fields=["tenant", "patient", "charted_at"]),
            models.Index(fields=["tenant", "status", "charted_at"]),
            models.Index(fields=["tenant", "dentition_type"]),
        ]

    def clean(self):
        super().clean()
        _validate_same_tenant(self, "patient")
        _validate_same_tenant(self, "consultation")
        _validate_same_tenant(self, "record")
        _validate_same_tenant(self, "created_by_dentist")
        if self.consultation_id and self.patient_id and self.consultation.patient_id != self.patient_id:
            raise ValidationError({"consultation": "O atendimento dentário deve pertencer ao mesmo paciente."})
        if self.record_id and self.patient_id and self.record.patient_id != self.patient_id:
            raise ValidationError({"record": "O prontuário dentário deve pertencer ao mesmo paciente."})

    def save(self, *args, **kwargs):
        _propagate_tenant_from(self, "patient")
        _propagate_tenant_from(self, "consultation")
        _propagate_tenant_from(self, "record")
        self.full_clean()
        return super().save(*args, **kwargs)

    def __str__(self) -> str:
        return self.custom_id or f"Odontograma {self.pk}"


# Regista uma condição clínica específica num dente ou superfície dentária.
class DentalOdontogramEntry(NoNameCoreModel):
    class Surface(models.TextChoices):
        WHOLE = "WHOLE", "Dente inteiro"
        OCCLUSAL = "O", "Oclusal"
        MESIAL = "M", "Mesial"
        DISTAL = "D", "Distal"
        VESTIBULAR = "V", "Vestibular"
        LINGUAL = "L", "Lingual"
        PALATAL = "P", "Palatina"
        INCISAL = "I", "Incisal"
        GINGIVAL = "G", "Gengival"

    class Condition(models.TextChoices):
        HEALTHY = "HEALTHY", "Saudável"
        CARIES = "CARIES", "Cárie"
        RESTORATION = "RESTORATION", "Restauração"
        MISSING = "MISSING", "Ausente"
        CROWN = "CROWN", "Coroa"
        ROOT_CANAL = "ROOT_CANAL", "Endodontia"
        IMPLANT = "IMPLANT", "Implante"
        EXTRACTION_INDICATED = "EXTRACTION_INDICATED", "Extração indicada"
        PROSTHESIS = "PROSTHESIS", "Prótese"
        OTHER = "OTHER", "Outro"

    class Severity(models.TextChoices):
        LOW = "LOW", "Leve"
        MODERATE = "MODERATE", "Moderada"
        HIGH = "HIGH", "Grave"
        CRITICAL = "CRITICAL", "Crítica"

    class Status(models.TextChoices):
        OBSERVED = "OBSERVED", "Observado"
        PLANNED = "PLANNED", "Planeado"
        IN_TREATMENT = "IN_TREATMENT", "Em tratamento"
        TREATED = "TREATED", "Tratado"
        MONITORED = "MONITORED", "Monitorizado"

    prefix = "ODO"

    odontogram = models.ForeignKey(
        "odontologia.DentalOdontogram",
        verbose_name="Mapa odontológico",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="entries",
    )
    record = models.ForeignKey(
        "odontologia.DentalRecord",
        verbose_name="Prontuário dentário",
        on_delete=models.CASCADE,
        related_name="odontogram_entries",
        db_index=True,
    )
    tooth_number = models.CharField(
        "Numeração dentária",
        max_length=4,
        db_index=True,
        help_text="Use a numeração dentária FDI, como 11, 26, 48 ou 75.",
    )
    surface = models.CharField("Face", max_length=8, choices=Surface.choices, default=Surface.WHOLE, db_index=True)
    condition = models.CharField("Condição", max_length=24, choices=Condition.choices, default=Condition.HEALTHY)
    diagnosis = models.TextField("Diagnóstico", blank=True, default="")
    severity = models.CharField(
        "Gravidade",
        max_length=20,
        choices=Severity.choices,
        blank=True,
        default="",
        db_index=True,
    )
    color_code = models.CharField("Código de cor", max_length=16, blank=True, default="")
    procedure_suggested = models.CharField("Procedimento sugerido", max_length=180, blank=True, default="")
    status = models.CharField("Estado", max_length=20, choices=Status.choices, default=Status.OBSERVED, db_index=True)
    procedure = models.ForeignKey(
        "odontologia.DentalProcedure",
        verbose_name="Procedimento relacionado",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="odontogram_entries",
    )
    notes = models.TextField("Observações", blank=True, default="")

    class Meta:
        db_table = "odontologia_odontograma"
        verbose_name = "Entrada do Odontograma"
        verbose_name_plural = "Entradas do Odontograma"
        ordering = ["record", "tooth_number", "surface", "id"]
        constraints = [
            models.UniqueConstraint(
                fields=["tenant", "record", "tooth_number", "surface"],
                name="uq_dental_odontogram_tooth_surface_tenant",
            ),
        ]
        indexes = [
            models.Index(fields=["tenant", "record"]),
            models.Index(fields=["tenant", "tooth_number"]),
            models.Index(fields=["tenant", "condition"]),
        ]

    def clean(self):
        super().clean()
        _validate_same_tenant(self, "odontogram")
        _validate_same_tenant(self, "record")
        _validate_same_tenant(self, "procedure")
        if (
            self.odontogram_id
            and self.record_id
            and self.odontogram.record_id
            and self.odontogram.record_id != self.record_id
        ):
            raise ValidationError({"odontogram": "O mapa odontológico deve pertencer ao mesmo prontuário."})
        _validate_tooth_number(self.tooth_number)

    def save(self, *args, **kwargs):
        _propagate_tenant_from(self, "record")
        _propagate_tenant_from(self, "odontogram")
        self.full_clean()
        return super().save(*args, **kwargs)

    def __str__(self) -> str:
        return f"{self.tooth_number} {self.surface} - {self.condition}"


# Regista o diagnóstico odontológico associado à consulta ou ao dente.
class DentalDiagnosis(NoNameCoreModel):
    class Severity(models.TextChoices):
        LOW = "LOW", "Leve"
        MODERATE = "MODERATE", "Moderada"
        HIGH = "HIGH", "Grave"
        CRITICAL = "CRITICAL", "Crítica"

    prefix = "DDI"

    patient = models.ForeignKey(
        "clinical.Patient",
        verbose_name="Paciente",
        on_delete=models.PROTECT,
        related_name="dental_diagnoses",
        db_index=True,
    )
    consultation = models.ForeignKey(
        "odontologia.DentalConsultation",
        verbose_name="Atendimento dentário",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="diagnoses",
    )
    record = models.ForeignKey(
        "odontologia.DentalRecord",
        verbose_name="Prontuário dentário",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="diagnoses",
    )
    odontogram_entry = models.ForeignKey(
        "odontologia.DentalOdontogramEntry",
        verbose_name="Entrada do odontograma",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="diagnoses",
    )
    tooth_number = models.CharField("Dente relacionado", max_length=4, blank=True, default="", db_index=True)
    code = models.CharField("Código CID/interno", max_length=32, blank=True, default="", db_index=True)
    diagnosis = models.CharField("Diagnóstico", max_length=180)
    severity = models.CharField(
        "Gravidade",
        max_length=20,
        choices=Severity.choices,
        default=Severity.MODERATE,
        db_index=True,
    )
    responsible_dentist = models.ForeignKey(
        "recursos_humanos.Employee",
        verbose_name="Profissional responsável",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="dental_diagnoses",
        db_index=True,
    )
    diagnosed_at = models.DateTimeField("Diagnosticado em", default=timezone.now, db_index=True)
    notes = models.TextField("Observações", blank=True, default="")

    class Meta:
        db_table = "odontologia_diagnostico"
        verbose_name = "Diagnóstico Odontológico"
        verbose_name_plural = "Diagnósticos Odontológicos"
        ordering = ["-diagnosed_at", "-created_at"]
        indexes = [
            models.Index(fields=["tenant", "patient", "diagnosed_at"]),
            models.Index(fields=["tenant", "severity"]),
            models.Index(fields=["tenant", "code"]),
        ]

    def clean(self):
        super().clean()
        _validate_same_tenant(self, "patient")
        _validate_same_tenant(self, "consultation")
        _validate_same_tenant(self, "record")
        _validate_same_tenant(self, "odontogram_entry")
        _validate_same_tenant(self, "responsible_dentist")
        if self.consultation_id and self.patient_id and self.consultation.patient_id != self.patient_id:
            raise ValidationError({"consultation": "O atendimento dentário deve pertencer ao mesmo paciente."})
        if self.record_id and self.patient_id and self.record.patient_id != self.patient_id:
            raise ValidationError({"record": "O prontuário dentário deve pertencer ao mesmo paciente."})
        if self.odontogram_entry_id and self.patient_id and self.odontogram_entry.record.patient_id != self.patient_id:
            raise ValidationError({"odontogram_entry": "A entrada do odontograma deve pertencer ao mesmo paciente."})
        if self.tooth_number:
            _validate_tooth_number(self.tooth_number)

    def save(self, *args, **kwargs):
        _propagate_tenant_from(self, "patient")
        _propagate_tenant_from(self, "consultation")
        _propagate_tenant_from(self, "record")
        self.full_clean()
        return super().save(*args, **kwargs)

    def __str__(self) -> str:
        return self.diagnosis


# Define o plano de tratamento odontológico proposto ao paciente.
class DentalTreatmentPlan(NoNameCoreModel):
    class Status(models.TextChoices):
        DRAFT = "DRAFT", "Rascunho"
        PROPOSED = "PROPOSED", "Apresentado"
        PARTIALLY_APPROVED = "PARTIALLY_APPROVED", "Parcialmente aprovado"
        APPROVED = "APPROVED", "Aprovado"
        REJECTED = "REJECTED", "Rejeitado"
        PENDING_PAYMENT = "PENDING_PAYMENT", "Pagamento pendente"
        IN_PROGRESS = "IN_PROGRESS", "Em execução"
        SUSPENDED = "SUSPENDED", "Suspenso"
        WAITING_LAB = "WAITING_LAB", "Aguardando laboratório"
        WAITING_PATIENT = "WAITING_PATIENT", "Aguardando paciente"
        COMPLETED = "COMPLETED", "Concluído"
        CANCELLED = "CANCELLED", "Cancelado"
        ABANDONED = "ABANDONED", "Abandonado"

    class Priority(models.TextChoices):
        LOW = "LOW", "Baixa"
        NORMAL = "NORMAL", "Normal"
        HIGH = "HIGH", "Alta"
        URGENT = "URGENT", "Urgente"

    prefix = "DTP"

    patient = models.ForeignKey(
        "clinical.Patient",
        verbose_name="Paciente",
        on_delete=models.PROTECT,
        null=True,
        blank=True,
        related_name="dental_treatment_plans",
        db_index=True,
    )
    dentist = models.ForeignKey(
        "recursos_humanos.Employee",
        verbose_name="Dentista",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="dental_treatment_plans",
        db_index=True,
    )
    record = models.ForeignKey(
        "odontologia.DentalRecord",
        verbose_name="Prontuário dentário",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="treatment_plans",
    )
    title = models.CharField("Título", max_length=160)
    status = models.CharField("Estado", max_length=20, choices=Status.choices, default=Status.DRAFT, db_index=True)
    priority = models.CharField(
        "Prioridade",
        max_length=20,
        choices=Priority.choices,
        default=Priority.NORMAL,
        db_index=True,
    )
    objectives = models.TextField("Objetivos", blank=True, default="")
    planned_start = models.DateField("Início previsto", null=True, blank=True, db_index=True)
    planned_end = models.DateField("Fim previsto", null=True, blank=True, db_index=True)
    approved_at = models.DateTimeField("Aprovado em", null=True, blank=True)
    estimated_total = models.DecimalField(
        "Total estimado",
        max_digits=12,
        decimal_places=2,
        default=Decimal("0.00"),
        validators=[MinValueValidator(Decimal("0.00"))],
    )
    discount_amount = models.DecimalField(
        "Desconto",
        max_digits=12,
        decimal_places=2,
        default=Decimal("0.00"),
        validators=[MinValueValidator(Decimal("0.00"))],
    )
    approved_amount = models.DecimalField(
        "Valor aprovado",
        max_digits=12,
        decimal_places=2,
        default=Decimal("0.00"),
        validators=[MinValueValidator(Decimal("0.00"))],
    )
    requires_initial_payment = models.BooleanField("Exige sinal inicial", default=False, db_index=True)
    initial_payment_amount = models.DecimalField(
        "Valor do sinal inicial",
        max_digits=12,
        decimal_places=2,
        default=Decimal("0.00"),
        validators=[MinValueValidator(Decimal("0.00"))],
    )
    notes = models.TextField("Observações", blank=True, default="")

    class Meta:
        db_table = "odontologia_plano_tratamento"
        verbose_name = "Plano de Tratamento Dentário"
        verbose_name_plural = "Planos de Tratamento Dentário"
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["tenant", "patient", "status"]),
            models.Index(fields=["tenant", "status"]),
            models.Index(fields=["tenant", "dentist", "status"]),
            models.Index(fields=["tenant", "planned_start"]),
            models.Index(fields=["tenant", "priority", "status"]),
        ]

    def clean(self):
        super().clean()
        _validate_same_tenant(self, "patient")
        _validate_same_tenant(self, "dentist")
        _validate_same_tenant(self, "record")
        if self.record_id and self.patient_id and self.record.patient_id != self.patient_id:
            raise ValidationError({"record": "O prontuário dentário deve pertencer ao mesmo paciente."})
        if self.planned_end and self.planned_start and self.planned_end < self.planned_start:
            raise ValidationError({"planned_end": "O fim previsto não pode ser anterior ao início."})

    def save(self, *args, **kwargs):
        _propagate_tenant_from(self, "patient")
        _propagate_tenant_from(self, "record")
        self.full_clean()
        return super().save(*args, **kwargs)

    def __str__(self) -> str:
        return self.title


# Divide o tratamento dentário em fases clínicas e financeiras.
class DentalTreatmentPhase(ScopedPositionMixin, NoNameCoreModel):
    class PhaseType(models.TextChoices):
        EMERGENCY = "EMERGENCY", "Urgência"
        DISEASE_CONTROL = "DISEASE_CONTROL", "Controlo da doença"
        REHABILITATION = "REHABILITATION", "Reabilitação"
        AESTHETICS = "AESTHETICS", "Estética"
        MAINTENANCE = "MAINTENANCE", "Manutenção"
        OTHER = "OTHER", "Outra"

    class Status(models.TextChoices):
        PLANNED = "PLANNED", "Planeada"
        APPROVED = "APPROVED", "Aprovada"
        PENDING_PAYMENT = "PENDING_PAYMENT", "Pagamento pendente"
        IN_PROGRESS = "IN_PROGRESS", "Em execução"
        COMPLETED = "COMPLETED", "Concluída"
        CANCELLED = "CANCELLED", "Cancelada"

    prefix = "DPH"
    position_scope_fields = ("treatment_plan",)

    treatment_plan = models.ForeignKey(
        "odontologia.DentalTreatmentPlan",
        verbose_name="Plano de tratamento",
        on_delete=models.CASCADE,
        related_name="phases",
        db_index=True,
    )
    title = models.CharField("Fase", max_length=120)
    phase_type = models.CharField(
        "Tipo de fase", max_length=24, choices=PhaseType.choices, default=PhaseType.OTHER, db_index=True
    )
    status = models.CharField("Estado", max_length=24, choices=Status.choices, default=Status.PLANNED, db_index=True)
    planned_start = models.DateField("Início previsto", null=True, blank=True, db_index=True)
    planned_end = models.DateField("Fim previsto", null=True, blank=True, db_index=True)
    estimated_amount = models.DecimalField(
        "Valor estimado",
        max_digits=12,
        decimal_places=2,
        default=Decimal("0.00"),
        validators=[MinValueValidator(Decimal("0.00"))],
    )
    approved_amount = models.DecimalField(
        "Valor aprovado",
        max_digits=12,
        decimal_places=2,
        default=Decimal("0.00"),
        validators=[MinValueValidator(Decimal("0.00"))],
    )
    notes = models.TextField("Observações", blank=True, default="")

    class Meta:
        db_table = "odontologia_plano_tratamento_fase"
        verbose_name = "Fase do Plano Dentário"
        verbose_name_plural = "Fases do Plano Dentário"
        ordering = ["treatment_plan", "position", "id"]
        indexes = [
            models.Index(fields=["tenant", "treatment_plan", "status"]),
            models.Index(fields=["tenant", "phase_type"]),
        ]

    def clean(self):
        super().clean()
        _validate_same_tenant(self, "treatment_plan")
        if self.planned_end and self.planned_start and self.planned_end < self.planned_start:
            raise ValidationError({"planned_end": "O fim previsto não pode ser anterior ao início."})

    def save(self, *args, **kwargs):
        _propagate_tenant_from(self, "treatment_plan")
        self.full_clean()
        return super().save(*args, **kwargs)

    def __str__(self) -> str:
        return self.title


# Representa cada procedimento previsto dentro de um plano dentário.
class DentalTreatmentPlanItem(ScopedPositionMixin, NoNameCoreModel):
    class Status(models.TextChoices):
        PLANNED = "PLANNED", "Planeado"
        APPROVED = "APPROVED", "Aprovado"
        AUTHORIZED = "AUTHORIZED", "Autorizado"
        PENDING_PAYMENT = "PENDING_PAYMENT", "Pagamento pendente"
        SCHEDULED = "SCHEDULED", "Agendado"
        IN_PROGRESS = "IN_PROGRESS", "Em execução"
        COMPLETED = "COMPLETED", "Concluído"
        WAITING_PROSTHESIS_LAB = "WAITING_PROSTHESIS_LAB", "Aguardando laboratório de prótese"
        WAITING_IMAGING = "WAITING_IMAGING", "Aguardando imagem"
        CANCELLED = "CANCELLED", "Cancelado"
        POSTPONED = "POSTPONED", "Adiado"
        REFUNDED = "REFUNDED", "Reembolsado"

    class FinancialStatus(models.TextChoices):
        NOT_BILLED = "NOT_BILLED", "Não faturado"
        BILLED = "BILLED", "Faturado"
        PARTIALLY_PAID = "PARTIALLY_PAID", "Parcialmente pago"
        PAID = "PAID", "Pago"
        REFUNDED = "REFUNDED", "Reembolsado"

    prefix = "DTI"
    position_scope_fields = ("treatment_plan",)

    treatment_plan = models.ForeignKey(
        "odontologia.DentalTreatmentPlan",
        verbose_name="Plano de tratamento",
        on_delete=models.CASCADE,
        related_name="items",
        db_index=True,
    )
    phase = models.ForeignKey(
        "odontologia.DentalTreatmentPhase",
        verbose_name="Fase do plano",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="items",
    )
    procedure = models.ForeignKey(
        "odontologia.DentalProcedure",
        verbose_name="Procedimento",
        on_delete=models.PROTECT,
        related_name="treatment_items",
        db_index=True,
    )
    appointment = models.ForeignKey(
        "odontologia.DentalAppointment",
        verbose_name="Consulta dentária",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="treatment_items",
    )
    tooth_number = models.CharField("Dente", max_length=4, blank=True, default="", db_index=True)
    surface = models.CharField("Face", max_length=8, blank=True, default="")
    status = models.CharField("Estado", max_length=24, choices=Status.choices, default=Status.PLANNED, db_index=True)
    financial_status = models.CharField(
        "Estado financeiro",
        max_length=20,
        choices=FinancialStatus.choices,
        default=FinancialStatus.NOT_BILLED,
        db_index=True,
    )
    scheduled_date = models.DateField("Data prevista", null=True, blank=True, db_index=True)
    completed_at = models.DateTimeField("Concluído em", null=True, blank=True)
    quantity = models.DecimalField(
        "Quantidade",
        max_digits=10,
        decimal_places=2,
        default=Decimal("1.00"),
        validators=[MinValueValidator(Decimal("0.01"))],
    )
    unit_price = models.DecimalField(
        "Preço unitário",
        max_digits=12,
        decimal_places=2,
        default=Decimal("0.00"),
        validators=[MinValueValidator(Decimal("0.00"))],
    )
    discount_amount = models.DecimalField(
        "Desconto",
        max_digits=12,
        decimal_places=2,
        default=Decimal("0.00"),
        validators=[MinValueValidator(Decimal("0.00"))],
    )
    lab_required = models.BooleanField("Requer laboratório", default=False, db_index=True)
    approved_at = models.DateTimeField("Aprovado em", null=True, blank=True)
    clinical_notes = models.TextField("Notas clínicas", blank=True, default="")

    class Meta:
        db_table = "odontologia_plano_tratamento_item"
        verbose_name = "Item do Plano Dentário"
        verbose_name_plural = "Itens do Plano Dentário"
        ordering = ["treatment_plan", "position", "id"]
        indexes = [
            models.Index(fields=["tenant", "treatment_plan"]),
            models.Index(fields=["tenant", "procedure"]),
            models.Index(fields=["tenant", "status"]),
            models.Index(fields=["tenant", "financial_status"]),
            models.Index(fields=["tenant", "scheduled_date"]),
        ]

    @property
    def total_price(self) -> Decimal:
        return (self.quantity or Decimal("0.00")) * (self.unit_price or Decimal("0.00"))

    @property
    def final_price(self) -> Decimal:
        total = self.total_price - (self.discount_amount or Decimal("0.00"))
        return total if total > Decimal("0.00") else Decimal("0.00")

    def clean(self):
        super().clean()
        _validate_same_tenant(self, "treatment_plan")
        _validate_same_tenant(self, "phase")
        _validate_same_tenant(self, "procedure")
        _validate_same_tenant(self, "appointment")
        if self.phase_id and self.treatment_plan_id and self.phase.treatment_plan_id != self.treatment_plan_id:
            raise ValidationError({"phase": "A fase deve pertencer ao mesmo plano dentário."})
        if self.tooth_number:
            _validate_tooth_number(self.tooth_number)

    def save(self, *args, **kwargs):
        _propagate_tenant_from(self, "treatment_plan")
        if self.procedure_id:
            if not self.unit_price or self.unit_price == Decimal("0.00"):
                self.unit_price = self.procedure.base_price
            if not self.lab_required:
                self.lab_required = self.procedure.requires_prosthesis_lab
        self.full_clean()
        return super().save(*args, **kwargs)

    def __str__(self) -> str:
        return f"{self.position}. {self.procedure}"


class DentalPatientTreatmentPlan(NoNameCoreModel):
    class Status(models.TextChoices):
        ACTIVE = "ACTIVE", "Válido"
        EXPIRED = "EXPIRED", "Expirado"
        CANCELLED = "CANCELLED", "Cancelado"

    prefix = "DPP"

    patient = models.ForeignKey(
        "clinical.Patient",
        verbose_name="Paciente",
        on_delete=models.PROTECT,
        related_name="dental_plan_assignments",
        db_index=True,
    )
    treatment_plan = models.ForeignKey(
        "odontologia.DentalTreatmentPlan",
        verbose_name="Plano dentário",
        on_delete=models.PROTECT,
        related_name="patient_assignments",
        db_index=True,
    )
    dentist = models.ForeignKey(
        "recursos_humanos.Employee",
        verbose_name="Dentista responsável",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="dental_patient_treatment_plans",
        db_index=True,
    )
    record = models.ForeignKey(
        "odontologia.DentalRecord",
        verbose_name="Prontuário dentário",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="patient_treatment_plans",
    )
    assigned_at = models.DateTimeField("Atribuído em", default=timezone.now, db_index=True)
    valid_from = models.DateField("Início da vigência", default=timezone.localdate, db_index=True)
    valid_until = models.DateField("Fim da vigência", null=True, blank=True, db_index=True)
    status = models.CharField("Estado", max_length=20, choices=Status.choices, default=Status.ACTIVE, db_index=True)
    notes = models.TextField("Observações", blank=True, default="")

    class Meta:
        db_table = "odontologia_plano_tratamento_paciente"
        verbose_name = "Paciente com Plano Dentário"
        verbose_name_plural = "Pacientes com Plano Dentário"
        ordering = ["-valid_from", "-created_at"]
        indexes = [
            models.Index(fields=["tenant", "patient", "status"]),
            models.Index(fields=["tenant", "treatment_plan", "status"]),
            models.Index(fields=["tenant", "valid_until"]),
        ]

    @property
    def is_valid(self) -> bool:
        return self.is_valid_on(timezone.localdate())

    @property
    def is_expired(self) -> bool:
        return self.is_expired_on(timezone.localdate())

    @property
    def validity_status(self) -> str:
        if self.is_valid:
            return "VALID"
        if self.is_expired:
            return "EXPIRED"
        return self.status

    def is_valid_on(self, date) -> bool:
        if self.status != self.Status.ACTIVE:
            return False
        if self.valid_from and self.valid_from > date:
            return False
        return not self.valid_until or self.valid_until >= date

    def is_expired_on(self, date) -> bool:
        return self.status == self.Status.EXPIRED or bool(self.valid_until and self.valid_until < date)

    def clean(self):
        super().clean()
        _validate_same_tenant(self, "patient")
        _validate_same_tenant(self, "treatment_plan")
        _validate_same_tenant(self, "dentist")
        _validate_same_tenant(self, "record")
        if self.record_id and self.patient_id and self.record.patient_id != self.patient_id:
            raise ValidationError({"record": "O prontuário dentário deve pertencer ao mesmo paciente."})
        if (
            self.treatment_plan_id
            and self.patient_id
            and self.treatment_plan.patient_id
            and self.treatment_plan.patient_id != self.patient_id
        ):
            raise ValidationError({"treatment_plan": "Este plano dentário legado pertence a outro paciente."})
        if self.valid_until and self.valid_from and self.valid_until < self.valid_from:
            raise ValidationError({"valid_until": "O fim da vigência não pode ser anterior ao início."})

    def save(self, *args, **kwargs):
        _propagate_tenant_from(self, "patient")
        self.full_clean()
        return super().save(*args, **kwargs)

    def __str__(self) -> str:
        return f"{self.patient} - {self.treatment_plan}"


# Gera a proposta financeira do tratamento antes da execução.
class DentalQuotation(NoNameCoreModel):
    class Status(models.TextChoices):
        DRAFT = "DRAFT", "Rascunho"
        ISSUED = "ISSUED", "Emitido"
        ACCEPTED = "ACCEPTED", "Aceite"
        REJECTED = "REJECTED", "Rejeitado"
        EXPIRED = "EXPIRED", "Expirado"
        CONVERTED_TO_INVOICE = "CONVERTED_TO_INVOICE", "Convertido em fatura"

    prefix = "DQT"

    treatment_plan = models.ForeignKey(
        "odontologia.DentalTreatmentPlan",
        verbose_name="Plano de tratamento",
        on_delete=models.CASCADE,
        related_name="quotations",
        db_index=True,
    )
    patient = models.ForeignKey(
        "clinical.Patient",
        verbose_name="Paciente",
        on_delete=models.PROTECT,
        related_name="dental_quotations",
        null=True,
        blank=True,
        db_index=True,
    )
    issued_by = models.ForeignKey(
        "recursos_humanos.Employee",
        verbose_name="Emitido por",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="issued_dental_quotations",
        db_index=True,
    )
    status = models.CharField("Estado", max_length=24, choices=Status.choices, default=Status.DRAFT, db_index=True)
    issued_at = models.DateTimeField("Emitido em", null=True, blank=True, db_index=True)
    valid_until = models.DateField("Válido até", null=True, blank=True, db_index=True)
    subtotal = models.DecimalField(
        "Subtotal",
        max_digits=12,
        decimal_places=2,
        default=Decimal("0.00"),
        validators=[MinValueValidator(Decimal("0.00"))],
    )
    discount_amount = models.DecimalField(
        "Desconto",
        max_digits=12,
        decimal_places=2,
        default=Decimal("0.00"),
        validators=[MinValueValidator(Decimal("0.00"))],
    )
    tax_amount = models.DecimalField(
        "IVA/Taxas",
        max_digits=12,
        decimal_places=2,
        default=Decimal("0.00"),
        validators=[MinValueValidator(Decimal("0.00"))],
    )
    total_amount = models.DecimalField(
        "Valor total",
        max_digits=12,
        decimal_places=2,
        default=Decimal("0.00"),
        validators=[MinValueValidator(Decimal("0.00"))],
    )
    payment_terms = models.TextField("Condições de pagamento", blank=True, default="")
    notes = models.TextField("Observações", blank=True, default="")

    class Meta:
        db_table = "odontologia_orcamento"
        verbose_name = "Orçamento Dentário"
        verbose_name_plural = "Orçamentos Dentários"
        ordering = ["-issued_at", "-created_at"]
        indexes = [
            models.Index(fields=["tenant", "treatment_plan", "status"]),
            models.Index(fields=["tenant", "patient", "status"]),
            models.Index(fields=["tenant", "valid_until"]),
        ]

    def clean(self):
        super().clean()
        _validate_same_tenant(self, "treatment_plan")
        _validate_same_tenant(self, "patient")
        _validate_same_tenant(self, "issued_by")
        if (
            self.patient_id
            and self.treatment_plan_id
            and self.treatment_plan.patient_id
            and self.treatment_plan.patient_id != self.patient_id
        ):
            raise ValidationError({"patient": "O paciente deve corresponder ao plano dentário."})

    def save(self, *args, **kwargs):
        _propagate_tenant_from(self, "treatment_plan")
        _propagate_tenant_from(self, "patient")
        if not self.patient_id and self.treatment_plan_id and self.treatment_plan.patient_id:
            self.patient_id = self.treatment_plan.patient_id
        if not self.subtotal and self.treatment_plan_id:
            self.subtotal = self.treatment_plan.estimated_total
        if not self.total_amount:
            self.total_amount = max(
                (self.subtotal or Decimal("0.00"))
                - (self.discount_amount or Decimal("0.00"))
                + (self.tax_amount or Decimal("0.00")),
                Decimal("0.00"),
            )
        self.full_clean()
        return super().save(*args, **kwargs)

    def __str__(self) -> str:
        return self.custom_id or f"Orçamento dentário {self.pk}"


# Regista a aprovação clínica e financeira do plano pelo paciente.
class DentalApproval(NoNameCoreModel):
    class Scope(models.TextChoices):
        FULL_PLAN = "FULL_PLAN", "Plano completo"
        PARTIAL_ITEMS = "PARTIAL_ITEMS", "Itens selecionados"
        PHASE = "PHASE", "Fase do plano"
        PAYMENT_TERMS = "PAYMENT_TERMS", "Condições de pagamento"

    prefix = "DAP"

    treatment_plan = models.ForeignKey(
        "odontologia.DentalTreatmentPlan",
        verbose_name="Plano de tratamento",
        on_delete=models.CASCADE,
        related_name="approvals",
        db_index=True,
    )
    quotation = models.ForeignKey(
        "odontologia.DentalQuotation",
        verbose_name="Orçamento",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="approvals",
    )
    patient = models.ForeignKey(
        "clinical.Patient",
        verbose_name="Paciente",
        on_delete=models.PROTECT,
        related_name="dental_approvals",
        null=True,
        blank=True,
        db_index=True,
    )
    approved_by_name = models.CharField("Quem aprovou", max_length=160, blank=True, default="")
    approved_at = models.DateTimeField("Aprovado em", default=timezone.now, db_index=True)
    approval_scope = models.CharField("Escopo aprovado", max_length=20, choices=Scope.choices, default=Scope.FULL_PLAN)
    approved_amount = models.DecimalField(
        "Valor aprovado",
        max_digits=12,
        decimal_places=2,
        default=Decimal("0.00"),
        validators=[MinValueValidator(Decimal("0.00"))],
    )
    accepted_terms = models.TextField("Termos aceites", blank=True, default="")
    consent_signed = models.BooleanField("Consentimento assinado", default=False, db_index=True)
    consent_document_reference = models.CharField("Referência do consentimento", max_length=180, blank=True, default="")
    notes = models.TextField("Observações", blank=True, default="")

    class Meta:
        db_table = "odontologia_aprovacao"
        verbose_name = "Aprovação Dentária"
        verbose_name_plural = "Aprovações Dentárias"
        ordering = ["-approved_at", "-created_at"]
        indexes = [
            models.Index(fields=["tenant", "treatment_plan", "approved_at"]),
            models.Index(fields=["tenant", "patient", "approved_at"]),
            models.Index(fields=["tenant", "consent_signed"]),
        ]

    def clean(self):
        super().clean()
        _validate_same_tenant(self, "treatment_plan")
        _validate_same_tenant(self, "quotation")
        _validate_same_tenant(self, "patient")
        if self.quotation_id and self.treatment_plan_id and self.quotation.treatment_plan_id != self.treatment_plan_id:
            raise ValidationError({"quotation": "O orçamento deve pertencer ao mesmo plano dentário."})
        if (
            self.patient_id
            and self.treatment_plan_id
            and self.treatment_plan.patient_id
            and self.treatment_plan.patient_id != self.patient_id
        ):
            raise ValidationError({"patient": "O paciente deve corresponder ao plano dentário."})

    def save(self, *args, **kwargs):
        _propagate_tenant_from(self, "treatment_plan")
        _propagate_tenant_from(self, "patient")
        if not self.patient_id and self.treatment_plan_id and self.treatment_plan.patient_id:
            self.patient_id = self.treatment_plan.patient_id
        if not self.approved_amount and self.quotation_id:
            self.approved_amount = self.quotation.total_amount
        self.full_clean()
        return super().save(*args, **kwargs)

    def __str__(self) -> str:
        return self.custom_id or f"Aprovação dentária {self.pk}"


# Controla pagamentos associados aos planos e procedimentos dentários.
class DentalPayment(NoNameCoreModel):
    class PaymentKind(models.TextChoices):
        CONSULTATION = "CONSULTATION", "Consulta"
        DEPOSIT = "DEPOSIT", "Sinal"
        INSTALLMENT = "INSTALLMENT", "Prestação"
        PROCEDURE = "PROCEDURE", "Procedimento"
        LAB = "LAB", "Laboratório"
        OTHER = "OTHER", "Outro"

    class Status(models.TextChoices):
        PENDING = "PENDING", "Pendente"
        PARTIALLY_PAID = "PARTIALLY_PAID", "Parcialmente pago"
        PAID = "PAID", "Pago"
        OVERDUE = "OVERDUE", "Vencido"
        REFUNDED = "REFUNDED", "Reembolsado"
        CANCELLED = "CANCELLED", "Cancelado"

    prefix = "DPA"

    patient = models.ForeignKey(
        "clinical.Patient",
        verbose_name="Paciente",
        on_delete=models.PROTECT,
        related_name="dental_payments",
        db_index=True,
    )
    treatment_plan = models.ForeignKey(
        "odontologia.DentalTreatmentPlan",
        verbose_name="Plano de tratamento",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="dental_payments",
    )
    treatment_item = models.ForeignKey(
        "odontologia.DentalTreatmentPlanItem",
        verbose_name="Item do plano",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="dental_payments",
    )
    quotation = models.ForeignKey(
        "odontologia.DentalQuotation",
        verbose_name="Orçamento",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="dental_payments",
    )
    payment = models.ForeignKey(
        "pagamentos.Payment",
        verbose_name="Pagamento financeiro",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="dental_links",
    )
    payment_kind = models.CharField(
        "Tipo de pagamento", max_length=20, choices=PaymentKind.choices, default=PaymentKind.DEPOSIT, db_index=True
    )
    status = models.CharField("Estado", max_length=20, choices=Status.choices, default=Status.PENDING, db_index=True)
    due_date = models.DateField("Vencimento", null=True, blank=True, db_index=True)
    paid_at = models.DateTimeField("Pago em", null=True, blank=True, db_index=True)
    amount_due = models.DecimalField(
        "Valor devido",
        max_digits=12,
        decimal_places=2,
        default=Decimal("0.00"),
        validators=[MinValueValidator(Decimal("0.00"))],
    )
    amount_paid = models.DecimalField(
        "Valor pago",
        max_digits=12,
        decimal_places=2,
        default=Decimal("0.00"),
        validators=[MinValueValidator(Decimal("0.00"))],
    )
    method = models.CharField("Método", max_length=40, blank=True, default="")
    external_reference = models.CharField("Referência externa", max_length=120, blank=True, default="")
    notes = models.TextField("Observações", blank=True, default="")

    class Meta:
        db_table = "odontologia_pagamento"
        verbose_name = "Pagamento Dentário"
        verbose_name_plural = "Pagamentos Dentários"
        ordering = ["-due_date", "-created_at"]
        indexes = [
            models.Index(fields=["tenant", "patient", "status"]),
            models.Index(fields=["tenant", "treatment_plan", "status"]),
            models.Index(fields=["tenant", "due_date"]),
        ]

    @property
    def balance(self) -> Decimal:
        return (self.amount_due or Decimal("0.00")) - (self.amount_paid or Decimal("0.00"))

    def clean(self):
        super().clean()
        _validate_same_tenant(self, "patient")
        _validate_same_tenant(self, "treatment_plan")
        _validate_same_tenant(self, "treatment_item")
        _validate_same_tenant(self, "quotation")
        _validate_same_tenant(self, "payment")
        if (
            self.treatment_plan_id
            and self.patient_id
            and self.treatment_plan.patient_id
            and self.treatment_plan.patient_id != self.patient_id
        ):
            raise ValidationError({"treatment_plan": "O plano dentário deve pertencer ao mesmo paciente."})
        if (
            self.treatment_item_id
            and self.treatment_item.treatment_plan.patient_id
            and self.treatment_item.treatment_plan.patient_id != self.patient_id
        ):
            raise ValidationError({"treatment_item": "O item do plano deve pertencer ao mesmo paciente."})
        if self.quotation_id and self.treatment_plan_id and self.quotation.treatment_plan_id != self.treatment_plan_id:
            raise ValidationError({"quotation": "O orçamento deve pertencer ao mesmo plano dentário."})

    def save(self, *args, **kwargs):
        _propagate_tenant_from(self, "patient")
        _propagate_tenant_from(self, "treatment_plan")
        self.full_clean()
        return super().save(*args, **kwargs)

    def __str__(self) -> str:
        return self.custom_id or f"Pagamento dentário {self.pk}"


# Regista o procedimento odontológico executado no paciente.
class DentalProcedureExecution(NoNameCoreModel):
    class Status(models.TextChoices):
        SCHEDULED = "SCHEDULED", "Agendado"
        STARTED = "STARTED", "Iniciado"
        COMPLETED = "COMPLETED", "Concluído"
        FAILED = "FAILED", "Falhou"
        CANCELLED = "CANCELLED", "Cancelado"
        REQUIRES_FOLLOW_UP = "REQUIRES_FOLLOW_UP", "Requer acompanhamento"

    prefix = "DPE"

    patient = models.ForeignKey(
        "clinical.Patient",
        verbose_name="Paciente",
        on_delete=models.PROTECT,
        related_name="dental_procedure_executions",
        db_index=True,
    )
    consultation = models.ForeignKey(
        "odontologia.DentalConsultation",
        verbose_name="Atendimento dentário",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="procedure_executions",
    )
    treatment_plan = models.ForeignKey(
        "odontologia.DentalTreatmentPlan",
        verbose_name="Plano de tratamento",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="procedure_executions",
    )
    treatment_item = models.ForeignKey(
        "odontologia.DentalTreatmentPlanItem",
        verbose_name="Item do plano",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="procedure_executions",
    )
    appointment = models.ForeignKey(
        "odontologia.DentalAppointment",
        verbose_name="Marcação dentária",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="procedure_executions",
    )
    procedure = models.ForeignKey(
        "odontologia.DentalProcedure",
        verbose_name="Procedimento",
        on_delete=models.PROTECT,
        related_name="executions",
        db_index=True,
    )
    performed_by = models.ForeignKey(
        "recursos_humanos.Employee",
        verbose_name="Profissional executor",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="dental_procedure_executions",
        db_index=True,
    )
    tooth_number = models.CharField("Dente", max_length=4, blank=True, default="", db_index=True)
    surface = models.CharField("Face", max_length=8, blank=True, default="")
    status = models.CharField("Estado", max_length=24, choices=Status.choices, default=Status.SCHEDULED, db_index=True)
    scheduled_at = models.DateTimeField("Agendado para", null=True, blank=True, db_index=True)
    started_at = models.DateTimeField("Iniciado em", null=True, blank=True, db_index=True)
    performed_at = models.DateTimeField("Executado em", null=True, blank=True, db_index=True)
    materials_used = models.TextField("Materiais usados", blank=True, default="")
    anesthesia_used = models.TextField("Anestesia usada", blank=True, default="")
    clinical_notes = models.TextField("Notas clínicas", blank=True, default="")

    class Meta:
        db_table = "odontologia_procedimento_executado"
        verbose_name = "Procedimento Dentário Executado"
        verbose_name_plural = "Procedimentos Dentários Executados"
        ordering = ["-performed_at", "-scheduled_at", "-created_at"]
        indexes = [
            models.Index(fields=["tenant", "patient", "status"]),
            models.Index(fields=["tenant", "procedure", "status"]),
            models.Index(fields=["tenant", "performed_at"]),
        ]

    def clean(self):
        super().clean()
        _validate_same_tenant(self, "patient")
        _validate_same_tenant(self, "consultation")
        _validate_same_tenant(self, "treatment_plan")
        _validate_same_tenant(self, "treatment_item")
        _validate_same_tenant(self, "appointment")
        _validate_same_tenant(self, "procedure")
        _validate_same_tenant(self, "performed_by")
        if self.consultation_id and self.patient_id and self.consultation.patient_id != self.patient_id:
            raise ValidationError({"consultation": "O atendimento dentário deve pertencer ao mesmo paciente."})
        if (
            self.treatment_plan_id
            and self.patient_id
            and self.treatment_plan.patient_id
            and self.treatment_plan.patient_id != self.patient_id
        ):
            raise ValidationError({"treatment_plan": "O plano dentário deve pertencer ao mesmo paciente."})
        if (
            self.treatment_item_id
            and self.treatment_plan_id
            and self.treatment_item.treatment_plan_id != self.treatment_plan_id
        ):
            raise ValidationError({"treatment_item": "O item deve pertencer ao mesmo plano dentário."})
        if self.appointment_id and self.patient_id and self.appointment.patient_id != self.patient_id:
            raise ValidationError({"appointment": "A marcação dentária deve pertencer ao mesmo paciente."})
        if self.tooth_number:
            _validate_tooth_number(self.tooth_number)

    def save(self, *args, **kwargs):
        _propagate_tenant_from(self, "patient")
        _propagate_tenant_from(self, "consultation")
        _propagate_tenant_from(self, "treatment_plan")
        if not self.treatment_plan_id and self.treatment_item_id:
            self.treatment_plan_id = self.treatment_item.treatment_plan_id
        if not self.procedure_id and self.treatment_item_id:
            self.procedure_id = self.treatment_item.procedure_id
        self.full_clean()
        return super().save(*args, **kwargs)

    def __str__(self) -> str:
        return self.custom_id or f"Procedimento executado {self.pk}"


# Controla pedidos enviados ao laboratório de prótese dentária.
class DentalProsthesisLabOrder(NoNameCoreModel):
    class ProsthesisType(models.TextChoices):
        CROWN = "CROWN", "Coroa"
        BRIDGE = "BRIDGE", "Ponte"
        DENTURE = "DENTURE", "Prótese removível"
        IMPLANT = "IMPLANT", "Implante"
        ORTHODONTIC = "ORTHODONTIC", "Aparelho ortodôntico"
        OTHER = "OTHER", "Outro"

    class Status(models.TextChoices):
        CREATED = "CREATED", "Criado"
        REQUESTED = "REQUESTED", "Solicitado"
        SENT_TO_LAB = "SENT_TO_LAB", "Enviado ao laboratório"
        RECEIVED_BY_LAB = "RECEIVED_BY_LAB", "Recebido pelo laboratório"
        IN_PRODUCTION = "IN_PRODUCTION", "Em produção"
        READY_FOR_TRIAL = "READY_FOR_TRIAL", "Pronto para prova"
        NEEDS_ADJUSTMENT = "NEEDS_ADJUSTMENT", "Precisa de ajuste"
        READY_FOR_DELIVERY = "READY_FOR_DELIVERY", "Pronto para entrega"
        READY = "READY", "Pronto"
        RECEIVED = "RECEIVED", "Recebido"
        RETURNED = "RETURNED", "Devolvido"
        DELIVERED = "DELIVERED", "Entregue"
        DELIVERED_TO_PATIENT = "DELIVERED_TO_PATIENT", "Entregue ao paciente"
        INSTALLED = "INSTALLED", "Instalado"
        CANCELLED = "CANCELLED", "Cancelado"

    prefix = "DLO"

    patient = models.ForeignKey(
        "clinical.Patient",
        verbose_name="Paciente",
        on_delete=models.PROTECT,
        related_name="dental_lab_orders",
        db_index=True,
    )
    dentist = models.ForeignKey(
        "recursos_humanos.Employee",
        verbose_name="Dentista",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="dental_lab_orders",
        db_index=True,
    )
    treatment_item = models.ForeignKey(
        "odontologia.DentalTreatmentPlanItem",
        verbose_name="Item do plano",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="prosthesis_lab_orders",
    )
    procedure_execution = models.ForeignKey(
        "odontologia.DentalProcedureExecution",
        verbose_name="Procedimento executado",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="prosthesis_lab_orders",
    )
    lab_company = models.ForeignKey(
        "entidades.Company",
        verbose_name="Laboratório de prótese",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="dental_prosthesis_orders",
    )
    order_number = models.CharField("Número da ordem", max_length=40, blank=True, default="", db_index=True)
    prosthesis_type = models.CharField(
        "Tipo de prótese",
        max_length=20,
        choices=ProsthesisType.choices,
        default=ProsthesisType.CROWN,
        db_index=True,
    )
    status = models.CharField("Estado", max_length=24, choices=Status.choices, default=Status.REQUESTED, db_index=True)
    tooth_numbers = models.CharField("Dentes", max_length=80, blank=True, default="")
    shade = models.CharField("Cor/Escala", max_length=30, blank=True, default="")
    material = models.CharField("Material", max_length=80, blank=True, default="")
    impression_date = models.DateField("Data da moldagem", null=True, blank=True)
    sent_at = models.DateTimeField("Enviado em", null=True, blank=True)
    received_by_lab_at = models.DateTimeField("Recebido pelo laboratório em", null=True, blank=True)
    due_date = models.DateField("Previsão de entrega", null=True, blank=True, db_index=True)
    trial_at = models.DateTimeField("Prova em", null=True, blank=True)
    received_at = models.DateTimeField("Recebido em", null=True, blank=True)
    adjusted_at = models.DateTimeField("Ajustado em", null=True, blank=True)
    delivered_at = models.DateTimeField("Entregue em", null=True, blank=True)
    installed_at = models.DateTimeField("Instalado em", null=True, blank=True)
    lab_notes = models.TextField("Notas para o laboratório", blank=True, default="")
    cost = models.DecimalField(
        "Custo laboratorial",
        max_digits=12,
        decimal_places=2,
        default=Decimal("0.00"),
        validators=[MinValueValidator(Decimal("0.00"))],
    )
    patient_price = models.DecimalField(
        "Preço ao paciente",
        max_digits=12,
        decimal_places=2,
        default=Decimal("0.00"),
        validators=[MinValueValidator(Decimal("0.00"))],
    )

    class Meta:
        db_table = "odontologia_ordem_laboratorio_protese"
        verbose_name = "Ordem de Laboratório de Prótese"
        verbose_name_plural = "Ordens de Laboratório de Prótese"
        ordering = ["-created_at"]
        constraints = [
            models.UniqueConstraint(
                fields=["tenant", "order_number"],
                condition=~models.Q(order_number=""),
                name="uq_dental_lab_order_number_tenant",
            ),
        ]
        indexes = [
            models.Index(fields=["tenant", "patient", "status"]),
            models.Index(fields=["tenant", "lab_company", "status"]),
            models.Index(fields=["tenant", "due_date"]),
        ]

    def clean(self):
        super().clean()
        _validate_same_tenant(self, "patient")
        _validate_same_tenant(self, "dentist")
        _validate_same_tenant(self, "treatment_item")
        _validate_same_tenant(self, "procedure_execution")
        _validate_same_tenant(self, "lab_company")
        if (
            self.treatment_item_id
            and self.patient_id
            and self.treatment_item.treatment_plan.patient_id
            and self.treatment_item.treatment_plan.patient_id != self.patient_id
        ):
            raise ValidationError({"treatment_item": "O item do plano deve pertencer ao mesmo paciente."})
        if self.procedure_execution_id and self.patient_id and self.procedure_execution.patient_id != self.patient_id:
            raise ValidationError({"procedure_execution": "O procedimento executado deve pertencer ao mesmo paciente."})
        if self.received_by_lab_at and self.sent_at and self.received_by_lab_at < self.sent_at:
            raise ValidationError({"received_by_lab_at": "A recepção pelo laboratório não pode ser anterior ao envio."})
        if self.received_at and self.sent_at and self.received_at < self.sent_at:
            raise ValidationError({"received_at": "A recepção não pode ser anterior ao envio."})
        if self.delivered_at and self.received_at and self.delivered_at < self.received_at:
            raise ValidationError({"delivered_at": "A entrega não pode ser anterior à recepção."})
        if self.installed_at and self.delivered_at and self.installed_at < self.delivered_at:
            raise ValidationError({"installed_at": "A instalação não pode ser anterior à entrega."})

    def save(self, *args, **kwargs):
        _propagate_tenant_from(self, "patient")
        self.full_clean()
        return super().save(*args, **kwargs)

    def __str__(self) -> str:
        return self.order_number or self.custom_id or f"Ordem de prótese {self.pk}"


# Regista pedidos e resultados de imagem odontológica.
class DentalImagingOrder(NoNameCoreModel):
    class ImagingType(models.TextChoices):
        PERIAPICAL_XRAY = "PERIAPICAL_XRAY", "Radiografia periapical"
        PANORAMIC_XRAY = "PANORAMIC_XRAY", "Radiografia panorâmica"
        CEPHALOMETRY = "CEPHALOMETRY", "Cefalometria"
        CBCT = "CBCT", "Tomografia CBCT"
        INTRAORAL_PHOTO = "INTRAORAL_PHOTO", "Fotografia intraoral"
        INTRAORAL_SCAN = "INTRAORAL_SCAN", "Scanner intraoral"
        OTHER = "OTHER", "Outro"

    class Status(models.TextChoices):
        REQUESTED = "REQUESTED", "Solicitado"
        SCHEDULED = "SCHEDULED", "Agendado"
        ACQUIRED = "ACQUIRED", "Adquirido"
        REVIEWED = "REVIEWED", "Revisto"
        CANCELLED = "CANCELLED", "Cancelado"

    prefix = "DIM"

    patient = models.ForeignKey(
        "clinical.Patient",
        verbose_name="Paciente",
        on_delete=models.PROTECT,
        related_name="dental_imaging_orders",
        db_index=True,
    )
    dentist = models.ForeignKey(
        "recursos_humanos.Employee",
        verbose_name="Dentista solicitante",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="dental_imaging_orders",
        db_index=True,
    )
    consultation = models.ForeignKey(
        "odontologia.DentalConsultation",
        verbose_name="Atendimento dentário",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="imaging_orders",
    )
    record = models.ForeignKey(
        "odontologia.DentalRecord",
        verbose_name="Prontuário dentário",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="imaging_orders",
    )
    treatment_item = models.ForeignKey(
        "odontologia.DentalTreatmentPlanItem",
        verbose_name="Item do plano",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="imaging_orders",
    )
    procedure_execution = models.ForeignKey(
        "odontologia.DentalProcedureExecution",
        verbose_name="Procedimento executado",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="imaging_orders",
    )
    imaging_type = models.CharField(
        "Tipo de imagem", max_length=24, choices=ImagingType.choices, default=ImagingType.PERIAPICAL_XRAY, db_index=True
    )
    status = models.CharField("Estado", max_length=20, choices=Status.choices, default=Status.REQUESTED, db_index=True)
    requested_at = models.DateTimeField("Solicitado em", default=timezone.now, db_index=True)
    scheduled_at = models.DateTimeField("Agendado para", null=True, blank=True, db_index=True)
    acquired_at = models.DateTimeField("Adquirido em", null=True, blank=True, db_index=True)
    reviewed_at = models.DateTimeField("Revisto em", null=True, blank=True, db_index=True)
    clinical_indication = models.TextField("Indicação clínica", blank=True, default="")
    result_summary = models.TextField("Resumo do resultado", blank=True, default="")
    image_reference = models.CharField("Referência da imagem", max_length=255, blank=True, default="")
    notes = models.TextField("Observações", blank=True, default="")

    class Meta:
        db_table = "odontologia_imagem_pedido"
        verbose_name = "Pedido de Imagem Odontológica"
        verbose_name_plural = "Pedidos de Imagem Odontológica"
        ordering = ["-requested_at", "-created_at"]
        indexes = [
            models.Index(fields=["tenant", "patient", "requested_at"]),
            models.Index(fields=["tenant", "imaging_type", "status"]),
            models.Index(fields=["tenant", "status"]),
        ]

    def clean(self):
        super().clean()
        _validate_same_tenant(self, "patient")
        _validate_same_tenant(self, "dentist")
        _validate_same_tenant(self, "consultation")
        _validate_same_tenant(self, "record")
        _validate_same_tenant(self, "treatment_item")
        _validate_same_tenant(self, "procedure_execution")
        _validate_related_patient(self, "consultation")
        _validate_related_patient(self, "record")
        _validate_related_patient(self, "procedure_execution")

    def save(self, *args, **kwargs):
        _propagate_tenant_from(self, "patient")
        _propagate_tenant_from(self, "consultation")
        _propagate_tenant_from(self, "record")
        self.full_clean()
        return super().save(*args, **kwargs)

    def __str__(self) -> str:
        return self.custom_id or f"Imagem dentária {self.pk}"


# Regista prescrições emitidas no contexto odontológico.
class DentalPrescription(NoNameCoreModel):
    class Status(models.TextChoices):
        DRAFT = "DRAFT", "Rascunho"
        ISSUED = "ISSUED", "Emitida"
        DISPENSED = "DISPENSED", "Dispensada"
        CANCELLED = "CANCELLED", "Cancelada"

    prefix = "DPRX"

    patient = models.ForeignKey(
        "clinical.Patient",
        verbose_name="Paciente",
        on_delete=models.PROTECT,
        related_name="dental_prescriptions",
        db_index=True,
    )
    dentist = models.ForeignKey(
        "recursos_humanos.Employee",
        verbose_name="Dentista prescritor",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="dental_prescriptions",
        db_index=True,
    )
    consultation = models.ForeignKey(
        "odontologia.DentalConsultation",
        verbose_name="Atendimento dentário",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="prescriptions",
    )
    record = models.ForeignKey(
        "odontologia.DentalRecord",
        verbose_name="Prontuário dentário",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="prescriptions",
    )
    procedure_execution = models.ForeignKey(
        "odontologia.DentalProcedureExecution",
        verbose_name="Procedimento executado",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="prescriptions",
    )
    medication_product = models.ForeignKey(
        "farmacia.Product",
        verbose_name="Produto farmacêutico",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="dental_prescriptions",
    )
    medication = models.CharField("Medicamento", max_length=180)
    dose = models.CharField("Dose", max_length=120, blank=True, default="")
    frequency = models.CharField("Frequência", max_length=120, blank=True, default="")
    duration = models.CharField("Duração", max_length=120, blank=True, default="")
    instructions = models.TextField("Instruções", blank=True, default="")
    status = models.CharField("Estado", max_length=20, choices=Status.choices, default=Status.ISSUED, db_index=True)
    prescribed_at = models.DateTimeField("Prescrito em", default=timezone.now, db_index=True)
    notes = models.TextField("Observações", blank=True, default="")

    class Meta:
        db_table = "odontologia_prescricao"
        verbose_name = "Prescrição Odontológica"
        verbose_name_plural = "Prescrições Odontológicas"
        ordering = ["-prescribed_at", "-created_at"]
        indexes = [
            models.Index(fields=["tenant", "patient", "prescribed_at"]),
            models.Index(fields=["tenant", "status"]),
        ]

    def clean(self):
        super().clean()
        _validate_same_tenant(self, "patient")
        _validate_same_tenant(self, "dentist")
        _validate_same_tenant(self, "consultation")
        _validate_same_tenant(self, "record")
        _validate_same_tenant(self, "procedure_execution")
        _validate_same_tenant(self, "medication_product")
        _validate_related_patient(self, "consultation")
        _validate_related_patient(self, "record")
        _validate_related_patient(self, "procedure_execution")

    def save(self, *args, **kwargs):
        _propagate_tenant_from(self, "patient")
        _propagate_tenant_from(self, "consultation")
        _propagate_tenant_from(self, "record")
        if not self.medication and self.medication_product_id:
            self.medication = self.medication_product.name
        self.full_clean()
        return super().save(*args, **kwargs)

    def __str__(self) -> str:
        return self.medication


# Controla retornos e revisões após procedimentos dentários.
class DentalFollowUp(NoNameCoreModel):
    class Status(models.TextChoices):
        REQUIRED = "REQUIRED", "Necessário"
        SCHEDULED = "SCHEDULED", "Agendado"
        COMPLETED = "COMPLETED", "Concluído"
        MISSED = "MISSED", "Faltou"
        CANCELLED = "CANCELLED", "Cancelado"

    prefix = "DFU"

    patient = models.ForeignKey(
        "clinical.Patient",
        verbose_name="Paciente",
        on_delete=models.PROTECT,
        related_name="dental_followups",
        db_index=True,
    )
    procedure_execution = models.ForeignKey(
        "odontologia.DentalProcedureExecution",
        verbose_name="Procedimento executado",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="followups",
    )
    appointment = models.ForeignKey(
        "odontologia.DentalAppointment",
        verbose_name="Marcação dentária",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="followups",
    )
    treatment_plan = models.ForeignKey(
        "odontologia.DentalTreatmentPlan",
        verbose_name="Plano de tratamento",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="followups",
    )
    followup_reason = models.CharField("Motivo do retorno", max_length=180)
    status = models.CharField("Estado", max_length=20, choices=Status.choices, default=Status.REQUIRED, db_index=True)
    due_date = models.DateField("Data prevista", null=True, blank=True, db_index=True)
    completed_at = models.DateTimeField("Concluído em", null=True, blank=True, db_index=True)
    findings = models.TextField("Achados", blank=True, default="")
    notes = models.TextField("Observações", blank=True, default="")

    class Meta:
        db_table = "odontologia_followup"
        verbose_name = "Follow-up Dentário"
        verbose_name_plural = "Follow-ups Dentários"
        ordering = ["due_date", "-created_at"]
        indexes = [
            models.Index(fields=["tenant", "patient", "status"]),
            models.Index(fields=["tenant", "due_date"]),
        ]

    def clean(self):
        super().clean()
        _validate_same_tenant(self, "patient")
        _validate_same_tenant(self, "procedure_execution")
        _validate_same_tenant(self, "appointment")
        _validate_same_tenant(self, "treatment_plan")
        _validate_related_patient(self, "procedure_execution")
        _validate_related_patient(self, "appointment")
        if (
            self.treatment_plan_id
            and self.patient_id
            and self.treatment_plan.patient_id
            and self.treatment_plan.patient_id != self.patient_id
        ):
            raise ValidationError({"treatment_plan": "O plano dentário deve pertencer ao mesmo paciente."})

    def save(self, *args, **kwargs):
        _propagate_tenant_from(self, "patient")
        _propagate_tenant_from(self, "procedure_execution")
        _propagate_tenant_from(self, "appointment")
        self.full_clean()
        return super().save(*args, **kwargs)

    def __str__(self) -> str:
        return self.followup_reason


# Regista consumo de materiais odontológicos durante procedimentos.
class DentalMaterialConsumption(NoNameCoreModel):
    prefix = "DMC"

    procedure_execution = models.ForeignKey(
        "odontologia.DentalProcedureExecution",
        verbose_name="Procedimento executado",
        on_delete=models.CASCADE,
        related_name="material_consumptions",
        db_index=True,
    )
    product = models.ForeignKey(
        "farmacia.Product",
        verbose_name="Produto de farmácia",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="dental_material_consumptions",
    )
    warehouse_item = models.ForeignKey(
        "warehouse.WarehouseItem",
        verbose_name="Item de armazém",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="dental_material_consumptions",
    )
    inventory_movement = models.ForeignKey(
        "farmacia.InventoryMovement",
        verbose_name="Movimento de stock",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="dental_material_consumptions",
    )
    material_name = models.CharField("Material", max_length=180)
    quantity = models.DecimalField(
        "Quantidade",
        max_digits=10,
        decimal_places=2,
        default=Decimal("1.00"),
        validators=[MinValueValidator(Decimal("0.01"))],
    )
    unit_cost = models.DecimalField(
        "Custo unitário",
        max_digits=12,
        decimal_places=2,
        default=Decimal("0.00"),
        validators=[MinValueValidator(Decimal("0.00"))],
    )
    consumed_at = models.DateTimeField("Consumido em", default=timezone.now, db_index=True)
    notes = models.TextField("Observações", blank=True, default="")

    class Meta:
        db_table = "odontologia_consumo_material"
        verbose_name = "Consumo de Material Dentário"
        verbose_name_plural = "Consumos de Material Dentário"
        ordering = ["-consumed_at", "-created_at"]
        indexes = [
            models.Index(fields=["tenant", "procedure_execution", "consumed_at"]),
            models.Index(fields=["tenant", "material_name"]),
        ]

    @property
    def total_cost(self) -> Decimal:
        return (self.quantity or Decimal("0.00")) * (self.unit_cost or Decimal("0.00"))

    def clean(self):
        super().clean()
        _validate_same_tenant(self, "procedure_execution")
        _validate_same_tenant(self, "product")
        _validate_same_tenant(self, "warehouse_item")
        _validate_same_tenant(self, "inventory_movement")

    def save(self, *args, **kwargs):
        _propagate_tenant_from(self, "procedure_execution")
        if not self.material_name:
            if self.product_id:
                self.material_name = self.product.name
            elif self.warehouse_item_id:
                self.material_name = self.warehouse_item.name
        self.full_clean()
        return super().save(*args, **kwargs)

    def __str__(self) -> str:
        return self.material_name


# Regista a evolução clínica do plano ou procedimento odontológico.
class DentalClinicalEvolution(NoNameCoreModel):
    prefix = "DEV"

    patient = models.ForeignKey(
        "clinical.Patient",
        verbose_name="Paciente",
        on_delete=models.PROTECT,
        related_name="dental_evolutions",
        db_index=True,
    )
    record = models.ForeignKey(
        "odontologia.DentalRecord",
        verbose_name="Prontuário dentário",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="evolutions",
    )
    consultation = models.ForeignKey(
        "odontologia.DentalConsultation",
        verbose_name="Atendimento dentário",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="evolutions",
    )
    procedure_execution = models.ForeignKey(
        "odontologia.DentalProcedureExecution",
        verbose_name="Procedimento executado",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="evolutions",
    )
    treatment_plan = models.ForeignKey(
        "odontologia.DentalTreatmentPlan",
        verbose_name="Plano de tratamento",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="evolutions",
    )
    dentist = models.ForeignKey(
        "recursos_humanos.Employee",
        verbose_name="Dentista",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="dental_evolutions",
        db_index=True,
    )
    evolved_at = models.DateTimeField("Evolução em", default=timezone.now, db_index=True)
    summary = models.TextField("Evolução clínica")
    next_steps = models.TextField("Próximos passos", blank=True, default="")
    notes = models.TextField("Observações", blank=True, default="")

    class Meta:
        db_table = "odontologia_evolucao_clinica"
        verbose_name = "Evolução Clínica Dentária"
        verbose_name_plural = "Evoluções Clínicas Dentárias"
        ordering = ["-evolved_at", "-created_at"]
        indexes = [
            models.Index(fields=["tenant", "patient", "evolved_at"]),
            models.Index(fields=["tenant", "dentist", "evolved_at"]),
        ]

    def clean(self):
        super().clean()
        _validate_same_tenant(self, "patient")
        _validate_same_tenant(self, "record")
        _validate_same_tenant(self, "consultation")
        _validate_same_tenant(self, "procedure_execution")
        _validate_same_tenant(self, "treatment_plan")
        _validate_same_tenant(self, "dentist")
        _validate_related_patient(self, "record")
        _validate_related_patient(self, "consultation")
        _validate_related_patient(self, "procedure_execution")
        if (
            self.treatment_plan_id
            and self.patient_id
            and self.treatment_plan.patient_id
            and self.treatment_plan.patient_id != self.patient_id
        ):
            raise ValidationError({"treatment_plan": "O plano dentário deve pertencer ao mesmo paciente."})

    def save(self, *args, **kwargs):
        _propagate_tenant_from(self, "patient")
        _propagate_tenant_from(self, "record")
        _propagate_tenant_from(self, "consultation")
        self.full_clean()
        return super().save(*args, **kwargs)

    def __str__(self) -> str:
        return self.custom_id or f"Evolução dentária {self.pk}"


# Guarda consentimentos, imagens e documentos externos do fluxo dentário.
class DentalDocument(NoNameCoreModel):
    class DocumentType(models.TextChoices):
        CONSENT = "CONSENT", "Consentimento"
        PHOTO = "PHOTO", "Fotografia"
        RADIOGRAPH = "RADIOGRAPH", "Radiografia"
        EXTERNAL = "EXTERNAL", "Documento externo"
        CONTRACT = "CONTRACT", "Contrato"
        OTHER = "OTHER", "Outro"

    prefix = "DDOC"

    patient = models.ForeignKey(
        "clinical.Patient",
        verbose_name="Paciente",
        on_delete=models.PROTECT,
        related_name="dental_documents",
        db_index=True,
    )
    consultation = models.ForeignKey(
        "odontologia.DentalConsultation",
        verbose_name="Atendimento dentário",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="documents",
    )
    record = models.ForeignKey(
        "odontologia.DentalRecord",
        verbose_name="Prontuário dentário",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="documents",
    )
    treatment_plan = models.ForeignKey(
        "odontologia.DentalTreatmentPlan",
        verbose_name="Plano de tratamento",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="documents",
    )
    document_type = models.CharField(
        "Tipo de documento", max_length=20, choices=DocumentType.choices, default=DocumentType.OTHER, db_index=True
    )
    title = models.CharField("Título", max_length=180)
    file_reference = models.CharField("Referência do ficheiro", max_length=255, blank=True, default="")
    signed = models.BooleanField("Assinado", default=False, db_index=True)
    signed_at = models.DateTimeField("Assinado em", null=True, blank=True, db_index=True)
    notes = models.TextField("Observações", blank=True, default="")

    class Meta:
        db_table = "odontologia_documento"
        verbose_name = "Documento Dentário"
        verbose_name_plural = "Documentos Dentários"
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["tenant", "patient", "document_type"]),
            models.Index(fields=["tenant", "signed"]),
        ]

    def clean(self):
        super().clean()
        _validate_same_tenant(self, "patient")
        _validate_same_tenant(self, "consultation")
        _validate_same_tenant(self, "record")
        _validate_same_tenant(self, "treatment_plan")
        _validate_related_patient(self, "consultation")
        _validate_related_patient(self, "record")
        if (
            self.treatment_plan_id
            and self.patient_id
            and self.treatment_plan.patient_id
            and self.treatment_plan.patient_id != self.patient_id
        ):
            raise ValidationError({"treatment_plan": "O plano dentário deve pertencer ao mesmo paciente."})

    def save(self, *args, **kwargs):
        _propagate_tenant_from(self, "patient")
        _propagate_tenant_from(self, "consultation")
        _propagate_tenant_from(self, "record")
        self.full_clean()
        return super().save(*args, **kwargs)

    def __str__(self) -> str:
        return self.title


# Regista eventos operacionais auditáveis do sector de odontologia.
class DentalAuditEvent(NoNameCoreModel):
    prefix = "DAU"

    patient = models.ForeignKey(
        "clinical.Patient",
        verbose_name="Paciente",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="dental_audit_events",
        db_index=True,
    )
    treatment_plan = models.ForeignKey(
        "odontologia.DentalTreatmentPlan",
        verbose_name="Plano de tratamento",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="audit_events",
    )
    event_type = models.CharField("Tipo de evento", max_length=80, db_index=True)
    actor_name = models.CharField("Responsável", max_length=160, blank=True, default="")
    event_at = models.DateTimeField("Evento em", default=timezone.now, db_index=True)
    summary = models.TextField("Resumo")
    metadata = models.JSONField("Metadados", blank=True, default=dict)

    class Meta:
        db_table = "odontologia_auditoria_evento"
        verbose_name = "Evento de Auditoria Dentária"
        verbose_name_plural = "Eventos de Auditoria Dentária"
        ordering = ["-event_at", "-created_at"]
        indexes = [
            models.Index(fields=["tenant", "event_type", "event_at"]),
            models.Index(fields=["tenant", "patient", "event_at"]),
        ]

    def clean(self):
        super().clean()
        _validate_same_tenant(self, "patient")
        _validate_same_tenant(self, "treatment_plan")
        if (
            self.treatment_plan_id
            and self.patient_id
            and self.treatment_plan.patient_id
            and self.treatment_plan.patient_id != self.patient_id
        ):
            raise ValidationError({"treatment_plan": "O plano dentário deve pertencer ao mesmo paciente."})

    def save(self, *args, **kwargs):
        _propagate_tenant_from(self, "patient")
        _propagate_tenant_from(self, "treatment_plan")
        self.full_clean()
        return super().save(*args, **kwargs)

    def __str__(self) -> str:
        return f"{self.event_type} - {self.event_at:%Y-%m-%d}"


# Cria itens faturáveis a partir dos procedimentos odontológicos.
class DentalBillingItem(NoNameCoreModel):
    class Status(models.TextChoices):
        DRAFT = "DRAFT", "Rascunho"
        BILLABLE = "BILLABLE", "Faturável"
        BILLED = "BILLED", "Faturado"
        PAID = "PAID", "Pago"
        CANCELLED = "CANCELLED", "Cancelado"
        REFUNDED = "REFUNDED", "Reembolsado"

    prefix = "DBI"

    patient = models.ForeignKey(
        "clinical.Patient",
        verbose_name="Paciente",
        on_delete=models.PROTECT,
        related_name="dental_billing_items",
        db_index=True,
    )
    treatment_plan = models.ForeignKey(
        "odontologia.DentalTreatmentPlan",
        verbose_name="Plano de tratamento",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="billing_items",
    )
    treatment_item = models.ForeignKey(
        "odontologia.DentalTreatmentPlanItem",
        verbose_name="Item do plano",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="billing_items",
    )
    procedure_execution = models.ForeignKey(
        "odontologia.DentalProcedureExecution",
        verbose_name="Procedimento executado",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="billing_items",
    )
    quotation = models.ForeignKey(
        "odontologia.DentalQuotation",
        verbose_name="Orçamento",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="billing_items",
    )
    invoice = models.ForeignKey(
        "faturamento.Invoice",
        verbose_name="Fatura",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="dental_billing_items",
    )
    invoice_item = models.ForeignKey(
        "faturamento.InvoiceItem",
        verbose_name="Item de fatura",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="dental_billing_items",
    )
    status = models.CharField("Estado", max_length=20, choices=Status.choices, default=Status.BILLABLE, db_index=True)
    description = models.CharField("Descrição", max_length=255)
    quantity = models.DecimalField(
        "Quantidade",
        max_digits=10,
        decimal_places=2,
        default=Decimal("1.00"),
        validators=[MinValueValidator(Decimal("0.01"))],
    )
    unit_price = models.DecimalField(
        "Preço unitário",
        max_digits=12,
        decimal_places=2,
        default=Decimal("0.00"),
        validators=[MinValueValidator(Decimal("0.00"))],
    )
    discount_amount = models.DecimalField(
        "Desconto",
        max_digits=12,
        decimal_places=2,
        default=Decimal("0.00"),
        validators=[MinValueValidator(Decimal("0.00"))],
    )
    tax_amount = models.DecimalField(
        "IVA/Taxas",
        max_digits=12,
        decimal_places=2,
        default=Decimal("0.00"),
        validators=[MinValueValidator(Decimal("0.00"))],
    )
    billable_at = models.DateTimeField("Faturável em", default=timezone.now, db_index=True)
    billed_at = models.DateTimeField("Faturado em", null=True, blank=True, db_index=True)
    notes = models.TextField("Observações", blank=True, default="")

    class Meta:
        db_table = "odontologia_faturamento_item"
        verbose_name = "Item Faturável Dentário"
        verbose_name_plural = "Itens Faturáveis Dentários"
        ordering = ["-billable_at", "-created_at"]
        indexes = [
            models.Index(fields=["tenant", "patient", "status"]),
            models.Index(fields=["tenant", "treatment_plan", "status"]),
            models.Index(fields=["tenant", "billable_at"]),
        ]

    @property
    def total_amount(self) -> Decimal:
        total = (
            (self.quantity or Decimal("0.00")) * (self.unit_price or Decimal("0.00"))
            - (self.discount_amount or Decimal("0.00"))
            + (self.tax_amount or Decimal("0.00"))
        )
        return total if total > Decimal("0.00") else Decimal("0.00")

    def clean(self):
        super().clean()
        _validate_same_tenant(self, "patient")
        _validate_same_tenant(self, "treatment_plan")
        _validate_same_tenant(self, "treatment_item")
        _validate_same_tenant(self, "procedure_execution")
        _validate_same_tenant(self, "quotation")
        _validate_same_tenant(self, "invoice")
        _validate_same_tenant(self, "invoice_item")
        _validate_related_patient(self, "procedure_execution")
        if (
            self.treatment_plan_id
            and self.patient_id
            and self.treatment_plan.patient_id
            and self.treatment_plan.patient_id != self.patient_id
        ):
            raise ValidationError({"treatment_plan": "O plano dentário deve pertencer ao mesmo paciente."})
        if (
            self.treatment_item_id
            and self.treatment_plan_id
            and self.treatment_item.treatment_plan_id != self.treatment_plan_id
        ):
            raise ValidationError({"treatment_item": "O item deve pertencer ao mesmo plano dentário."})
        if self.quotation_id and self.treatment_plan_id and self.quotation.treatment_plan_id != self.treatment_plan_id:
            raise ValidationError({"quotation": "O orçamento deve pertencer ao mesmo plano dentário."})

    def save(self, *args, **kwargs):
        _propagate_tenant_from(self, "patient")
        _propagate_tenant_from(self, "treatment_plan")
        _propagate_tenant_from(self, "procedure_execution")
        if not self.description:
            if self.treatment_item_id:
                self.description = str(self.treatment_item.procedure)
            elif self.procedure_execution_id:
                self.description = str(self.procedure_execution.procedure)
        if not self.unit_price and self.treatment_item_id:
            self.unit_price = self.treatment_item.unit_price
        self.full_clean()
        return super().save(*args, **kwargs)

    def __str__(self) -> str:
        return self.description


# Resume a situação do paciente dentro dos planos dentários ativos.
class PatientDentalPlanSummary(NoNameCoreModel):
    prefix = "DPS"

    patient = models.ForeignKey(
        "clinical.Patient",
        verbose_name="Paciente",
        on_delete=models.PROTECT,
        related_name="dental_plan_summaries",
        db_index=True,
    )
    active_plan = models.ForeignKey(
        "odontologia.DentalTreatmentPlan",
        verbose_name="Plano ativo",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="patient_summaries",
    )
    next_appointment = models.ForeignKey(
        "odontologia.DentalAppointment",
        verbose_name="Próxima consulta",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="patient_plan_summaries",
    )
    plan_status = models.CharField("Estado do plano", max_length=24, blank=True, default="", db_index=True)
    total_planned_amount = models.DecimalField(
        "Total planeado",
        max_digits=12,
        decimal_places=2,
        default=Decimal("0.00"),
        validators=[MinValueValidator(Decimal("0.00"))],
    )
    total_paid = models.DecimalField(
        "Total pago",
        max_digits=12,
        decimal_places=2,
        default=Decimal("0.00"),
        validators=[MinValueValidator(Decimal("0.00"))],
    )
    balance_amount = models.DecimalField(
        "Saldo",
        max_digits=12,
        decimal_places=2,
        default=Decimal("0.00"),
    )
    completed_items = models.PositiveIntegerField("Itens concluídos", default=0)
    pending_items = models.PositiveIntegerField("Itens pendentes", default=0)
    generated_at = models.DateTimeField("Gerado em", default=timezone.now, db_index=True)
    notes = models.TextField("Observações", blank=True, default="")

    class Meta:
        db_table = "odontologia_resumo_plano_paciente"
        verbose_name = "Resumo do Plano Dentário do Paciente"
        verbose_name_plural = "Resumos dos Planos Dentários dos Pacientes"
        ordering = ["-generated_at", "-created_at"]
        indexes = [
            models.Index(fields=["tenant", "patient", "plan_status"]),
            models.Index(fields=["tenant", "generated_at"]),
        ]

    def clean(self):
        super().clean()
        _validate_same_tenant(self, "patient")
        _validate_same_tenant(self, "active_plan")
        _validate_same_tenant(self, "next_appointment")
        if (
            self.active_plan_id
            and self.patient_id
            and self.active_plan.patient_id
            and self.active_plan.patient_id != self.patient_id
        ):
            raise ValidationError({"active_plan": "O plano ativo deve pertencer ao mesmo paciente."})
        if self.next_appointment_id and self.patient_id and self.next_appointment.patient_id != self.patient_id:
            raise ValidationError({"next_appointment": "A próxima consulta deve pertencer ao mesmo paciente."})

    def save(self, *args, **kwargs):
        _propagate_tenant_from(self, "patient")
        _propagate_tenant_from(self, "active_plan")
        if not self.plan_status and self.active_plan_id:
            self.plan_status = self.active_plan.status
        self.balance_amount = (self.total_planned_amount or Decimal("0.00")) - (self.total_paid or Decimal("0.00"))
        self.full_clean()
        return super().save(*args, **kwargs)

    def __str__(self) -> str:
        return f"{self.patient} - {self.plan_status or 'sem plano'}"


def build_patient_dental_history(record: DentalRecord) -> str:
    if not record.patient_id:
        return ""

    previous_records = list(_previous_dental_records(record))
    treatment_plans = list(_previous_treatment_plans(record))
    if not previous_records and not treatment_plans:
        return ""

    sections: list[str] = []
    if previous_records:
        record_lines: list[str] = []
        for previous_record in previous_records:
            record_lines.extend(_format_previous_record(previous_record))
        sections.append("Consultas e prontuários anteriores:\n" + "\n".join(record_lines))

    if treatment_plans:
        treatment_lines: list[str] = []
        for treatment_plan in treatment_plans:
            treatment_lines.extend(_format_previous_treatment_plan(treatment_plan))
        sections.append("Tratamentos anteriores:\n" + "\n".join(treatment_lines))

    return f"{DENTAL_HISTORY_AUTO_MARKER}\n\n" + "\n\n".join(sections)


def _previous_dental_records(record: DentalRecord):
    opened_at = record.opened_at or timezone.now()
    queryset = DentalRecord.objects.select_related("dentist", "appointment").filter(patient_id=record.patient_id)

    if record.tenant_id:
        queryset = queryset.filter(tenant_id=record.tenant_id)
    if record.pk:
        queryset = queryset.exclude(pk=record.pk)

    return queryset.filter(opened_at__lt=opened_at).order_by("-opened_at", "-created_at")[:MAX_DENTAL_HISTORY_RECORDS]


def _previous_treatment_plans(record: DentalRecord):
    opened_at = record.opened_at or timezone.now()
    opened_date = _as_local_date(opened_at)
    item_queryset = DentalTreatmentPlanItem.objects.select_related("procedure", "appointment").order_by(
        "position", "id"
    )
    assignment_plan_ids = DentalPatientTreatmentPlan.objects.filter(patient_id=record.patient_id)
    if record.tenant_id:
        assignment_plan_ids = assignment_plan_ids.filter(tenant_id=record.tenant_id)
    assignment_plan_ids = assignment_plan_ids.filter(
        models.Q(valid_from__lte=opened_date) | models.Q(assigned_at__lt=opened_at)
    ).values("treatment_plan_id")
    queryset = (
        DentalTreatmentPlan.objects.select_related("dentist", "record")
        .prefetch_related(models.Prefetch("items", queryset=item_queryset))
        .filter(models.Q(patient_id=record.patient_id) | models.Q(id__in=assignment_plan_ids))
    )

    if record.tenant_id:
        queryset = queryset.filter(tenant_id=record.tenant_id)
    if record.pk:
        queryset = queryset.exclude(record_id=record.pk)

    return (
        queryset.filter(
            models.Q(record__opened_at__lt=opened_at)
            | models.Q(planned_start__lte=opened_date)
            | models.Q(planned_start__isnull=True, created_at__lt=opened_at)
            | models.Q(
                patient_assignments__patient_id=record.patient_id, patient_assignments__valid_from__lte=opened_date
            )
        )
        .distinct()
        .order_by("-planned_start", "-created_at")[:MAX_DENTAL_HISTORY_TREATMENT_PLANS]
    )


def _format_previous_record(record: DentalRecord) -> list[str]:
    dental_history = (record.dental_history or "").strip()
    if dental_history.startswith(DENTAL_HISTORY_AUTO_MARKER):
        dental_history = ""

    return [
        f"- Abertura: {_format_datetime(record.opened_at)}",
        f"  Dentista: {_related_label(record.dentist)}",
        f"  Consulta dentária: {_related_label(record.appointment)}",
        f"  Fecho: {_format_datetime(record.closed_at)}",
        f"  Estado: {_status_label(record)}",
        f"  Queixa principal: {_text_value(record.chief_complaint)}",
        f"  Histórico dentário: {_text_value(dental_history)}",
        f"  Diagnóstico dentário: {_text_value(record.diagnosis)}",
        f"  Resumo do tratamento: {_text_value(record.treatment_summary)}",
        f"  Observações: {_text_value(record.notes)}",
    ]


def _format_previous_treatment_plan(plan: DentalTreatmentPlan) -> list[str]:
    lines = [
        f"- Plano: {_text_value(plan.title)}",
        f"  Dentista: {_related_label(plan.dentist)}",
        f"  Prontuário dentário: {_related_label(plan.record)}",
        f"  Estado: {_status_label(plan)}",
        f"  Início previsto: {_format_date(plan.planned_start)}",
        f"  Fim previsto: {_format_date(plan.planned_end)}",
        f"  Objetivos: {_text_value(plan.objectives)}",
        f"  Observações: {_text_value(plan.notes)}",
    ]

    items = list(plan.items.all())
    if not items:
        return lines

    lines.append("  Itens do tratamento:")
    for item in items[:10]:
        procedure = _related_label(item.procedure)
        tooth = _text_value(item.tooth_number)
        surface = _text_value(item.surface)
        appointment = _related_label(item.appointment)
        lines.append(
            "    - "
            f"{procedure}; Dente: {tooth}; Face: {surface}; Estado: {_status_label(item)}; "
            f"Data prevista: {_format_date(item.scheduled_date)}; Concluído em: {_format_datetime(item.completed_at)}; "
            f"Consulta dentária: {appointment}; Notas clínicas: {_text_value(item.clinical_notes)}"
        )
    if len(items) > 10:
        lines.append(f"    - +{len(items) - 10} item(ns) adicionais.")
    return lines


def _as_local_date(value):
    if timezone.is_aware(value):
        return timezone.localtime(value).date()
    return value.date()


def _format_datetime(value) -> str:
    if not value:
        return "-"
    if timezone.is_aware(value):
        value = timezone.localtime(value)
    return value.strftime("%Y-%m-%d %H:%M")


def _format_date(value) -> str:
    if not value:
        return "-"
    return value.isoformat()


def _related_label(value) -> str:
    if not value:
        return "-"
    for field_name in ("name", "title", "custom_id", "code"):
        field_value = getattr(value, field_name, None)
        if field_value:
            return str(field_value)
    return str(value)


def _status_label(value) -> str:
    if not value:
        return "-"
    if hasattr(value, "get_status_display"):
        return value.get_status_display()
    return _text_value(getattr(value, "status", ""))


def _text_value(value) -> str:
    text = str(value or "").strip()
    if not text:
        return "-"
    return text.replace("\r\n", "\n").replace("\r", "\n").replace("\n", "\n    ")


def _propagate_tenant_from(instance: NoNameCoreModel, field_name: str) -> None:
    if instance.tenant_id:
        return
    related = getattr(instance, field_name, None)
    if related is not None and getattr(related, "tenant_id", None):
        instance.tenant_id = related.tenant_id


def _validate_same_tenant(instance: NoNameCoreModel, field_name: str) -> None:
    related_id = getattr(instance, f"{field_name}_id", None)
    if not related_id or not instance.tenant_id:
        return
    related = getattr(instance, field_name, None)
    if related is not None and getattr(related, "tenant_id", None) != instance.tenant_id:
        raise ValidationError({field_name: "O registo relacionado deve pertencer ao mesmo tenant."})


def _validate_related_patient(instance: NoNameCoreModel, field_name: str) -> None:
    related_id = getattr(instance, f"{field_name}_id", None)
    if not related_id or not getattr(instance, "patient_id", None):
        return
    related = getattr(instance, field_name, None)
    related_patient_id = getattr(related, "patient_id", None)
    if related_patient_id and related_patient_id != instance.patient_id:
        raise ValidationError({field_name: "O registo relacionado deve pertencer ao mesmo paciente."})


def _validate_tooth_number(value: str) -> None:
    normalized = (value or "").strip()
    if not normalized:
        raise ValidationError({"tooth_number": "Informe o número do dente."})

    permanent = {f"{quadrant}{tooth}" for quadrant in range(1, 5) for tooth in range(1, 9)}
    deciduous = {f"{quadrant}{tooth}" for quadrant in range(5, 9) for tooth in range(1, 6)}
    if normalized not in permanent and normalized not in deciduous:
        raise ValidationError({"tooth_number": "Use a numeração dentária FDI, como 11, 26, 48 ou 75."})
