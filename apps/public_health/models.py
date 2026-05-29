from __future__ import annotations

from datetime import timedelta
from decimal import Decimal

from django.core.exceptions import ValidationError
from django.core.validators import MaxValueValidator, MinValueValidator
from django.db import models, transaction
from django.utils import timezone

from core.models.base import CoreModel, NoNameCoreModel

ZERO = Decimal("0.00")
PERCENT_VALIDATORS = [MinValueValidator(ZERO), MaxValueValidator(Decimal("100.00"))]


class VaccineProduct(CoreModel):
    class VaccineType(models.TextChoices):
        LIVE_ATTENUATED = "LIVE_ATTENUATED", "Viva atenuada"
        INACTIVATED = "INACTIVATED", "Inativada"
        TOXOID = "TOXOID", "Toxóide"
        SUBUNIT = "SUBUNIT", "Subunidade"
        MRNA = "MRNA", "mRNA"
        VIRAL_VECTOR = "VIRAL_VECTOR", "Vetor viral"
        OTHER = "OTHER", "Outra"

    prefix = "VAC"

    code = models.CharField("Código", max_length=40, blank=True, default="", db_index=True)
    disease = models.CharField("Doença alvo", max_length=120, db_index=True)
    vaccine_type = models.CharField("Tipo", max_length=24, choices=VaccineType.choices, default=VaccineType.INACTIVATED)
    manufacturer = models.CharField("Fabricante", max_length=120, blank=True, default="")
    dose_volume_ml = models.DecimalField("Volume da dose (ml)", max_digits=5, decimal_places=2, default=Decimal("0.50"))
    dose_count_required = models.PositiveSmallIntegerField("Doses requeridas", default=1, validators=[MinValueValidator(1)])
    booster_interval_days = models.PositiveSmallIntegerField("Intervalo para reforço (dias)", default=0)
    minimum_age_months = models.PositiveSmallIntegerField("Idade mínima (meses)", null=True, blank=True)
    maximum_age_months = models.PositiveSmallIntegerField("Idade máxima (meses)", null=True, blank=True)
    cold_chain_min_c = models.DecimalField("Cadeia fria mínima (C)", max_digits=5, decimal_places=2, default=Decimal("2.00"))
    cold_chain_max_c = models.DecimalField("Cadeia fria máxima (C)", max_digits=5, decimal_places=2, default=Decimal("8.00"))
    official_code = models.CharField("Código oficial", max_length=80, blank=True, default="", db_index=True)
    active = models.BooleanField("Ativa", default=True, db_index=True)
    notes = models.TextField("Observações", blank=True, default="")

    class Meta:
        db_table = "saude_publica_vacina"
        verbose_name = "Vacina"
        verbose_name_plural = "Vacinas"
        ordering = ["name", "disease"]
        indexes = [
            models.Index(fields=["tenant", "disease", "active"]),
            models.Index(fields=["tenant", "code"]),
            models.Index(fields=["tenant", "official_code"]),
        ]
        constraints = [
            models.UniqueConstraint(
                fields=["tenant", "code"],
                condition=models.Q(code__gt="", deleted=False),
                name="uq_public_health_vaccine_code_tenant",
            ),
            models.UniqueConstraint(
                fields=["tenant", "official_code"],
                condition=models.Q(official_code__gt="", deleted=False),
                name="uq_public_health_vaccine_official_tenant",
            ),
        ]

    def clean(self):
        super().clean()
        if (
            self.maximum_age_months is not None
            and self.minimum_age_months is not None
            and self.maximum_age_months < self.minimum_age_months
        ):
            raise ValidationError({"maximum_age_months": "A idade máxima deve ser maior que a mínima."})
        if self.cold_chain_max_c < self.cold_chain_min_c:
            raise ValidationError({"cold_chain_max_c": "A temperatura máxima deve ser maior que a mínima."})

    def save(self, *args, **kwargs):
        self.full_clean()
        return super().save(*args, **kwargs)


