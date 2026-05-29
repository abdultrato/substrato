from __future__ import annotations

from decimal import Decimal

from django.core.exceptions import ValidationError
from django.core.validators import MinValueValidator
from django.db import models
from django.utils import timezone

from core.mixins.model.position import ScopedPositionMixin
from core.models.base import CoreModel, NoNameCoreModel


class AnimalSpecies(models.TextChoices):
    ALL = "ALL", "Todas"
    DOG = "DOG", "Canina"
    CAT = "CAT", "Felina"
    BIRD = "BIRD", "Ave"
    RABBIT = "RABBIT", "Coelho"
    RUMINANT = "RUMINANT", "Ruminante"
    EQUINE = "EQUINE", "Equina"
    SWINE = "SWINE", "Suína"
    REPTILE = "REPTILE", "Réptil"
    OTHER = "OTHER", "Outra"


class VeterinaryAnimal(CoreModel):
    class Sex(models.TextChoices):
        MALE = "MALE", "Macho"
        FEMALE = "FEMALE", "Fêmea"
        UNKNOWN = "UNKNOWN", "Não informado"

    class Status(models.TextChoices):
        ACTIVE = "ACTIVE", "Ativo"
        INACTIVE = "INACTIVE", "Inativo"
        DECEASED = "DECEASED", "Óbito"
        TRANSFERRED = "TRANSFERRED", "Transferido"

    prefix = "VAN"

    species = models.CharField("Espécie", max_length=16, choices=AnimalSpecies.choices, default=AnimalSpecies.DOG, db_index=True)
    breed = models.CharField("Raça", max_length=120, blank=True, default="", db_index=True)
    sex = models.CharField("Sexo", max_length=12, choices=Sex.choices, default=Sex.UNKNOWN, db_index=True)
    birth_date = models.DateField("Data de nascimento", null=True, blank=True, db_index=True)
    color = models.CharField("Cor/Pelagem", max_length=80, blank=True, default="")
    microchip_number = models.CharField("Microchip", max_length=80, blank=True, default="", db_index=True)
    owner_name = models.CharField("Tutor/Responsável", max_length=160, db_index=True)
    owner_phone = models.CharField("Contacto do tutor", max_length=40, blank=True, default="")
    owner_email = models.EmailField("E-mail do tutor", blank=True, default="")
    status = models.CharField("Estado", max_length=16, choices=Status.choices, default=Status.ACTIVE, db_index=True)
    allergies = models.TextField("Alergias", blank=True, default="")
    notes = models.TextField("Observações", blank=True, default="")

    class Meta:
        db_table = "veterinaria_animal"
        verbose_name = "Animal / Paciente Veterinário"
        verbose_name_plural = "Animais / Pacientes Veterinários"
        ordering = ["name", "owner_name"]
        constraints = [
            models.UniqueConstraint(
                fields=["tenant", "microchip_number"],
                condition=~models.Q(microchip_number=""),
                name="uq_vet_animal_microchip_tenant",
            ),
        ]
        indexes = [
            models.Index(fields=["tenant", "species"]),
            models.Index(fields=["tenant", "owner_name"]),
            models.Index(fields=["tenant", "status"]),
        ]

    def clean(self):
        super().clean()
        if not (self.owner_name or "").strip():
            raise ValidationError({"owner_name": "Informe o tutor/responsável."})

    def __str__(self) -> str:
        return f"{self.name} - {self.owner_name}"


