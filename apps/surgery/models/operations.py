from __future__ import annotations

from decimal import Decimal

from django.core.exceptions import ValidationError
from django.core.validators import MaxValueValidator, MinValueValidator
from django.db import models
from django.utils import timezone

from core.models.base import CoreModel, NoNameCoreModel

MIN_ZERO = MinValueValidator(Decimal("0.00"))
SCORE_0_10 = [MinValueValidator(0), MaxValueValidator(10)]


class OperatingRoom(CoreModel):
    class RoomType(models.TextChoices):
        GENERAL = "GENERAL", "Geral"
        MINOR = "MINOR", "Pequena cirurgia"
        MAJOR = "MAJOR", "Grande cirurgia"
        ENDOSCOPY = "ENDOSCOPY", "Endoscopia"
        OBSTETRIC = "OBSTETRIC", "Obstétrica"
        OTHER = "OTHER", "Outra"

    class Status(models.TextChoices):
        AVAILABLE = "AVAILABLE", "Disponível"
        OCCUPIED = "OCCUPIED", "Ocupada"
        CLEANING = "CLEANING", "Em limpeza"
        MAINTENANCE = "MAINTENANCE", "Manutenção"
        INACTIVE = "INACTIVE", "Inativa"

    prefix = "CCO"

    code = models.CharField("Código", max_length=40, db_index=True)
    room_type = models.CharField("Tipo de sala", max_length=20, choices=RoomType.choices, default=RoomType.GENERAL, db_index=True)
    status = models.CharField("Estado", max_length=20, choices=Status.choices, default=Status.AVAILABLE, db_index=True)
    location = models.CharField("Localização", max_length=120, blank=True, default="")
    capacity = models.PositiveSmallIntegerField("Capacidade", default=1, validators=[MinValueValidator(1)])
    sterile = models.BooleanField("Esterilizada", default=True, db_index=True)
    equipment_notes = models.TextField("Equipamentos disponíveis", blank=True, default="")
    notes = models.TextField("Observações", blank=True, default="")

    class Meta:
        db_table = "cirurgia_centro_cirurgico"
        verbose_name = "Centro Cirúrgico / Sala Operatória"
        verbose_name_plural = "Centros Cirúrgicos / Salas Operatórias"
        ordering = ["name", "code"]
        constraints = [models.UniqueConstraint(fields=["tenant", "code"], name="uq_operating_room_code_tenant")]
        indexes = [models.Index(fields=["tenant", "status"]), models.Index(fields=["tenant", "room_type"])]

    def __str__(self) -> str:
        return f"{self.code} - {self.name}"