class VaccineLot(NoNameCoreModel):
    class Status(models.TextChoices):
        RECEIVED = "RECEIVED", "Recebido"
        ACTIVE = "ACTIVE", "Ativo"
        QUARANTINED = "QUARANTINED", "Quarentena"
        DEPLETED = "DEPLETED", "Esgotado"
        EXPIRED = "EXPIRED", "Expirado"
        RECALLED = "RECALLED", "Recolhido"

    class ColdChainStatus(models.TextChoices):
        OK = "OK", "Conforme"
        WARNING = "WARNING", "Atenção"
        BREACH = "BREACH", "Quebra de cadeia fria"
        UNKNOWN = "UNKNOWN", "Desconhecido"

    prefix = "VLT"

    vaccine = models.ForeignKey(
        VaccineProduct,
        verbose_name="Vacina",
        on_delete=models.PROTECT,
        related_name="lots",
        db_index=True,
    )
    lot_number = models.CharField("Lote", max_length=80, db_index=True)
    official_batch_code = models.CharField("Código oficial do lote", max_length=100, blank=True, default="", db_index=True)
    status = models.CharField("Estado", max_length=16, choices=Status.choices, default=Status.RECEIVED, db_index=True)
    expiration_date = models.DateField("Validade", db_index=True)
    received_at = models.DateField("Recebido em", default=timezone.localdate, db_index=True)
    doses_received = models.PositiveIntegerField("Doses recebidas", default=0)
    doses_available = models.PositiveIntegerField("Doses disponíveis", default=0)
    reserved_doses = models.PositiveIntegerField("Doses reservadas", default=0)
    storage_location = models.CharField("Local de armazenamento", max_length=160, blank=True, default="")
    storage_temperature_c = models.DecimalField("Temperatura atual (C)", max_digits=5, decimal_places=2, null=True, blank=True)
    cold_chain_status = models.CharField("Cadeia fria", max_length=12, choices=ColdChainStatus.choices, default=ColdChainStatus.OK, db_index=True)
    notes = models.TextField("Observações", blank=True, default="")

    class Meta:
        db_table = "saude_publica_lote_vacina"
        verbose_name = "Lote de Vacina"
        verbose_name_plural = "Lotes de Vacina"
        ordering = ["expiration_date", "vaccine", "lot_number"]
        indexes = [
            models.Index(fields=["tenant", "vaccine", "expiration_date"]),
            models.Index(fields=["tenant", "status", "expiration_date"]),
            models.Index(fields=["tenant", "lot_number"]),
            models.Index(fields=["tenant", "cold_chain_status"]),
        ]
        constraints = [
            models.UniqueConstraint(
                fields=["tenant", "vaccine", "lot_number"],
                condition=models.Q(deleted=False),
                name="uq_public_health_vaccine_lot_tenant",
            )
        ]

    @property
    def is_expired(self) -> bool:
        return self.expiration_date < timezone.localdate()

    def clean(self):
        super().clean()
        _validate_same_tenant(self, "vaccine")
        if self.doses_available > self.doses_received:
            raise ValidationError({"doses_available": "Doses disponíveis não podem exceder as doses recebidas."})
        if self.reserved_doses > self.doses_available:
            raise ValidationError({"reserved_doses": "Doses reservadas não podem exceder as doses disponíveis."})
        if self.status == self.Status.ACTIVE and self.is_expired:
            raise ValidationError({"status": "Lote expirado não pode ficar ativo."})
        if (
            self.storage_temperature_c is not None
            and self.vaccine_id
            and not (self.vaccine.cold_chain_min_c <= self.storage_temperature_c <= self.vaccine.cold_chain_max_c)
        ):
            self.cold_chain_status = self.ColdChainStatus.BREACH

    def save(self, *args, **kwargs):
        _propagate_tenant_from(self, "vaccine")
        if self._state.adding and not self.doses_available and self.doses_received:
            self.doses_available = self.doses_received
        if self.is_expired and self.status not in {self.Status.DEPLETED, self.Status.RECALLED}:
            self.status = self.Status.EXPIRED
        self.full_clean()
        return super().save(*args, **kwargs)

    def __str__(self) -> str:
        return f"{self.vaccine.name} - {self.lot_number}"