class VeterinaryAppointment(NoNameCoreModel):
    class Status(models.TextChoices):
        SCHEDULED = "SCHEDULED", "Agendada"
        CONFIRMED = "CONFIRMED", "Confirmada"
        CHECKED_IN = "CHECKED_IN", "Presente"
        IN_PROGRESS = "IN_PROGRESS", "Em atendimento"
        COMPLETED = "COMPLETED", "Concluída"
        CANCELLED = "CANCELLED", "Cancelada"
        NO_SHOW = "NO_SHOW", "Faltou"

    prefix = "VAG"

    animal = models.ForeignKey(
        "veterinaria.VeterinaryAnimal",
        verbose_name="Animal",
        on_delete=models.PROTECT,
        related_name="appointments",
        db_index=True,
    )
    veterinarian = models.ForeignKey(
        "recursos_humanos.Employee",
        verbose_name="Veterinário",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="veterinary_appointments",
        db_index=True,
    )
    scheduled_start = models.DateTimeField("Início agendado", db_index=True)
    scheduled_end = models.DateTimeField("Fim agendado", null=True, blank=True, db_index=True)
    status = models.CharField("Estado", max_length=20, choices=Status.choices, default=Status.SCHEDULED, db_index=True)
    reason = models.CharField("Motivo", max_length=180, blank=True, default="")
    room = models.CharField("Sala/Gabinete", max_length=80, blank=True, default="")
    triage_notes = models.TextField("Notas de triagem", blank=True, default="")
    notes = models.TextField("Observações", blank=True, default="")

    class Meta:
        db_table = "veterinaria_agenda"
        verbose_name = "Consulta Veterinária"
        verbose_name_plural = "Consultas Veterinárias"
        ordering = ["-scheduled_start", "-created_at"]
        indexes = [
            models.Index(fields=["tenant", "animal", "scheduled_start"]),
            models.Index(fields=["tenant", "veterinarian", "scheduled_start"]),
            models.Index(fields=["tenant", "status", "scheduled_start"]),
        ]

    def clean(self):
        super().clean()
        _validate_same_tenant(self, "animal")
        _validate_same_tenant(self, "veterinarian")
        if self.scheduled_end and self.scheduled_start and self.scheduled_end <= self.scheduled_start:
            raise ValidationError({"scheduled_end": "O fim deve ser posterior ao início agendado."})

    def save(self, *args, **kwargs):
        _propagate_tenant_from(self, "animal")
        self.full_clean()
        return super().save(*args, **kwargs)

    def __str__(self) -> str:
        return self.custom_id or f"Consulta veterinária {self.pk}"


class VeterinaryMedicalRecord(NoNameCoreModel):
    class Status(models.TextChoices):
        DRAFT = "DRAFT", "Rascunho"
        ACTIVE = "ACTIVE", "Ativo"
        FINALIZED = "FINALIZED", "Finalizado"
        CANCELLED = "CANCELLED", "Cancelado"

    prefix = "VRE"

    animal = models.ForeignKey(
        "veterinaria.VeterinaryAnimal",
        verbose_name="Animal",
        on_delete=models.PROTECT,
        related_name="medical_records",
        db_index=True,
    )
    veterinarian = models.ForeignKey(
        "recursos_humanos.Employee",
        verbose_name="Veterinário",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="veterinary_records",
        db_index=True,
    )
    appointment = models.ForeignKey(
        "veterinaria.VeterinaryAppointment",
        verbose_name="Consulta veterinária",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="medical_records",
    )
    opened_at = models.DateTimeField("Abertura", default=timezone.now, db_index=True)
    closed_at = models.DateTimeField("Fecho", null=True, blank=True, db_index=True)
    status = models.CharField("Estado", max_length=20, choices=Status.choices, default=Status.DRAFT, db_index=True)
    weight_kg = models.DecimalField("Peso (kg)", max_digits=7, decimal_places=2, null=True, blank=True)
    temperature_c = models.DecimalField("Temperatura (°C)", max_digits=5, decimal_places=2, null=True, blank=True)
    heart_rate_bpm = models.PositiveSmallIntegerField("Frequência cardíaca", null=True, blank=True)
    respiratory_rate_bpm = models.PositiveSmallIntegerField("Frequência respiratória", null=True, blank=True)
    anamnesis = models.TextField("Anamnese", blank=True, default="")
    symptoms = models.TextField("Sintomas", blank=True, default="")
    diagnosis = models.TextField("Diagnóstico", blank=True, default="")
    treatment_plan = models.TextField("Plano terapêutico", blank=True, default="")
    prescription_notes = models.TextField("Notas de receita", blank=True, default="")
    notes = models.TextField("Observações", blank=True, default="")

    class Meta:
        db_table = "veterinaria_prontuario"
        verbose_name = "Prontuário Veterinário"
        verbose_name_plural = "Prontuários Veterinários"
        ordering = ["-opened_at", "-created_at"]
        indexes = [
            models.Index(fields=["tenant", "animal", "opened_at"]),
            models.Index(fields=["tenant", "veterinarian", "opened_at"]),
            models.Index(fields=["tenant", "status", "opened_at"]),
        ]

    def clean(self):
        super().clean()
        _validate_same_tenant(self, "animal")
        _validate_same_tenant(self, "veterinarian")
        _validate_same_tenant(self, "appointment")
        if self.appointment_id and self.animal_id and self.appointment.animal_id != self.animal_id:
            raise ValidationError({"appointment": "A consulta deve pertencer ao mesmo animal."})
        if self.closed_at and self.opened_at and self.closed_at < self.opened_at:
            raise ValidationError({"closed_at": "O fecho não pode ser anterior à abertura."})

    def save(self, *args, **kwargs):
        _propagate_tenant_from(self, "animal")
        self.full_clean()
        return super().save(*args, **kwargs)

    def __str__(self) -> str:
        return self.custom_id or f"Prontuário veterinário {self.pk}"