class SurgicalSchedule(NoNameCoreModel):
    class Status(models.TextChoices):
        REQUESTED = "REQUESTED", "Solicitada"
        SCHEDULED = "SCHEDULED", "Agendada"
        CONFIRMED = "CONFIRMED", "Confirmada"
        IN_PROGRESS = "IN_PROGRESS", "Em curso"
        COMPLETED = "COMPLETED", "Concluída"
        CANCELLED = "CANCELLED", "Cancelada"

    class Priority(models.TextChoices):
        ELECTIVE = "ELECTIVE", "Eletiva"
        URGENT = "URGENT", "Urgente"
        EMERGENCY = "EMERGENCY", "Emergência"

    prefix = "CAG"

    surgery = models.ForeignKey("cirurgia.Surgery", verbose_name="Cirurgia", on_delete=models.CASCADE, related_name="schedules", db_index=True)
    operating_room = models.ForeignKey(OperatingRoom, verbose_name="Centro cirúrgico", on_delete=models.SET_NULL, null=True, blank=True, related_name="schedules")
    scheduled_start = models.DateTimeField("Início previsto", default=timezone.now, db_index=True)
    scheduled_end = models.DateTimeField("Fim previsto", null=True, blank=True, db_index=True)
    status = models.CharField("Estado", max_length=20, choices=Status.choices, default=Status.SCHEDULED, db_index=True)
    priority = models.CharField("Prioridade", max_length=16, choices=Priority.choices, default=Priority.ELECTIVE, db_index=True)
    cancellation_reason = models.TextField("Motivo de cancelamento", blank=True, default="")
    notes = models.TextField("Observações", blank=True, default="")

    class Meta:
        db_table = "cirurgia_agenda_cirurgica"
        verbose_name = "Agenda Cirúrgica"
        verbose_name_plural = "Agenda Cirúrgica"
        ordering = ["-scheduled_start", "-created_at"]
        indexes = [models.Index(fields=["tenant", "surgery", "scheduled_start"]), models.Index(fields=["tenant", "operating_room", "scheduled_start"]), models.Index(fields=["tenant", "status", "priority"])]

    def clean(self):
        super().clean()
        _validate_same_tenant(self, "surgery")
        _validate_same_tenant(self, "operating_room")
        if self.scheduled_end and self.scheduled_end <= self.scheduled_start:
            raise ValidationError({"scheduled_end": "O fim previsto deve ser posterior ao início."})
        if self.status == self.Status.CANCELLED and not (self.cancellation_reason or "").strip():
            raise ValidationError({"cancellation_reason": "Informe o motivo do cancelamento."})

    def save(self, *args, **kwargs):
        _propagate_tenant_from(self, "surgery")
        self.full_clean()
        return super().save(*args, **kwargs)

    def __str__(self) -> str:
        return self.custom_id or f"Agenda cirúrgica {self.pk}"


class SurgicalTeamMember(NoNameCoreModel):
    class Role(models.TextChoices):
        SURGEON = "SURGEON", "Cirurgião"
        ASSISTANT = "ASSISTANT", "Assistente"
        ANESTHETIST = "ANESTHETIST", "Anestesista"
        SCRUB_NURSE = "SCRUB_NURSE", "Instrumentista"
        CIRCULATING_NURSE = "CIRCULATING_NURSE", "Circulante"
        PERFUSIONIST = "PERFUSIONIST", "Perfusionista"
        OTHER = "OTHER", "Outro"

    prefix = "CEQ"

    surgery = models.ForeignKey("cirurgia.Surgery", verbose_name="Cirurgia", on_delete=models.CASCADE, related_name="team_members", db_index=True)
    employee = models.ForeignKey("recursos_humanos.Employee", verbose_name="Profissional", on_delete=models.SET_NULL, null=True, blank=True, related_name="surgical_team_assignments")
    role = models.CharField("Função", max_length=24, choices=Role.choices, default=Role.ASSISTANT, db_index=True)
    lead = models.BooleanField("Responsável principal", default=False, db_index=True)
    present = models.BooleanField("Presente", default=True, db_index=True)
    notes = models.TextField("Observações", blank=True, default="")

    class Meta:
        db_table = "cirurgia_equipa_cirurgica"
        verbose_name = "Membro da Equipa Cirúrgica"
        verbose_name_plural = "Equipa Cirúrgica"
        ordering = ["surgery", "role", "id"]
        indexes = [models.Index(fields=["tenant", "surgery", "role"]), models.Index(fields=["tenant", "employee"])]

    def clean(self):
        super().clean()
        _validate_same_tenant(self, "surgery")
        _validate_same_tenant(self, "employee")

    def save(self, *args, **kwargs):
        _propagate_tenant_from(self, "surgery")
        self.full_clean()
        return super().save(*args, **kwargs)

    def __str__(self) -> str:
        return f"{self.role} - {getattr(self.employee, 'name', '') or self.custom_id}"