class VaccinationCampaign(CoreModel):
    class CampaignType(models.TextChoices):
        ROUTINE = "ROUTINE", "Rotina"
        MASS = "MASS", "Campanha massiva"
        OUTBREAK = "OUTBREAK", "Surto"
        SCHOOL = "SCHOOL", "Escolar"
        OCCUPATIONAL = "OCCUPATIONAL", "Ocupacional"
        OTHER = "OTHER", "Outra"

    class Status(models.TextChoices):
        PLANNED = "PLANNED", "Planeada"
        ACTIVE = "ACTIVE", "Ativa"
        PAUSED = "PAUSED", "Pausada"
        COMPLETED = "COMPLETED", "Concluída"
        CANCELLED = "CANCELLED", "Cancelada"

    prefix = "VCP"

    vaccine = models.ForeignKey(
        VaccineProduct,
        verbose_name="Vacina",
        on_delete=models.PROTECT,
        related_name="campaigns",
        db_index=True,
    )
    manager = models.ForeignKey(
        "recursos_humanos.Employee",
        verbose_name="Responsável",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="vaccination_campaigns",
    )
    campaign_type = models.CharField("Tipo de campanha", max_length=16, choices=CampaignType.choices, default=CampaignType.ROUTINE, db_index=True)
    status = models.CharField("Estado", max_length=16, choices=Status.choices, default=Status.PLANNED, db_index=True)
    target_region = models.CharField("Região alvo", max_length=120, blank=True, default="", db_index=True)
    target_age_min_months = models.PositiveSmallIntegerField("Idade mínima alvo (meses)", null=True, blank=True)
    target_age_max_months = models.PositiveSmallIntegerField("Idade máxima alvo (meses)", null=True, blank=True)
    target_population = models.PositiveIntegerField("População alvo", default=0)
    target_doses = models.PositiveIntegerField("Meta de doses", default=0)
    start_date = models.DateField("Início", default=timezone.localdate, db_index=True)
    end_date = models.DateField("Fim", null=True, blank=True, db_index=True)
    official_program_code = models.CharField("Código oficial do programa", max_length=100, blank=True, default="", db_index=True)
    official_system = models.CharField("Sistema oficial", max_length=80, blank=True, default="")
    notification_endpoint = models.URLField("Endpoint de notificação", max_length=500, blank=True, default="")
    notes = models.TextField("Observações", blank=True, default="")

    class Meta:
        db_table = "saude_publica_campanha_vacinacao"
        verbose_name = "Campanha de Vacinação"
        verbose_name_plural = "Campanhas de Vacinação"
        ordering = ["-start_date", "name"]
        indexes = [
            models.Index(fields=["tenant", "status", "start_date"]),
            models.Index(fields=["tenant", "vaccine", "status"]),
            models.Index(fields=["tenant", "target_region"]),
            models.Index(fields=["tenant", "official_program_code"]),
        ]

    @property
    def administered_doses(self) -> int:
        if not self.pk:
            return 0
        return self.immunization_records.filter(
            status__in=[
                ImmunizationRecord.Status.ADMINISTERED,
                ImmunizationRecord.Status.REPORTED,
            ]
        ).count()

    @property
    def coverage_percent(self) -> Decimal:
        if not self.target_doses:
            return ZERO
        return (Decimal(self.administered_doses) * Decimal("100.00") / Decimal(self.target_doses)).quantize(Decimal("0.01"))

    def clean(self):
        super().clean()
        _validate_same_tenant(self, "vaccine")
        _validate_same_tenant(self, "manager")
        if self.end_date and self.end_date < self.start_date:
            raise ValidationError({"end_date": "A data final não pode ser anterior ao início."})
        if (
            self.target_age_max_months is not None
            and self.target_age_min_months is not None
            and self.target_age_max_months < self.target_age_min_months
        ):
            raise ValidationError({"target_age_max_months": "A idade máxima deve ser maior que a mínima."})

    def save(self, *args, **kwargs):
        _propagate_tenant_from(self, "vaccine")
        self.full_clean()
        return super().save(*args, **kwargs)