class VeterinaryVaccine(CoreModel):
    prefix = "VVX"

    species = models.CharField("Espécie alvo", max_length=16, choices=AnimalSpecies.choices, default=AnimalSpecies.ALL, db_index=True)
    disease = models.CharField("Doença/Proteção", max_length=140, db_index=True)
    manufacturer = models.CharField("Fabricante", max_length=120, blank=True, default="")
    default_interval_days = models.PositiveSmallIntegerField("Intervalo padrão (dias)", null=True, blank=True)
    active = models.BooleanField("Ativa", default=True, db_index=True)
    notes = models.TextField("Observações", blank=True, default="")

    class Meta:
        db_table = "veterinaria_vacina"
        verbose_name = "Vacina Veterinária"
        verbose_name_plural = "Vacinas Veterinárias"
        ordering = ["name", "species"]
        indexes = [
            models.Index(fields=["tenant", "species"]),
            models.Index(fields=["tenant", "disease"]),
            models.Index(fields=["tenant", "active"]),
        ]

    def __str__(self) -> str:
        return self.name


class VeterinaryVaccination(NoNameCoreModel):
    class Status(models.TextChoices):
        SCHEDULED = "SCHEDULED", "Agendada"
        APPLIED = "APPLIED", "Aplicada"
        OVERDUE = "OVERDUE", "Em atraso"
        CANCELLED = "CANCELLED", "Cancelada"

    prefix = "VVC"

    animal = models.ForeignKey(
        "veterinaria.VeterinaryAnimal",
        verbose_name="Animal",
        on_delete=models.PROTECT,
        related_name="vaccinations",
        db_index=True,
    )
    vaccine = models.ForeignKey(
        "veterinaria.VeterinaryVaccine",
        verbose_name="Vacina",
        on_delete=models.PROTECT,
        related_name="applications",
        db_index=True,
    )
    veterinarian = models.ForeignKey(
        "recursos_humanos.Employee",
        verbose_name="Veterinário",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="veterinary_vaccinations",
    )
    status = models.CharField("Estado", max_length=16, choices=Status.choices, default=Status.SCHEDULED, db_index=True)
    scheduled_for = models.DateTimeField("Agendada para", null=True, blank=True, db_index=True)
    administered_at = models.DateTimeField("Aplicada em", null=True, blank=True, db_index=True)
    next_due_date = models.DateField("Próxima dose", null=True, blank=True, db_index=True)
    lot_number = models.CharField("Lote", max_length=80, blank=True, default="")
    adverse_reaction = models.TextField("Reação adversa", blank=True, default="")
    notes = models.TextField("Observações", blank=True, default="")

    class Meta:
        db_table = "veterinaria_vacinacao"
        verbose_name = "Vacinação Veterinária"
        verbose_name_plural = "Vacinações Veterinárias"
        ordering = ["-administered_at", "-scheduled_for", "-created_at"]
        indexes = [
            models.Index(fields=["tenant", "animal", "status"]),
            models.Index(fields=["tenant", "vaccine", "status"]),
            models.Index(fields=["tenant", "next_due_date"]),
        ]

    def clean(self):
        super().clean()
        _validate_same_tenant(self, "animal")
        _validate_same_tenant(self, "vaccine")
        _validate_same_tenant(self, "veterinarian")
        if self.vaccine_id and self.animal_id:
            _validate_species_compatibility(self.vaccine.species, self.animal.species, "vaccine")
        if self.next_due_date and self.administered_at and self.next_due_date < self.administered_at.date():
            raise ValidationError({"next_due_date": "A próxima dose não pode ser anterior à aplicação."})

    def save(self, *args, **kwargs):
        _propagate_tenant_from(self, "animal")
        self.full_clean()
        return super().save(*args, **kwargs)

    def __str__(self) -> str:
        return f"{self.animal} - {self.vaccine}"