class AnesthesiaRecord(NoNameCoreModel):
    class AnesthesiaType(models.TextChoices):
        GENERAL = "GENERAL", "Geral"
        REGIONAL = "REGIONAL", "Regional"
        LOCAL = "LOCAL", "Local"
        SEDATION = "SEDATION", "Sedação"
        COMBINED = "COMBINED", "Combinada"
        NONE = "NONE", "Sem anestesia"

    class Status(models.TextChoices):
        PLANNED = "PLANNED", "Planeada"
        IN_PROGRESS = "IN_PROGRESS", "Em curso"
        COMPLETED = "COMPLETED", "Concluída"
        CANCELLED = "CANCELLED", "Cancelada"

    prefix = "CAN"

    surgery = models.ForeignKey("cirurgia.Surgery", verbose_name="Cirurgia", on_delete=models.CASCADE, related_name="anesthesia_records", db_index=True)
    anesthetist = models.ForeignKey("recursos_humanos.Employee", verbose_name="Anestesista", on_delete=models.SET_NULL, null=True, blank=True, related_name="anesthesia_records")
    anesthesia_type = models.CharField("Tipo de anestesia", max_length=20, choices=AnesthesiaType.choices, default=AnesthesiaType.GENERAL, db_index=True)
    asa_class = models.CharField("Classe ASA", max_length=8, blank=True, default="", db_index=True)
    status = models.CharField("Estado", max_length=16, choices=Status.choices, default=Status.PLANNED, db_index=True)
    started_at = models.DateTimeField("Iniciada em", null=True, blank=True, db_index=True)
    ended_at = models.DateTimeField("Terminada em", null=True, blank=True, db_index=True)
    airway_management = models.CharField("Via aérea", max_length=160, blank=True, default="")
    medications = models.JSONField("Fármacos", default=list, blank=True)
    fluids = models.JSONField("Fluidos", default=list, blank=True)
    complications = models.TextField("Complicações", blank=True, default="")
    notes = models.TextField("Observações", blank=True, default="")

    class Meta:
        db_table = "cirurgia_anestesia"
        verbose_name = "Registo de Anestesia"
        verbose_name_plural = "Registos de Anestesia"
        ordering = ["-started_at", "-created_at"]
        indexes = [models.Index(fields=["tenant", "surgery"]), models.Index(fields=["tenant", "anesthesia_type", "status"]), models.Index(fields=["tenant", "anesthetist"])]

    def clean(self):
        super().clean()
        _validate_same_tenant(self, "surgery")
        _validate_same_tenant(self, "anesthetist")
        if self.ended_at and self.started_at and self.ended_at < self.started_at:
            raise ValidationError({"ended_at": "O fim da anestesia não pode ser anterior ao início."})

    def save(self, *args, **kwargs):
        _propagate_tenant_from(self, "surgery")
        self.full_clean()
        return super().save(*args, **kwargs)

    def __str__(self) -> str:
        return self.custom_id or f"Anestesia {self.pk}"


class SurgicalSafetyChecklist(NoNameCoreModel):
    class Phase(models.TextChoices):
        SIGN_IN = "SIGN_IN", "Antes da indução"
        TIME_OUT = "TIME_OUT", "Antes da incisão"
        SIGN_OUT = "SIGN_OUT", "Antes da saída"

    prefix = "CCK"

    surgery = models.ForeignKey("cirurgia.Surgery", verbose_name="Cirurgia", on_delete=models.CASCADE, related_name="safety_checklists", db_index=True)
    completed_by = models.ForeignKey("recursos_humanos.Employee", verbose_name="Preenchido por", on_delete=models.SET_NULL, null=True, blank=True, related_name="surgical_checklists_completed")
    phase = models.CharField("Fase", max_length=16, choices=Phase.choices, default=Phase.SIGN_IN, db_index=True)
    patient_identity_confirmed = models.BooleanField("Identidade confirmada", default=False)
    procedure_confirmed = models.BooleanField("Procedimento confirmado", default=False)
    site_marked = models.BooleanField("Local marcado", default=False)
    consent_confirmed = models.BooleanField("Consentimento confirmado", default=False)
    anesthesia_safety_checked = models.BooleanField("Segurança anestésica verificada", default=False)
    antibiotic_prophylaxis = models.BooleanField("Profilaxia antibiótica", default=False)
    instrument_count_confirmed = models.BooleanField("Contagem de instrumentos confirmada", default=False)
    specimens_labeled = models.BooleanField("Amostras identificadas", default=False)
    completed_at = models.DateTimeField("Concluído em", null=True, blank=True, db_index=True)
    notes = models.TextField("Observações", blank=True, default="")

    class Meta:
        db_table = "cirurgia_checklist_seguranca"
        verbose_name = "Checklist de Segurança Cirúrgica"
        verbose_name_plural = "Checklists de Segurança Cirúrgica"
        ordering = ["surgery", "phase", "created_at"]
        constraints = [models.UniqueConstraint(fields=["tenant", "surgery", "phase"], name="uq_surgery_checklist_phase_tenant")]
        indexes = [models.Index(fields=["tenant", "surgery", "phase"]), models.Index(fields=["tenant", "completed_at"])]

    @property
    def is_complete(self) -> bool:
        return all([
            self.patient_identity_confirmed,
            self.procedure_confirmed,
            self.consent_confirmed,
            self.anesthesia_safety_checked,
        ])

    def clean(self):
        super().clean()
        _validate_same_tenant(self, "surgery")
        _validate_same_tenant(self, "completed_by")

    def save(self, *args, **kwargs):
        _propagate_tenant_from(self, "surgery")
        if self.is_complete and not self.completed_at:
            self.completed_at = timezone.now()
        self.full_clean()
        return super().save(*args, **kwargs)

    def __str__(self) -> str:
        return f"{self.phase} - {self.surgery_id}"