class VaccinationCampaignTarget(NoNameCoreModel):
    prefix = "VCT"

    campaign = models.ForeignKey(
        VaccinationCampaign,
        verbose_name="Campanha",
        on_delete=models.CASCADE,
        related_name="targets",
        db_index=True,
    )
    region = models.CharField("Região", max_length=120, db_index=True)
    district = models.CharField("Distrito", max_length=120, blank=True, default="", db_index=True)
    age_min_months = models.PositiveSmallIntegerField("Idade mínima (meses)", null=True, blank=True)
    age_max_months = models.PositiveSmallIntegerField("Idade máxima (meses)", null=True, blank=True)
    target_population = models.PositiveIntegerField("População alvo", default=0)
    target_doses = models.PositiveIntegerField("Meta de doses", default=0)
    administered_doses = models.PositiveIntegerField("Doses aplicadas", default=0)
    notes = models.TextField("Observações", blank=True, default="")

    class Meta:
        db_table = "saude_publica_meta_campanha"
        verbose_name = "Meta de Campanha"
        verbose_name_plural = "Metas de Campanha"
        ordering = ["campaign", "region", "district", "age_min_months"]
        indexes = [
            models.Index(fields=["tenant", "campaign", "region"]),
            models.Index(fields=["tenant", "region", "district"]),
        ]
        constraints = [
            models.UniqueConstraint(
                fields=["tenant", "campaign", "region", "district", "age_min_months", "age_max_months"],
                condition=models.Q(deleted=False),
                name="uq_public_health_campaign_target",
            )
        ]

    @property
    def coverage_percent(self) -> Decimal:
        if not self.target_doses:
            return ZERO
        return (Decimal(self.administered_doses) * Decimal("100.00") / Decimal(self.target_doses)).quantize(Decimal("0.01"))

    def clean(self):
        super().clean()
        _validate_same_tenant(self, "campaign")
        if (
            self.age_max_months is not None
            and self.age_min_months is not None
            and self.age_max_months < self.age_min_months
        ):
            raise ValidationError({"age_max_months": "A idade máxima deve ser maior que a mínima."})
        if self.administered_doses > self.target_doses and self.target_doses:
            raise ValidationError({"administered_doses": "Doses aplicadas não podem exceder a meta definida."})

    def save(self, *args, **kwargs):
        _propagate_tenant_from(self, "campaign")
        self.full_clean()
        return super().save(*args, **kwargs)

    def __str__(self) -> str:
        parts = [self.region]
        if self.district:
            parts.append(self.district)
        return " / ".join(parts)