class VeterinaryLabExam(CoreModel):
    class SampleType(models.TextChoices):
        BLOOD = "BLOOD", "Sangue"
        URINE = "URINE", "Urina"
        FECES = "FECES", "Fezes"
        SWAB = "SWAB", "Swab"
        TISSUE = "TISSUE", "Tecido"
        IMAGING = "IMAGING", "Imagem"
        OTHER = "OTHER", "Outro"

    prefix = "VEX"

    code = models.CharField("Código", max_length=32, db_index=True)
    species = models.CharField("Espécie alvo", max_length=16, choices=AnimalSpecies.choices, default=AnimalSpecies.ALL, db_index=True)
    sample_type = models.CharField("Tipo de amostra", max_length=16, choices=SampleType.choices, default=SampleType.BLOOD, db_index=True)
    turnaround_hours = models.PositiveSmallIntegerField("Prazo padrão (horas)", default=24)
    active = models.BooleanField("Ativo", default=True, db_index=True)
    notes = models.TextField("Observações", blank=True, default="")

    class Meta:
        db_table = "veterinaria_exame_laboratorial"
        verbose_name = "Exame Laboratorial Veterinário"
        verbose_name_plural = "Exames Laboratoriais Veterinários"
        ordering = ["name", "code"]
        constraints = [
            models.UniqueConstraint(fields=["tenant", "code"], name="uq_vet_lab_exam_code_tenant"),
        ]
        indexes = [
            models.Index(fields=["tenant", "species"]),
            models.Index(fields=["tenant", "sample_type"]),
            models.Index(fields=["tenant", "active"]),
        ]

    def __str__(self) -> str:
        return f"{self.code} - {self.name}" if self.code else self.name


class VeterinaryLabRequest(NoNameCoreModel):
    class Priority(models.TextChoices):
        ROUTINE = "ROUTINE", "Rotina"
        URGENT = "URGENT", "Urgente"
        EMERGENCY = "EMERGENCY", "Emergência"

    class Status(models.TextChoices):
        REQUESTED = "REQUESTED", "Solicitada"
        COLLECTED = "COLLECTED", "Amostra colhida"
        PROCESSING = "PROCESSING", "Em processamento"
        COMPLETED = "COMPLETED", "Concluída"
        CANCELLED = "CANCELLED", "Cancelada"

    prefix = "VLR"

    animal = models.ForeignKey(
        "veterinaria.VeterinaryAnimal",
        verbose_name="Animal",
        on_delete=models.PROTECT,
        related_name="lab_requests",
        db_index=True,
    )
    veterinarian = models.ForeignKey(
        "recursos_humanos.Employee",
        verbose_name="Veterinário",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="veterinary_lab_requests",
    )
    appointment = models.ForeignKey(
        "veterinaria.VeterinaryAppointment",
        verbose_name="Consulta veterinária",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="lab_requests",
    )
    record = models.ForeignKey(
        "veterinaria.VeterinaryMedicalRecord",
        verbose_name="Prontuário veterinário",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="lab_requests",
    )
    requested_at = models.DateTimeField("Solicitada em", default=timezone.now, db_index=True)
    priority = models.CharField("Prioridade", max_length=16, choices=Priority.choices, default=Priority.ROUTINE, db_index=True)
    status = models.CharField("Estado", max_length=16, choices=Status.choices, default=Status.REQUESTED, db_index=True)
    clinical_notes = models.TextField("Notas clínicas", blank=True, default="")
    notes = models.TextField("Observações", blank=True, default="")

    class Meta:
        db_table = "veterinaria_requisicao_laboratorial"
        verbose_name = "Requisição Laboratorial Veterinária"
        verbose_name_plural = "Requisições Laboratoriais Veterinárias"
        ordering = ["-requested_at", "-created_at"]
        indexes = [
            models.Index(fields=["tenant", "animal", "requested_at"]),
            models.Index(fields=["tenant", "priority", "status"]),
            models.Index(fields=["tenant", "status", "requested_at"]),
        ]

    def clean(self):
        super().clean()
        _validate_same_tenant(self, "animal")
        _validate_same_tenant(self, "veterinarian")
        _validate_same_tenant(self, "appointment")
        _validate_same_tenant(self, "record")
        if self.appointment_id and self.animal_id and self.appointment.animal_id != self.animal_id:
            raise ValidationError({"appointment": "A consulta deve pertencer ao mesmo animal."})
        if self.record_id and self.animal_id and self.record.animal_id != self.animal_id:
            raise ValidationError({"record": "O prontuário deve pertencer ao mesmo animal."})

    def save(self, *args, **kwargs):
        _propagate_tenant_from(self, "animal")
        self.full_clean()
        return super().save(*args, **kwargs)

    def __str__(self) -> str:
        return self.custom_id or f"Requisição veterinária {self.pk}"