class SurgicalMaterial(CoreModel):
    class MaterialType(models.TextChoices):
        INSTRUMENT = "INSTRUMENT", "Instrumental"
        CONSUMABLE = "CONSUMABLE", "Consumível"
        IMPLANT = "IMPLANT", "Implante"
        MEDICATION = "MEDICATION", "Medicamento"
        SUTURE = "SUTURE", "Sutura"
        OTHER = "OTHER", "Outro"

    prefix = "CMAT"

    code = models.CharField("Código", max_length=40, db_index=True)
    product = models.ForeignKey("farmacia.Product", verbose_name="Produto de farmácia/stock", on_delete=models.SET_NULL, null=True, blank=True, related_name="surgical_materials")
    material_type = models.CharField("Tipo de material", max_length=20, choices=MaterialType.choices, default=MaterialType.CONSUMABLE, db_index=True)
    unit = models.CharField("Unidade", max_length=40, default="un", db_index=True)
    reusable = models.BooleanField("Reutilizável", default=False, db_index=True)
    sterile = models.BooleanField("Estéril", default=True, db_index=True)
    active = models.BooleanField("Ativo", default=True, db_index=True)
    notes = models.TextField("Observações", blank=True, default="")

    class Meta:
        db_table = "cirurgia_material"
        verbose_name = "Material Cirúrgico"
        verbose_name_plural = "Materiais Cirúrgicos"
        ordering = ["name", "code"]
        constraints = [models.UniqueConstraint(fields=["tenant", "code"], name="uq_surgical_material_code_tenant")]
        indexes = [models.Index(fields=["tenant", "material_type"]), models.Index(fields=["tenant", "active"])]

    def clean(self):
        super().clean()
        _validate_same_tenant(self, "product")

    def save(self, *args, **kwargs):
        if self.product_id and not self.tenant_id:
            _propagate_tenant_from(self, "product")
        self.full_clean()
        return super().save(*args, **kwargs)

    def __str__(self) -> str:
        return f"{self.code} - {self.name}"