class ImmunizationRecord(NoNameCoreModel):
    class Status(models.TextChoices):
        SCHEDULED = "SCHEDULED", "Agendada"
        ADMINISTERED = "ADMINISTERED", "Aplicada"
        REPORTED = "REPORTED", "Notificada"
        EXEMPT = "EXEMPT", "Isenta"
        CANCELLED = "CANCELLED", "Cancelada"

    class Source(models.TextChoices):
        ROUTINE = "ROUTINE", "Rotina"
        CAMPAIGN = "CAMPAIGN", "Campanha"
        CATCH_UP = "CATCH_UP", "Recuperação"
        OFFICIAL_IMPORT = "OFFICIAL_IMPORT", "Importação oficial"

    class Route(models.TextChoices):
        IM = "IM", "Intramuscular"
        SC = "SC", "Subcutânea"
        ID = "ID", "Intradérmica"
        ORAL = "ORAL", "Oral"
        IN = "IN", "Intranasal"
        OTHER = "OTHER", "Outra"

    prefix = "IMR"

    patient = models.ForeignKey(
        "clinical.Patient",
        verbose_name="Paciente",
        on_delete=models.PROTECT,
        related_name="immunization_records",
        db_index=True,
    )
    vaccine = models.ForeignKey(
        VaccineProduct,
        verbose_name="Vacina",
        on_delete=models.PROTECT,
        related_name="immunization_records",
        db_index=True,
    )
    lot = models.ForeignKey(
        VaccineLot,
        verbose_name="Lote",
        on_delete=models.PROTECT,
        related_name="immunization_records",
        null=True,
        blank=True,
        db_index=True,
    )
    campaign = models.ForeignKey(
        VaccinationCampaign,
        verbose_name="Campanha",
        on_delete=models.SET_NULL,
        related_name="immunization_records",
        null=True,
        blank=True,
        db_index=True,
    )
    target_group = models.ForeignKey(
        VaccinationCampaignTarget,
        verbose_name="Meta da campanha",
        on_delete=models.SET_NULL,
        related_name="immunization_records",
        null=True,
        blank=True,
        db_index=True,
    )
    administered_by = models.ForeignKey(
        "recursos_humanos.Employee",
        verbose_name="Aplicada por",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="immunization_records",
    )
    status = models.CharField("Estado", max_length=16, choices=Status.choices, default=Status.ADMINISTERED, db_index=True)
    source = models.CharField("Origem", max_length=16, choices=Source.choices, default=Source.ROUTINE, db_index=True)
    dose_number = models.PositiveSmallIntegerField("Número da dose", default=1, validators=[MinValueValidator(1)])
    administered_at = models.DateTimeField("Aplicada em", default=timezone.now, db_index=True)
    next_due_date = models.DateField("Próxima dose/reforço", null=True, blank=True, db_index=True)
    route = models.CharField("Via", max_length=8, choices=Route.choices, default=Route.IM)
    body_site = models.CharField("Local anatómico", max_length=80, blank=True, default="")
    consent_confirmed = models.BooleanField("Consentimento confirmado", default=True)
    contraindication_reason = models.TextField("Contraindicação/isencão", blank=True, default="")
    official_notification_id = models.CharField("ID oficial de notificação", max_length=120, blank=True, default="", db_index=True)
    notes = models.TextField("Observações", blank=True, default="")

    class Meta:
        db_table = "saude_publica_registo_imunizacao"
        verbose_name = "Registo de Imunização"
        verbose_name_plural = "Registos de Imunização"
        ordering = ["-administered_at", "-created_at"]
        indexes = [
            models.Index(fields=["tenant", "patient", "administered_at"]),
            models.Index(fields=["tenant", "vaccine", "administered_at"]),
            models.Index(fields=["tenant", "campaign", "administered_at"]),
            models.Index(fields=["tenant", "status", "administered_at"]),
            models.Index(fields=["tenant", "official_notification_id"]),
        ]

    @property
    def is_administered(self) -> bool:
        return self.status in {self.Status.ADMINISTERED, self.Status.REPORTED}

    def clean(self):
        super().clean()
        _validate_same_tenant(self, "patient")
        _validate_same_tenant(self, "vaccine")
        _validate_same_tenant(self, "lot")
        _validate_same_tenant(self, "campaign")
        _validate_same_tenant(self, "target_group")
        _validate_same_tenant(self, "administered_by")
        if self.lot_id and self.lot.vaccine_id != self.vaccine_id:
            raise ValidationError({"lot": "O lote deve pertencer à vacina informada."})
        if self.campaign_id and self.campaign.vaccine_id != self.vaccine_id:
            raise ValidationError({"campaign": "A campanha deve pertencer à vacina informada."})
        if self.target_group_id and self.campaign_id and self.target_group.campaign_id != self.campaign_id:
            raise ValidationError({"target_group": "A meta deve pertencer à campanha informada."})
        if self.is_administered and not self.lot_id:
            raise ValidationError({"lot": "Registos aplicados exigem lote para rastreabilidade de dose."})
        if self.lot_id and self.administered_at and self.lot.expiration_date < self.administered_at.date():
            raise ValidationError({"lot": "Não é permitido aplicar dose de lote expirado."})
        if self.status == self.Status.EXEMPT and not self.contraindication_reason:
            raise ValidationError({"contraindication_reason": "Isenção exige motivo de contraindicação."})

    def save(self, *args, **kwargs):
        creating = self._state.adding
        if self.lot_id and not self.vaccine_id:
            self.vaccine_id = self.lot.vaccine_id
        if self.campaign_id and not self.vaccine_id:
            self.vaccine_id = self.campaign.vaccine_id
        _propagate_tenant_from(self, "patient")
        if self.is_administered and not self.next_due_date and self.vaccine_id and self.vaccine.booster_interval_days:
            self.next_due_date = self.administered_at.date() + timedelta(days=self.vaccine.booster_interval_days)

        with transaction.atomic():
            self.full_clean()
            if creating and self.is_administered and self.lot_id:
                lot = VaccineLot.objects.select_for_update().get(pk=self.lot_id)
                if lot.doses_available < 1:
                    raise ValidationError({"lot": "Lote sem doses disponíveis."})
                lot.doses_available -= 1
                if lot.doses_available == 0:
                    lot.status = VaccineLot.Status.DEPLETED
                lot.save(update_fields=["doses_available", "status", "updated_at"])
            result = super().save(*args, **kwargs)
            if creating and self.is_administered and self.target_group_id:
                target = VaccinationCampaignTarget.objects.select_for_update().get(pk=self.target_group_id)
                target.administered_doses += 1
                target.save(update_fields=["administered_doses", "updated_at"])
            return result

    def __str__(self) -> str:
        return self.custom_id or f"{self.patient} - {self.vaccine}"