class VeterinaryLabRequestItem(ScopedPositionMixin, NoNameCoreModel):
    class Status(models.TextChoices):
        REQUESTED = "REQUESTED", "Solicitado"
        COLLECTED = "COLLECTED", "Colhido"
        PROCESSING = "PROCESSING", "Em processamento"
        RESULTED = "RESULTED", "Com resultado"
        CANCELLED = "CANCELLED", "Cancelado"

    prefix = "VLI"
    position_scope_fields = ("request",)

    request = models.ForeignKey(
        "veterinaria.VeterinaryLabRequest",
        verbose_name="Requisição",
        on_delete=models.CASCADE,
        related_name="items",
        db_index=True,
    )
    exam = models.ForeignKey(
        "veterinaria.VeterinaryLabExam",
        verbose_name="Exame",
        on_delete=models.PROTECT,
        related_name="request_items",
        db_index=True,
    )
    sample_identifier = models.CharField("Identificador da amostra", max_length=80, blank=True, default="", db_index=True)
    status = models.CharField("Estado", max_length=16, choices=Status.choices, default=Status.REQUESTED, db_index=True)
    collected_at = models.DateTimeField("Colhido em", null=True, blank=True)
    resulted_at = models.DateTimeField("Resultado em", null=True, blank=True, db_index=True)
    result_summary = models.TextField("Resumo do resultado", blank=True, default="")
    result_value = models.CharField("Valor/Resultado", max_length=120, blank=True, default="")
    reference_range = models.CharField("Referência", max_length=120, blank=True, default="")
    notes = models.TextField("Observações", blank=True, default="")

    class Meta:
        db_table = "veterinaria_requisicao_laboratorial_item"
        verbose_name = "Item de Requisição Laboratorial Veterinária"
        verbose_name_plural = "Itens de Requisição Laboratorial Veterinária"
        ordering = ["request", "position", "id"]
        indexes = [
            models.Index(fields=["tenant", "request"]),
            models.Index(fields=["tenant", "exam"]),
            models.Index(fields=["tenant", "status"]),
            models.Index(fields=["tenant", "resulted_at"]),
        ]

    def clean(self):
        super().clean()
        _validate_same_tenant(self, "request")
        _validate_same_tenant(self, "exam")
        if self.request_id and self.exam_id:
            _validate_species_compatibility(self.exam.species, self.request.animal.species, "exam")

    def save(self, *args, **kwargs):
        _propagate_tenant_from(self, "request")
        self.full_clean()
        return super().save(*args, **kwargs)

    def __str__(self) -> str:
        return f"{self.position}. {self.exam}"