class SurgicalConsumption(NoNameCoreModel):
    prefix = "CCS"

    surgery = models.ForeignKey("cirurgia.Surgery", verbose_name="Cirurgia", on_delete=models.CASCADE, related_name="consumptions", db_index=True)
    material = models.ForeignKey(SurgicalMaterial, verbose_name="Material", on_delete=models.SET_NULL, null=True, blank=True, related_name="consumptions")
    product = models.ForeignKey("farmacia.Product", verbose_name="Produto", on_delete=models.SET_NULL, null=True, blank=True, related_name="surgical_consumptions")
    consumed_by = models.ForeignKey("recursos_humanos.Employee", verbose_name="Consumido/registado por", on_delete=models.SET_NULL, null=True, blank=True, related_name="surgical_consumptions")
    quantity = models.DecimalField("Quantidade", max_digits=10, decimal_places=2, default=Decimal("1.00"), validators=[MinValueValidator(Decimal("0.01"))])
    unit_cost = models.DecimalField("Custo unitário", max_digits=12, decimal_places=2, default=Decimal("0.00"), validators=[MIN_ZERO])
    consumed_at = models.DateTimeField("Consumido em", default=timezone.now, db_index=True)
    batch_number = models.CharField("Lote", max_length=80, blank=True, default="")
    notes = models.TextField("Observações", blank=True, default="")

    class Meta:
        db_table = "cirurgia_consumo"
        verbose_name = "Consumo Cirúrgico"
        verbose_name_plural = "Consumos Cirúrgicos"
        ordering = ["-consumed_at", "-created_at"]
        indexes = [models.Index(fields=["tenant", "surgery", "consumed_at"]), models.Index(fields=["tenant", "material"]), models.Index(fields=["tenant", "product"])]

    @property
    def total_cost(self) -> Decimal:
        return (self.quantity or Decimal("0.00")) * (self.unit_cost or Decimal("0.00"))

    def clean(self):
        super().clean()
        _validate_same_tenant(self, "surgery")
        _validate_same_tenant(self, "material")
        _validate_same_tenant(self, "product")
        _validate_same_tenant(self, "consumed_by")
        if not self.material_id and not self.product_id:
            raise ValidationError({"material": "Informe um material cirúrgico ou produto de stock."})

    def save(self, *args, **kwargs):
        _propagate_tenant_from(self, "surgery")
        if self.material_id and not self.product_id:
            self.product_id = self.material.product_id
        self.full_clean()
        return super().save(*args, **kwargs)

    def __str__(self) -> str:
        return self.custom_id or f"Consumo {self.pk}"


class RecoveryRecord(NoNameCoreModel):
    class Status(models.TextChoices):
        ADMITTED = "ADMITTED", "Admitido"
        MONITORING = "MONITORING", "Em vigilância"
        READY_DISCHARGE = "READY_DISCHARGE", "Alta preparada"
        DISCHARGED = "DISCHARGED", "Alta"
        TRANSFERRED = "TRANSFERRED", "Transferido"

    prefix = "CREC"

    surgery = models.ForeignKey("cirurgia.Surgery", verbose_name="Cirurgia", on_delete=models.CASCADE, related_name="recovery_records", db_index=True)
    nurse = models.ForeignKey("recursos_humanos.Employee", verbose_name="Enfermeiro", on_delete=models.SET_NULL, null=True, blank=True, related_name="surgical_recovery_records")
    admitted_at = models.DateTimeField("Admitido em", default=timezone.now, db_index=True)
    discharged_at = models.DateTimeField("Alta em", null=True, blank=True, db_index=True)
    status = models.CharField("Estado", max_length=20, choices=Status.choices, default=Status.ADMITTED, db_index=True)
    pain_score = models.PositiveSmallIntegerField("Dor (0-10)", default=0, validators=SCORE_0_10)
    aldrete_score = models.PositiveSmallIntegerField("Índice de Aldrete", default=0, validators=[MinValueValidator(0), MaxValueValidator(10)])
    vital_signs = models.JSONField("Sinais vitais", default=dict, blank=True)
    complications = models.TextField("Complicações", blank=True, default="")
    destination = models.CharField("Destino", max_length=120, blank=True, default="")
    notes = models.TextField("Observações", blank=True, default="")

    class Meta:
        db_table = "cirurgia_recuperacao"
        verbose_name = "Recuperação Pós-Anestésica"
        verbose_name_plural = "Recuperação Pós-Anestésica"
        ordering = ["-admitted_at", "-created_at"]
        indexes = [models.Index(fields=["tenant", "surgery"]), models.Index(fields=["tenant", "status", "admitted_at"]), models.Index(fields=["tenant", "nurse"])]

    def clean(self):
        super().clean()
        _validate_same_tenant(self, "surgery")
        _validate_same_tenant(self, "nurse")
        if self.discharged_at and self.discharged_at < self.admitted_at:
            raise ValidationError({"discharged_at": "A alta não pode ser anterior à admissão."})

    def save(self, *args, **kwargs):
        _propagate_tenant_from(self, "surgery")
        if self.status == self.Status.DISCHARGED and not self.discharged_at:
            self.discharged_at = timezone.now()
        self.full_clean()
        return super().save(*args, **kwargs)

    def __str__(self) -> str:
        return self.custom_id or f"Recuperação {self.pk}"