class AdverseEventFollowingImmunization(NoNameCoreModel):
    class Severity(models.TextChoices):
        MILD = "MILD", "Leve"
        MODERATE = "MODERATE", "Moderado"
        SEVERE = "SEVERE", "Grave"
        CRITICAL = "CRITICAL", "Crítico"

    class Status(models.TextChoices):
        REPORTED = "REPORTED", "Reportado"
        UNDER_INVESTIGATION = "UNDER_INVESTIGATION", "Em investigação"
        RESOLVED = "RESOLVED", "Resolvido"
        DISCARDED = "DISCARDED", "Descartado"
        SENT_TO_AUTHORITY = "SENT_TO_AUTHORITY", "Enviado à autoridade"

    class Outcome(models.TextChoices):
        RECOVERED = "RECOVERED", "Recuperado"
        RECOVERING = "RECOVERING", "Em recuperação"
        HOSPITALIZED = "HOSPITALIZED", "Hospitalizado"
        DEATH = "DEATH", "Óbito"
        UNKNOWN = "UNKNOWN", "Desconhecido"

    prefix = "AEFI"

    immunization_record = models.ForeignKey(
        ImmunizationRecord,
        verbose_name="Registo de imunização",
        on_delete=models.PROTECT,
        related_name="adverse_events",
        db_index=True,
    )
    patient = models.ForeignKey(
        "clinical.Patient",
        verbose_name="Paciente",
        on_delete=models.PROTECT,
        related_name="aefi_events",
        db_index=True,
    )
    vaccine = models.ForeignKey(
        VaccineProduct,
        verbose_name="Vacina",
        on_delete=models.PROTECT,
        related_name="aefi_events",
        db_index=True,
    )
    lot = models.ForeignKey(
        VaccineLot,
        verbose_name="Lote",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="aefi_events",
    )
    reported_by = models.ForeignKey(
        "recursos_humanos.Employee",
        verbose_name="Reportado por",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="reported_aefi_events",
    )
    investigated_by = models.ForeignKey(
        "recursos_humanos.Employee",
        verbose_name="Investigado por",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="investigated_aefi_events",
    )
    severity = models.CharField("Gravidade", max_length=10, choices=Severity.choices, default=Severity.MILD, db_index=True)
    status = models.CharField("Estado", max_length=24, choices=Status.choices, default=Status.REPORTED, db_index=True)
    onset_at = models.DateTimeField("Início dos sintomas", db_index=True)
    reported_at = models.DateTimeField("Reportado em", default=timezone.now, db_index=True)
    investigation_due_at = models.DateTimeField("Investigação até", null=True, blank=True, db_index=True)
    symptoms = models.TextField("Sintomas")
    serious = models.BooleanField("Evento grave", default=False, db_index=True)
    outcome = models.CharField("Desfecho", max_length=16, choices=Outcome.choices, default=Outcome.UNKNOWN, db_index=True)
    causality_assessment = models.TextField("Avaliação de causalidade", blank=True, default="")
    official_notification_id = models.CharField("ID oficial AEFI", max_length=120, blank=True, default="", db_index=True)
    notes = models.TextField("Observações", blank=True, default="")

    class Meta:
        db_table = "saude_publica_evento_adverso"
        verbose_name = "Evento Adverso Pós-Vacinação"
        verbose_name_plural = "Eventos Adversos Pós-Vacinação"
        ordering = ["-reported_at", "-created_at"]
        indexes = [
            models.Index(fields=["tenant", "patient", "reported_at"]),
            models.Index(fields=["tenant", "vaccine", "reported_at"]),
            models.Index(fields=["tenant", "severity", "status"]),
            models.Index(fields=["tenant", "official_notification_id"]),
        ]

    def clean(self):
        super().clean()
        _validate_same_tenant(self, "immunization_record")
        _validate_same_tenant(self, "patient")
        _validate_same_tenant(self, "vaccine")
        _validate_same_tenant(self, "lot")
        _validate_same_tenant(self, "reported_by")
        _validate_same_tenant(self, "investigated_by")
        if self.immunization_record_id:
            record = self.immunization_record
            if record.patient_id != self.patient_id:
                raise ValidationError({"patient": "O paciente deve ser o mesmo do registo de imunização."})
            if record.vaccine_id != self.vaccine_id:
                raise ValidationError({"vaccine": "A vacina deve ser a mesma do registo de imunização."})
            if self.lot_id and record.lot_id and self.lot_id != record.lot_id:
                raise ValidationError({"lot": "O lote deve ser o mesmo do registo de imunização."})
        if self.onset_at and self.reported_at and self.onset_at > self.reported_at:
            raise ValidationError({"onset_at": "O início dos sintomas não pode ser posterior ao reporte."})
        if self.status == self.Status.RESOLVED and self.outcome == self.Outcome.UNKNOWN:
            raise ValidationError({"outcome": "Eventos resolvidos exigem desfecho conhecido."})

    def save(self, *args, **kwargs):
        if self.immunization_record_id:
            record = self.immunization_record
            if not self.patient_id:
                self.patient_id = record.patient_id
            if not self.vaccine_id:
                self.vaccine_id = record.vaccine_id
            if not self.lot_id:
                self.lot_id = record.lot_id
        _propagate_tenant_from(self, "immunization_record")
        if self.severity in {self.Severity.SEVERE, self.Severity.CRITICAL}:
            self.serious = True
        if self.serious and not self.investigation_due_at and self.reported_at:
            self.investigation_due_at = self.reported_at + timedelta(days=7)
        self.full_clean()
        return super().save(*args, **kwargs)

    def __str__(self) -> str:
        return self.custom_id or f"AEFI {self.pk}"