class VeterinaryAdmission(NoNameCoreModel):
    class Status(models.TextChoices):
        ADMITTED = "ADMITTED", "Internado"
        OBSERVATION = "OBSERVATION", "Observação"
        DISCHARGED = "DISCHARGED", "Alta"
        TRANSFERRED = "TRANSFERRED", "Transferido"
        DECEASED = "DECEASED", "Óbito"
        CANCELLED = "CANCELLED", "Cancelado"

    prefix = "VAD"

    animal = models.ForeignKey(
        "veterinaria.VeterinaryAnimal",
        verbose_name="Animal",
        on_delete=models.PROTECT,
        related_name="admissions",
        db_index=True,
    )
    veterinarian = models.ForeignKey(
        "recursos_humanos.Employee",
        verbose_name="Veterinário",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="veterinary_admissions",
    )
    appointment = models.ForeignKey(
        "veterinaria.VeterinaryAppointment",
        verbose_name="Consulta veterinária",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="admissions",
    )
    admitted_at = models.DateTimeField("Internado em", default=timezone.now, db_index=True)
    discharged_at = models.DateTimeField("Alta em", null=True, blank=True, db_index=True)
    status = models.CharField("Estado", max_length=16, choices=Status.choices, default=Status.ADMITTED, db_index=True)
    ward = models.CharField("Enfermaria/Setor", max_length=80, blank=True, default="")
    cage = models.CharField("Box/Gaiola", max_length=60, blank=True, default="")
    reason = models.TextField("Motivo", blank=True, default="")
    diagnosis = models.TextField("Diagnóstico", blank=True, default="")
    care_plan = models.TextField("Plano de cuidados", blank=True, default="")
    discharge_summary = models.TextField("Resumo de alta", blank=True, default="")
    notes = models.TextField("Observações", blank=True, default="")

    class Meta:
        db_table = "veterinaria_internamento"
        verbose_name = "Internamento Veterinário"
        verbose_name_plural = "Internamentos Veterinários"
        ordering = ["-admitted_at", "-created_at"]
        indexes = [
            models.Index(fields=["tenant", "animal", "admitted_at"]),
            models.Index(fields=["tenant", "status", "admitted_at"]),
            models.Index(fields=["tenant", "ward", "status"]),
        ]

    def clean(self):
        super().clean()
        _validate_same_tenant(self, "animal")
        _validate_same_tenant(self, "veterinarian")
        _validate_same_tenant(self, "appointment")
        if self.appointment_id and self.animal_id and self.appointment.animal_id != self.animal_id:
            raise ValidationError({"appointment": "A consulta deve pertencer ao mesmo animal."})
        if self.discharged_at and self.admitted_at and self.discharged_at < self.admitted_at:
            raise ValidationError({"discharged_at": "A alta não pode ser anterior ao internamento."})

    def save(self, *args, **kwargs):
        _propagate_tenant_from(self, "animal")
        self.full_clean()
        return super().save(*args, **kwargs)

    def __str__(self) -> str:
        return self.custom_id or f"Internamento veterinário {self.pk}"


class VeterinaryPrescription(NoNameCoreModel):
    class Status(models.TextChoices):
        DRAFT = "DRAFT", "Rascunho"
        ACTIVE = "ACTIVE", "Ativa"
        COMPLETED = "COMPLETED", "Concluída"
        CANCELLED = "CANCELLED", "Cancelada"

    prefix = "VPR"

    animal = models.ForeignKey(
        "veterinaria.VeterinaryAnimal",
        verbose_name="Animal",
        on_delete=models.PROTECT,
        related_name="prescriptions",
        db_index=True,
    )
    record = models.ForeignKey(
        "veterinaria.VeterinaryMedicalRecord",
        verbose_name="Prontuário veterinário",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="prescriptions",
    )
    veterinarian = models.ForeignKey(
        "recursos_humanos.Employee",
        verbose_name="Veterinário",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="veterinary_prescriptions",
    )
    issued_at = models.DateTimeField("Emitida em", default=timezone.now, db_index=True)
    status = models.CharField("Estado", max_length=16, choices=Status.choices, default=Status.DRAFT, db_index=True)
    instructions = models.TextField("Instruções gerais", blank=True, default="")
    notes = models.TextField("Observações", blank=True, default="")

    class Meta:
        db_table = "veterinaria_receita"
        verbose_name = "Receita Veterinária"
        verbose_name_plural = "Receitas Veterinárias"
        ordering = ["-issued_at", "-created_at"]
        indexes = [
            models.Index(fields=["tenant", "animal", "issued_at"]),
            models.Index(fields=["tenant", "veterinarian", "issued_at"]),
            models.Index(fields=["tenant", "status", "issued_at"]),
        ]

    def clean(self):
        super().clean()
        _validate_same_tenant(self, "animal")
        _validate_same_tenant(self, "record")
        _validate_same_tenant(self, "veterinarian")
        if self.record_id and self.animal_id and self.record.animal_id != self.animal_id:
            raise ValidationError({"record": "O prontuário deve pertencer ao mesmo animal."})

    def save(self, *args, **kwargs):
        _propagate_tenant_from(self, "animal")
        self.full_clean()
        return super().save(*args, **kwargs)

    def __str__(self) -> str:
        return self.custom_id or f"Receita veterinária {self.pk}"