class OperativeReport(NoNameCoreModel):
    class Status(models.TextChoices):
        DRAFT = "DRAFT", "Rascunho"
        FINAL = "FINAL", "Final"
        AMENDED = "AMENDED", "Retificado"
        CANCELLED = "CANCELLED", "Cancelado"

    prefix = "CRO"

    surgery = models.OneToOneField("cirurgia.Surgery", verbose_name="Cirurgia", on_delete=models.CASCADE, related_name="operative_report", db_index=True)
    primary_surgeon = models.ForeignKey("recursos_humanos.Employee", verbose_name="Cirurgião principal", on_delete=models.SET_NULL, null=True, blank=True, related_name="operative_reports")
    status = models.CharField("Estado", max_length=16, choices=Status.choices, default=Status.DRAFT, db_index=True)
    preoperative_diagnosis = models.TextField("Diagnóstico pré-operatório", blank=True, default="")
    postoperative_diagnosis = models.TextField("Diagnóstico pós-operatório", blank=True, default="")
    procedure_performed = models.TextField("Procedimento realizado", blank=True, default="")
    findings = models.TextField("Achados operatórios", blank=True, default="")
    technique = models.TextField("Técnica cirúrgica", blank=True, default="")
    complications = models.TextField("Complicações", blank=True, default="")
    estimated_blood_loss_ml = models.PositiveIntegerField("Perda sanguínea estimada (ml)", default=0)
    specimen_sent_to_pathology = models.BooleanField("Amostra enviada para patologia", default=False, db_index=True)
    pathology_accession_number = models.CharField("Número de patologia", max_length=80, blank=True, default="")
    started_at = models.DateTimeField("Iniciada em", null=True, blank=True, db_index=True)
    ended_at = models.DateTimeField("Terminada em", null=True, blank=True, db_index=True)
    signed_at = models.DateTimeField("Assinado em", null=True, blank=True, db_index=True)
    notes = models.TextField("Observações", blank=True, default="")

    class Meta:
        db_table = "cirurgia_relatorio_operatorio"
        verbose_name = "Relatório Operatório"
        verbose_name_plural = "Relatórios Operatórios"
        ordering = ["-signed_at", "-created_at"]
        indexes = [models.Index(fields=["tenant", "status"]), models.Index(fields=["tenant", "primary_surgeon", "signed_at"])]

    def clean(self):
        super().clean()
        _validate_same_tenant(self, "surgery")
        _validate_same_tenant(self, "primary_surgeon")
        if self.ended_at and self.started_at and self.ended_at < self.started_at:
            raise ValidationError({"ended_at": "O fim não pode ser anterior ao início."})
        if self.status in {self.Status.FINAL, self.Status.AMENDED} and not (self.procedure_performed or "").strip():
            raise ValidationError({"procedure_performed": "Informe o procedimento realizado antes de finalizar."})

    def save(self, *args, **kwargs):
        _propagate_tenant_from(self, "surgery")
        if self.status in {self.Status.FINAL, self.Status.AMENDED} and not self.signed_at:
            self.signed_at = timezone.now()
        self.full_clean()
        return super().save(*args, **kwargs)

    def __str__(self) -> str:
        return self.custom_id or f"Relatório operatório {self.pk}"


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