class PublicHealthNotification(NoNameCoreModel):
    class OfficialSystem(models.TextChoices):
        E_SUS = "E_SUS", "e-SUS"
        SIPNI = "SIPNI", "SIPNI"
        DHIS2 = "DHIS2", "DHIS2"
        CUSTOM = "CUSTOM", "Outro"

    class EventType(models.TextChoices):
        IMMUNIZATION = "IMMUNIZATION", "Imunização"
        AEFI = "AEFI", "Evento adverso"
        CAMPAIGN_COVERAGE = "CAMPAIGN_COVERAGE", "Cobertura de campanha"

    class Status(models.TextChoices):
        PENDING = "PENDING", "Pendente"
        SENDING = "SENDING", "Enviando"
        SENT = "SENT", "Enviado"
        ACCEPTED = "ACCEPTED", "Aceito"
        REJECTED = "REJECTED", "Rejeitado"
        FAILED = "FAILED", "Falhou"

    prefix = "PHN"

    official_system = models.CharField("Sistema oficial", max_length=16, choices=OfficialSystem.choices, default=OfficialSystem.CUSTOM, db_index=True)
    event_type = models.CharField("Tipo de evento", max_length=24, choices=EventType.choices, db_index=True)
    status = models.CharField("Estado", max_length=12, choices=Status.choices, default=Status.PENDING, db_index=True)
    campaign = models.ForeignKey(
        VaccinationCampaign,
        verbose_name="Campanha",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="official_notifications",
        db_index=True,
    )
    immunization_record = models.ForeignKey(
        ImmunizationRecord,
        verbose_name="Registo de imunização",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="official_notifications",
        db_index=True,
    )
    adverse_event = models.ForeignKey(
        AdverseEventFollowingImmunization,
        verbose_name="Evento adverso",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="official_notifications",
        db_index=True,
    )
    payload = models.JSONField("Payload", blank=True, default=dict)
    response_payload = models.JSONField("Resposta", blank=True, default=dict)
    external_reference = models.CharField("Referência externa", max_length=160, blank=True, default="", db_index=True)
    attempt_count = models.PositiveSmallIntegerField("Tentativas", default=0)
    last_attempt_at = models.DateTimeField("Última tentativa", null=True, blank=True, db_index=True)
    next_retry_at = models.DateTimeField("Próxima tentativa", null=True, blank=True, db_index=True)
    sent_at = models.DateTimeField("Enviado em", null=True, blank=True, db_index=True)
    error_message = models.TextField("Erro", blank=True, default="")
    notes = models.TextField("Observações", blank=True, default="")

    class Meta:
        db_table = "saude_publica_notificacao_oficial"
        verbose_name = "Notificação Oficial"
        verbose_name_plural = "Notificações Oficiais"
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["tenant", "official_system", "status"]),
            models.Index(fields=["tenant", "event_type", "status"]),
            models.Index(fields=["tenant", "external_reference"]),
            models.Index(fields=["tenant", "next_retry_at"]),
        ]

    def clean(self):
        super().clean()
        _validate_same_tenant(self, "campaign")
        _validate_same_tenant(self, "immunization_record")
        _validate_same_tenant(self, "adverse_event")
        linked = [bool(self.campaign_id), bool(self.immunization_record_id), bool(self.adverse_event_id)]
        if not any(linked):
            raise ValidationError("Informe uma campanha, registo de imunização ou evento adverso.")
        if self.event_type == self.EventType.IMMUNIZATION and not self.immunization_record_id:
            raise ValidationError({"immunization_record": "Notificação de imunização exige registo de imunização."})
        if self.event_type == self.EventType.AEFI and not self.adverse_event_id:
            raise ValidationError({"adverse_event": "Notificação AEFI exige evento adverso."})
        if self.event_type == self.EventType.CAMPAIGN_COVERAGE and not self.campaign_id:
            raise ValidationError({"campaign": "Notificação de cobertura exige campanha."})
        if self.status in {self.Status.SENT, self.Status.ACCEPTED} and not self.sent_at:
            raise ValidationError({"sent_at": "Notificações enviadas exigem data de envio."})

    def save(self, *args, **kwargs):
        for field_name in ("immunization_record", "adverse_event", "campaign"):
            _propagate_tenant_from(self, field_name)
        if self.status in {self.Status.SENT, self.Status.ACCEPTED} and not self.sent_at:
            self.sent_at = timezone.now()
        if self.status in {self.Status.SENDING, self.Status.SENT, self.Status.ACCEPTED, self.Status.REJECTED, self.Status.FAILED}:
            if not self.last_attempt_at:
                self.last_attempt_at = timezone.now()
            if self.attempt_count == 0:
                self.attempt_count = 1
        self.full_clean()
        return super().save(*args, **kwargs)

    def __str__(self) -> str:
        return self.external_reference or self.custom_id or f"Notificação {self.pk}"


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