class VeterinaryPrescriptionItem(ScopedPositionMixin, NoNameCoreModel):
    class Route(models.TextChoices):
        ORAL = "ORAL", "Oral"
        TOPICAL = "TOPICAL", "Tópica"
        INJECTABLE = "INJECTABLE", "Injetável"
        OPHTHALMIC = "OPHTHALMIC", "Oftálmica"
        OTIC = "OTIC", "Otológica"
        OTHER = "OTHER", "Outra"

    prefix = "VPI"
    position_scope_fields = ("prescription",)

    prescription = models.ForeignKey(
        "veterinaria.VeterinaryPrescription",
        verbose_name="Receita",
        on_delete=models.CASCADE,
        related_name="items",
        db_index=True,
    )
    medication = models.ForeignKey(
        "farmacia.Product",
        verbose_name="Produto/Medicamento",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="veterinary_prescription_items",
    )
    medication_name = models.CharField("Medicamento", max_length=160, blank=True, default="")
    dosage = models.CharField("Dosagem", max_length=120)
    route = models.CharField("Via", max_length=16, choices=Route.choices, default=Route.ORAL, db_index=True)
    frequency = models.CharField("Frequência", max_length=120, blank=True, default="")
    duration_days = models.PositiveSmallIntegerField("Duração (dias)", null=True, blank=True)
    quantity = models.DecimalField(
        "Quantidade",
        max_digits=10,
        decimal_places=2,
        default=Decimal("1.00"),
        validators=[MinValueValidator(Decimal("0.01"))],
    )
    instructions = models.TextField("Instruções", blank=True, default="")

    class Meta:
        db_table = "veterinaria_receita_item"
        verbose_name = "Item de Receita Veterinária"
        verbose_name_plural = "Itens de Receita Veterinária"
        ordering = ["prescription", "position", "id"]
        indexes = [
            models.Index(fields=["tenant", "prescription"]),
            models.Index(fields=["tenant", "medication"]),
            models.Index(fields=["tenant", "route"]),
        ]

    def clean(self):
        super().clean()
        _validate_same_tenant(self, "prescription")
        _validate_same_tenant(self, "medication")
        if not self.medication_id and not (self.medication_name or "").strip():
            raise ValidationError({"medication_name": "Informe o medicamento ou selecione um produto."})
        if not (self.dosage or "").strip():
            raise ValidationError({"dosage": "Informe a dosagem."})

    def save(self, *args, **kwargs):
        _propagate_tenant_from(self, "prescription")
        if self.medication_id and not self.medication_name:
            self.medication_name = self.medication.name
        self.full_clean()
        return super().save(*args, **kwargs)

    def __str__(self) -> str:
        return self.medication_name or getattr(self.medication, "name", "") or f"Item {self.pk}"


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


def _validate_species_compatibility(target_species: str, animal_species: str, field_name: str) -> None:
    if target_species in ("", AnimalSpecies.ALL):
        return
    if target_species != animal_species:
        raise ValidationError({field_name: "O registo não é compatível com a espécie do animal."})
