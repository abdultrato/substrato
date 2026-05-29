from __future__ import annotations

from datetime import timedelta
from decimal import Decimal

from django.core.exceptions import ValidationError
from django.core.validators import MaxValueValidator, MinValueValidator
from django.db import models
from django.utils import timezone

from core.mixins.model.position import ScopedPositionMixin
from core.models.base import CoreModel, NoNameCoreModel

ZERO = Decimal("0.00")
PERCENT_VALIDATORS = [MinValueValidator(Decimal("0.00")), MaxValueValidator(Decimal("100.00"))]
POSITIVE_DECIMAL_VALIDATORS = [MinValueValidator(Decimal("0.001"))]


class DoseUnit(models.TextChoices):
    MG = "MG", "mg"
    G = "G", "g"
    MCG = "MCG", "mcg"
    ML = "ML", "ml"
    L = "L", "L"
    IU = "IU", "UI"
    UNIT = "UNIT", "unidade"


class ClinicalPharmacyIVPreparation(NoNameCoreModel):
    class PreparationType(models.TextChoices):
        IV_ADMIXTURE = "IV_ADMIXTURE", "Mistura intravenosa"
        CHEMOTHERAPY = "CHEMOTHERAPY", "Quimioterápico"
        TPN = "TPN", "Nutrição parenteral total"
        ANTIBIOTIC = "ANTIBIOTIC", "Antibiótico intravenoso"
        BIOLOGIC = "BIOLOGIC", "Biológico"
        OTHER = "OTHER", "Outra"

    class Status(models.TextChoices):
        REQUESTED = "REQUESTED", "Solicitada"
        VERIFIED = "VERIFIED", "Verificada"
        IN_PREPARATION = "IN_PREPARATION", "Em preparação"
        PREPARED = "PREPARED", "Preparada"
        DISPENSED = "DISPENSED", "Dispensada"
        ADMINISTERED = "ADMINISTERED", "Administrada"
        REJECTED = "REJECTED", "Rejeitada"
        CANCELLED = "CANCELLED", "Cancelada"

    class Priority(models.TextChoices):
        ROUTINE = "ROUTINE", "Rotina"
        URGENT = "URGENT", "Urgente"
        STAT = "STAT", "Emergência"

    prefix = "CIV"

    patient = models.ForeignKey(
        "clinical.Patient",
        verbose_name="Paciente",
        on_delete=models.PROTECT,
        related_name="clinical_pharmacy_preparations",
        db_index=True,
    )
    prescription_item = models.ForeignKey(
        "prontuario.PrescriptionItem",
        verbose_name="Item de prescrição",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="clinical_pharmacy_preparations",
        db_index=True,
    )
    product = models.ForeignKey(
        "farmacia.Product",
        verbose_name="Produto final",
        on_delete=models.PROTECT,
        null=True,
        blank=True,
        related_name="clinical_pharmacy_preparations",
        db_index=True,
    )
    lot = models.ForeignKey(
        "farmacia.Lot",
        verbose_name="Lote do produto final",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="clinical_pharmacy_preparations",
    )
    pharmacist = models.ForeignKey(
        "recursos_humanos.Employee",
        verbose_name="Farmacêutico responsável",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="clinical_pharmacy_preparations",
        db_index=True,
    )
    verifier = models.ForeignKey(
        "recursos_humanos.Employee",
        verbose_name="Verificador",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="verified_clinical_pharmacy_preparations",
    )
    prepared_by = models.ForeignKey(
        "recursos_humanos.Employee",
        verbose_name="Preparado por",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="prepared_clinical_pharmacy_preparations",
    )
    preparation_type = models.CharField("Tipo de preparação", max_length=20, choices=PreparationType.choices, db_index=True)
    status = models.CharField("Estado", max_length=20, choices=Status.choices, default=Status.REQUESTED, db_index=True)
    priority = models.CharField("Prioridade", max_length=16, choices=Priority.choices, default=Priority.ROUTINE, db_index=True)
    requested_at = models.DateTimeField("Solicitada em", default=timezone.now, db_index=True)
    scheduled_at = models.DateTimeField("Agendada para", null=True, blank=True, db_index=True)
    verified_at = models.DateTimeField("Verificada em", null=True, blank=True)
    prepared_at = models.DateTimeField("Preparada em", null=True, blank=True, db_index=True)
    dispensed_at = models.DateTimeField("Dispensada em", null=True, blank=True)
    expires_at = models.DateTimeField("Expira em", null=True, blank=True, db_index=True)
    dose_value = models.DecimalField("Dose", max_digits=12, decimal_places=3, default=ZERO, validators=[MinValueValidator(ZERO)])
    dose_unit = models.CharField("Unidade da dose", max_length=8, choices=DoseUnit.choices, default=DoseUnit.MG)
    final_volume_ml = models.DecimalField("Volume final (ml)", max_digits=12, decimal_places=3, default=ZERO, validators=[MinValueValidator(ZERO)])
    route = models.CharField("Via", max_length=80, blank=True, default="IV")
    diluent = models.CharField("Diluente", max_length=120, blank=True, default="")
    container_type = models.CharField("Tipo de recipiente", max_length=120, blank=True, default="")
    infusion_duration_minutes = models.PositiveSmallIntegerField("Duração da infusão (min)", default=0)
    protocol_reference = models.CharField("Protocolo", max_length=180, blank=True, default="")
    sterility_check_passed = models.BooleanField("Controlo de esterilidade aprovado", default=False, db_index=True)
    compatibility_check_passed = models.BooleanField("Compatibilidade aprovada", default=False, db_index=True)
    hazardous_drug = models.BooleanField("Medicamento perigoso", default=False, db_index=True)
    beyond_use_hours = models.PositiveSmallIntegerField("Validade após preparo (h)", default=24, validators=[MinValueValidator(1)])
    rejection_reason = models.TextField("Motivo de rejeição", blank=True, default="")
    notes = models.TextField("Observações", blank=True, default="")

    class Meta:
        db_table = "farmacia_clinica_preparacao_iv"
        verbose_name = "Preparação IV"
        verbose_name_plural = "Preparações IV"
        ordering = ["-requested_at", "-created_at"]
        indexes = [
            models.Index(fields=["tenant", "patient", "requested_at"]),
            models.Index(fields=["tenant", "preparation_type", "status"]),
            models.Index(fields=["tenant", "priority", "scheduled_at"]),
            models.Index(fields=["tenant", "pharmacist", "requested_at"]),
            models.Index(fields=["tenant", "prepared_at"]),
        ]

    def clean(self):
        super().clean()
        _validate_same_tenant(self, "patient")
        _validate_same_tenant(self, "prescription_item")
        _validate_same_tenant(self, "product")
        _validate_same_tenant(self, "lot")
        _validate_same_tenant(self, "pharmacist")
        _validate_same_tenant(self, "verifier")
        _validate_same_tenant(self, "prepared_by")
        _validate_prescription_patient_match(self)
        if self.lot_id and self.product_id and self.lot.product_id != self.product_id:
            raise ValidationError({"lot": "O lote deve pertencer ao produto final da preparação."})
        if self.lot_id and self.preparation_type != self.PreparationType.TPN and self.lot.is_expired:
            raise ValidationError({"lot": "Não é permitido preparar com lote vencido."})
        if self.preparation_type == self.PreparationType.CHEMOTHERAPY and not self.hazardous_drug:
            raise ValidationError({"hazardous_drug": "Quimioterápicos devem ser marcados como medicamento perigoso."})
        if self.preparation_type == self.PreparationType.TPN and self.final_volume_ml <= ZERO:
            raise ValidationError({"final_volume_ml": "TPN deve ter volume final informado."})
        if self.expires_at and self.prepared_at and self.expires_at <= self.prepared_at:
            raise ValidationError({"expires_at": "A validade deve ser posterior ao horário de preparo."})

    def save(self, *args, **kwargs):
        _propagate_tenant_from(self, "patient")
        if self.prescription_item_id:
            if not self.product_id:
                self.product_id = self.prescription_item.medication_id
            if self.dose_value == ZERO:
                self.dose_value = self.prescription_item.dosage_value
            if self.dose_unit == DoseUnit.MG and self.prescription_item.dosage_unit in DoseUnit.values:
                self.dose_unit = self.prescription_item.dosage_unit
        if self.lot_id and not self.product_id:
            self.product_id = self.lot.product_id
        if self.prepared_at and not self.expires_at:
            self.expires_at = self.prepared_at + timedelta(hours=self.beyond_use_hours)
        if self.prepared_at and self.status in {self.Status.REQUESTED, self.Status.VERIFIED, self.Status.IN_PREPARATION}:
            self.status = self.Status.PREPARED
        self.full_clean()
        return super().save(*args, **kwargs)

    def __str__(self) -> str:
        return self.custom_id or f"Preparação IV {self.pk}"


class ClinicalPharmacyIngredient(ScopedPositionMixin, NoNameCoreModel):
    class IngredientRole(models.TextChoices):
        ACTIVE = "ACTIVE", "Ativo"
        DILUENT = "DILUENT", "Diluente"
        ELECTROLYTE = "ELECTROLYTE", "Eletrólito"
        ADDITIVE = "ADDITIVE", "Aditivo"
        SOLVENT = "SOLVENT", "Solvente"
        OTHER = "OTHER", "Outro"

    prefix = "CPI"
    position_scope_fields = ("preparation",)

    preparation = models.ForeignKey(
        ClinicalPharmacyIVPreparation,
        verbose_name="Preparação",
        on_delete=models.CASCADE,
        related_name="ingredients",
        db_index=True,
    )
    product = models.ForeignKey(
        "farmacia.Product",
        verbose_name="Produto",
        on_delete=models.PROTECT,
        related_name="clinical_pharmacy_ingredients",
        db_index=True,
    )
    lot = models.ForeignKey(
        "farmacia.Lot",
        verbose_name="Lote",
        on_delete=models.PROTECT,
        related_name="clinical_pharmacy_ingredients",
        db_index=True,
    )
    role = models.CharField("Função", max_length=16, choices=IngredientRole.choices, default=IngredientRole.ACTIVE, db_index=True)
    quantity_value = models.DecimalField("Quantidade", max_digits=12, decimal_places=3, validators=POSITIVE_DECIMAL_VALIDATORS)
    quantity_unit = models.CharField("Unidade", max_length=8, choices=DoseUnit.choices, default=DoseUnit.MG)
    concentration = models.CharField("Concentração", max_length=80, blank=True, default="")
    controlled_substance = models.BooleanField("Substância controlada", default=False, db_index=True)
    hazardous = models.BooleanField("Perigoso", default=False, db_index=True)
    notes = models.TextField("Observações", blank=True, default="")

    class Meta:
        db_table = "farmacia_clinica_ingrediente"
        verbose_name = "Ingrediente de Preparação IV"
        verbose_name_plural = "Ingredientes de Preparação IV"
        ordering = ["preparation", "position", "id"]
        indexes = [
            models.Index(fields=["tenant", "preparation", "position"]),
            models.Index(fields=["tenant", "product"]),
            models.Index(fields=["tenant", "lot"]),
            models.Index(fields=["tenant", "controlled_substance"]),
        ]

    def clean(self):
        super().clean()
        _validate_same_tenant(self, "preparation")
        _validate_same_tenant(self, "product")
        _validate_same_tenant(self, "lot")
        if self.lot_id and self.product_id and self.lot.product_id != self.product_id:
            raise ValidationError({"lot": "O lote deve pertencer ao produto do ingrediente."})
        if self.lot_id and self.lot.is_expired:
            raise ValidationError({"lot": "Não é permitido usar lote vencido na preparação."})
        if self.preparation_id and self.product_id and self.preparation.product_id == self.product_id and self.role == self.IngredientRole.DILUENT:
            raise ValidationError({"role": "O produto final não deve ser registado como diluente."})

    def save(self, *args, **kwargs):
        _propagate_tenant_from(self, "preparation")
        self.full_clean()
        return super().save(*args, **kwargs)

    def __str__(self) -> str:
        return self.custom_id or f"Ingrediente {self.pk}"


class DrugInteractionRule(CoreModel):
    class Severity(models.TextChoices):
        MINOR = "MINOR", "Menor"
        MODERATE = "MODERATE", "Moderada"
        MAJOR = "MAJOR", "Grave"
        CONTRAINDICATED = "CONTRAINDICATED", "Contraindicada"

    prefix = "DIR"

    primary_drug = models.ForeignKey(
        "farmacia.Product",
        verbose_name="Medicamento primário",
        on_delete=models.PROTECT,
        related_name="primary_interaction_rules",
        db_index=True,
    )
    interacting_drug = models.ForeignKey(
        "farmacia.Product",
        verbose_name="Medicamento interagente",
        on_delete=models.PROTECT,
        related_name="interacting_rules",
        db_index=True,
    )
    severity = models.CharField("Gravidade", max_length=16, choices=Severity.choices, db_index=True)
    mechanism = models.TextField("Mecanismo", blank=True, default="")
    clinical_effect = models.TextField("Efeito clínico", blank=True, default="")
    recommendation = models.TextField("Recomendação")
    active = models.BooleanField("Ativa", default=True, db_index=True)

    class Meta:
        db_table = "farmacia_clinica_interacao_regra"
        verbose_name = "Regra de Interação Medicamentosa"
        verbose_name_plural = "Regras de Interações Medicamentosas"
        ordering = ["severity", "name"]
        constraints = [
            models.UniqueConstraint(fields=["tenant", "primary_drug", "interacting_drug"], name="uq_drug_interaction_pair_tenant"),
        ]
        indexes = [
            models.Index(fields=["tenant", "severity", "active"]),
            models.Index(fields=["tenant", "primary_drug", "interacting_drug"]),
        ]

    def clean(self):
        super().clean()
        _validate_same_tenant(self, "primary_drug")
        _validate_same_tenant(self, "interacting_drug")
        if self.primary_drug_id and self.interacting_drug_id and self.primary_drug_id == self.interacting_drug_id:
            raise ValidationError({"interacting_drug": "A regra deve envolver medicamentos diferentes."})

    def save(self, *args, **kwargs):
        if not self.name and self.primary_drug_id and self.interacting_drug_id:
            self.name = f"{self.primary_drug.name} + {self.interacting_drug.name}"
        self.full_clean()
        return super().save(*args, **kwargs)

    def matches_pair(self, primary_id: int, interacting_id: int) -> bool:
        return {self.primary_drug_id, self.interacting_drug_id} == {primary_id, interacting_id}


class MedicationInteractionCheck(NoNameCoreModel):
    class Status(models.TextChoices):
        PENDING = "PENDING", "Pendente"
        REVIEWED = "REVIEWED", "Revista"
        OVERRIDDEN = "OVERRIDDEN", "Justificada"
        CLEARED = "CLEARED", "Liberada"

    prefix = "MIC"

    patient = models.ForeignKey(
        "clinical.Patient",
        verbose_name="Paciente",
        on_delete=models.PROTECT,
        related_name="medication_interaction_checks",
        db_index=True,
    )
    prescription_item = models.ForeignKey(
        "prontuario.PrescriptionItem",
        verbose_name="Item de prescrição",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="interaction_checks",
        db_index=True,
    )
    primary_drug = models.ForeignKey(
        "farmacia.Product",
        verbose_name="Medicamento primário",
        on_delete=models.PROTECT,
        related_name="primary_interaction_checks",
        db_index=True,
    )
    interacting_drug = models.ForeignKey(
        "farmacia.Product",
        verbose_name="Medicamento interagente",
        on_delete=models.PROTECT,
        related_name="interacting_checks",
        db_index=True,
    )
    rule = models.ForeignKey(
        DrugInteractionRule,
        verbose_name="Regra aplicada",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="checks",
    )
    severity = models.CharField("Gravidade", max_length=16, choices=DrugInteractionRule.Severity.choices, default=DrugInteractionRule.Severity.MODERATE, db_index=True)
    status = models.CharField("Estado", max_length=16, choices=Status.choices, default=Status.PENDING, db_index=True)
    checked_at = models.DateTimeField("Verificada em", default=timezone.now, db_index=True)
    pharmacist = models.ForeignKey(
        "recursos_humanos.Employee",
        verbose_name="Farmacêutico",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="medication_interaction_checks",
    )
    clinical_context = models.TextField("Contexto clínico", blank=True, default="")
    recommendation = models.TextField("Recomendação", blank=True, default="")
    action_taken = models.TextField("Conduta tomada", blank=True, default="")
    override_reason = models.TextField("Justificação", blank=True, default="")
    notes = models.TextField("Observações", blank=True, default="")

    class Meta:
        db_table = "farmacia_clinica_interacao_verificacao"
        verbose_name = "Verificação de Interação Medicamentosa"
        verbose_name_plural = "Verificações de Interações Medicamentosas"
        ordering = ["-checked_at", "-created_at"]
        indexes = [
            models.Index(fields=["tenant", "patient", "checked_at"]),
            models.Index(fields=["tenant", "severity", "status"]),
            models.Index(fields=["tenant", "primary_drug", "interacting_drug"]),
        ]

    def clean(self):
        super().clean()
        _validate_same_tenant(self, "patient")
        _validate_same_tenant(self, "prescription_item")
        _validate_same_tenant(self, "primary_drug")
        _validate_same_tenant(self, "interacting_drug")
        _validate_same_tenant(self, "rule")
        _validate_same_tenant(self, "pharmacist")
        _validate_prescription_patient_match(self)
        if self.primary_drug_id and self.interacting_drug_id and self.primary_drug_id == self.interacting_drug_id:
            raise ValidationError({"interacting_drug": "A verificação deve envolver medicamentos diferentes."})
        if self.rule_id and self.primary_drug_id and self.interacting_drug_id and not self.rule.matches_pair(self.primary_drug_id, self.interacting_drug_id):
            raise ValidationError({"rule": "A regra selecionada não corresponde ao par de medicamentos."})
        if self.status == self.Status.OVERRIDDEN and not self.override_reason:
            raise ValidationError({"override_reason": "Informe a justificação para liberar uma interação."})

    def save(self, *args, **kwargs):
        _propagate_tenant_from(self, "patient")
        if self.prescription_item_id and not self.primary_drug_id:
            self.primary_drug_id = self.prescription_item.medication_id
        if not self.rule_id and self.primary_drug_id and self.interacting_drug_id and self.tenant_id:
            self.rule = _find_interaction_rule(self.tenant_id, self.primary_drug_id, self.interacting_drug_id)
        if self.rule_id:
            self.severity = self.rule.severity
            if not self.recommendation:
                self.recommendation = self.rule.recommendation
        self.full_clean()
        return super().save(*args, **kwargs)

    def __str__(self) -> str:
        return self.custom_id or f"Interação {self.pk}"


class ControlledSubstanceMovement(NoNameCoreModel):
    class MovementType(models.TextChoices):
        RECEIPT = "RECEIPT", "Receção"
        DISPENSE = "DISPENSE", "Dispensa"
        ADMINISTER = "ADMINISTER", "Administração"
        RETURN = "RETURN", "Devolução"
        WASTE = "WASTE", "Descarte"
        ADJUSTMENT = "ADJUSTMENT", "Ajuste"

    class ControlledSchedule(models.TextChoices):
        SCHEDULE_I = "SCHEDULE_I", "Lista I"
        SCHEDULE_II = "SCHEDULE_II", "Lista II"
        SCHEDULE_III = "SCHEDULE_III", "Lista III"
        SCHEDULE_IV = "SCHEDULE_IV", "Lista IV"
        OTHER = "OTHER", "Outra"

    prefix = "CSM"

    product = models.ForeignKey(
        "farmacia.Product",
        verbose_name="Produto controlado",
        on_delete=models.PROTECT,
        related_name="controlled_substance_movements",
        db_index=True,
    )
    lot = models.ForeignKey(
        "farmacia.Lot",
        verbose_name="Lote",
        on_delete=models.PROTECT,
        related_name="controlled_substance_movements",
        db_index=True,
    )
    patient = models.ForeignKey(
        "clinical.Patient",
        verbose_name="Paciente",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="controlled_substance_movements",
        db_index=True,
    )
    prescription_item = models.ForeignKey(
        "prontuario.PrescriptionItem",
        verbose_name="Item de prescrição",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="controlled_substance_movements",
    )
    preparation = models.ForeignKey(
        ClinicalPharmacyIVPreparation,
        verbose_name="Preparação IV",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="controlled_substance_movements",
    )
    movement_type = models.CharField("Tipo de movimento", max_length=16, choices=MovementType.choices, db_index=True)
    schedule = models.CharField("Lista de controlo", max_length=16, choices=ControlledSchedule.choices, default=ControlledSchedule.OTHER, db_index=True)
    quantity = models.DecimalField("Quantidade", max_digits=12, decimal_places=3, validators=POSITIVE_DECIMAL_VALIDATORS)
    unit = models.CharField("Unidade", max_length=8, choices=DoseUnit.choices, default=DoseUnit.MG)
    movement_at = models.DateTimeField("Movimentado em", default=timezone.now, db_index=True)
    responsible = models.ForeignKey(
        "recursos_humanos.Employee",
        verbose_name="Responsável",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="controlled_substance_movements",
        db_index=True,
    )
    witness = models.ForeignKey(
        "recursos_humanos.Employee",
        verbose_name="Testemunha",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="witnessed_controlled_substance_movements",
    )
    source = models.CharField("Origem", max_length=120, blank=True, default="")
    destination = models.CharField("Destino", max_length=120, blank=True, default="")
    reason = models.TextField("Motivo", blank=True, default="")
    running_balance = models.DecimalField("Saldo rastreado", max_digits=12, decimal_places=3, default=ZERO)
    chain_of_custody_code = models.CharField("Código de custódia", max_length=80, blank=True, default="", db_index=True)
    notes = models.TextField("Observações", blank=True, default="")

    class Meta:
        db_table = "farmacia_clinica_controlado_movimento"
        verbose_name = "Movimento de Substância Controlada"
        verbose_name_plural = "Movimentos de Substâncias Controladas"
        ordering = ["-movement_at", "-created_at"]
        indexes = [
            models.Index(fields=["tenant", "product", "movement_at"]),
            models.Index(fields=["tenant", "lot", "movement_at"]),
            models.Index(fields=["tenant", "movement_type"]),
            models.Index(fields=["tenant", "schedule"]),
            models.Index(fields=["tenant", "patient", "movement_at"]),
        ]

    @property
    def signed_quantity(self) -> Decimal:
        if self.movement_type in {self.MovementType.DISPENSE, self.MovementType.ADMINISTER, self.MovementType.WASTE}:
            return -self.quantity
        return self.quantity

    def clean(self):
        super().clean()
        _validate_same_tenant(self, "product")
        _validate_same_tenant(self, "lot")
        _validate_same_tenant(self, "patient")
        _validate_same_tenant(self, "prescription_item")
        _validate_same_tenant(self, "preparation")
        _validate_same_tenant(self, "responsible")
        _validate_same_tenant(self, "witness")
        _validate_prescription_patient_match(self)
        _validate_preparation_patient_match(self)
        if self.lot_id and self.product_id and self.lot.product_id != self.product_id:
            raise ValidationError({"lot": "O lote deve pertencer ao produto controlado."})
        if self.movement_type in {self.MovementType.WASTE, self.MovementType.ADJUSTMENT} and not self.witness_id:
            raise ValidationError({"witness": "Descartes e ajustes de controlados exigem testemunha."})
        if self.movement_type in {self.MovementType.DISPENSE, self.MovementType.ADMINISTER, self.MovementType.WASTE} and self.lot_id and self.lot.is_expired:
            raise ValidationError({"lot": "Não é permitido sair substância controlada de lote vencido."})

    def save(self, *args, **kwargs):
        _propagate_tenant_from(self, "product")
        if not self.tenant_id:
            _propagate_tenant_from(self, "lot")
        if self.lot_id and not self.product_id:
            self.product_id = self.lot.product_id
        if self.preparation_id and not self.patient_id:
            self.patient_id = self.preparation.patient_id
        self.full_clean()
        self.running_balance = self._running_balance_before_save() + self.signed_quantity
        return super().save(*args, **kwargs)

    def _running_balance_before_save(self) -> Decimal:
        if not self.tenant_id or not self.lot_id:
            return ZERO
        queryset = self.__class__.all_objects.filter(tenant_id=self.tenant_id, lot_id=self.lot_id, deleted=False)
        if self.pk:
            queryset = queryset.exclude(pk=self.pk)
        total = ZERO
        for movement in queryset.only("movement_type", "quantity"):
            total += movement.signed_quantity
        return total

    def __str__(self) -> str:
        return self.custom_id or f"Controlado {self.pk}"


class AntibioticStewardshipReview(NoNameCoreModel):
    class TherapyType(models.TextChoices):
        EMPIRIC = "EMPIRIC", "Empírica"
        TARGETED = "TARGETED", "Guiada por cultura"
        PROPHYLAXIS = "PROPHYLAXIS", "Profilaxia"
        OTHER = "OTHER", "Outra"

    class Status(models.TextChoices):
        PENDING = "PENDING", "Pendente"
        APPROVED = "APPROVED", "Aprovada"
        DEESCALATE = "DEESCALATE", "Descalonar"
        ESCALATE = "ESCALATE", "Escalonar"
        STOP = "STOP", "Suspender"
        COMPLETED = "COMPLETED", "Concluída"

    prefix = "ASR"

    patient = models.ForeignKey(
        "clinical.Patient",
        verbose_name="Paciente",
        on_delete=models.PROTECT,
        related_name="antibiotic_stewardship_reviews",
        db_index=True,
    )
    prescription_item = models.ForeignKey(
        "prontuario.PrescriptionItem",
        verbose_name="Item de prescrição",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="antibiotic_stewardship_reviews",
        db_index=True,
    )
    antibiotic = models.ForeignKey(
        "farmacia.Product",
        verbose_name="Antibiótico",
        on_delete=models.PROTECT,
        related_name="antibiotic_stewardship_reviews",
        db_index=True,
    )
    reviewer = models.ForeignKey(
        "recursos_humanos.Employee",
        verbose_name="Revisor",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="antibiotic_stewardship_reviews",
    )
    therapy_type = models.CharField("Tipo de terapia", max_length=16, choices=TherapyType.choices, default=TherapyType.EMPIRIC, db_index=True)
    status = models.CharField("Estado", max_length=16, choices=Status.choices, default=Status.PENDING, db_index=True)
    indication = models.TextField("Indicação")
    infection_site = models.CharField("Foco infeccioso", max_length=120, blank=True, default="", db_index=True)
    organism = models.CharField("Microrganismo", max_length=120, blank=True, default="", db_index=True)
    culture_result = models.TextField("Resultado de cultura", blank=True, default="")
    start_date = models.DateField("Início", default=timezone.localdate, db_index=True)
    planned_duration_days = models.PositiveSmallIntegerField("Duração planeada (dias)", default=7, validators=[MinValueValidator(1)])
    review_due_date = models.DateField("Revisão até", null=True, blank=True, db_index=True)
    reviewed_at = models.DateTimeField("Revista em", null=True, blank=True, db_index=True)
    renal_adjustment_required = models.BooleanField("Requer ajuste renal", default=False)
    dose_optimized = models.BooleanField("Dose otimizada", default=False)
    deescalation_recommended = models.BooleanField("Descalonamento recomendado", default=False, db_index=True)
    escalation_reason = models.TextField("Motivo de escalonamento", blank=True, default="")
    recommendation = models.TextField("Recomendação", blank=True, default="")
    action_taken = models.TextField("Conduta tomada", blank=True, default="")
    notes = models.TextField("Observações", blank=True, default="")

    class Meta:
        db_table = "farmacia_clinica_antibiotico_revisao"
        verbose_name = "Revisão de Terapia Antibiótica"
        verbose_name_plural = "Revisões de Terapia Antibiótica"
        ordering = ["-start_date", "-created_at"]
        indexes = [
            models.Index(fields=["tenant", "patient", "start_date"]),
            models.Index(fields=["tenant", "antibiotic", "start_date"]),
            models.Index(fields=["tenant", "therapy_type", "status"]),
            models.Index(fields=["tenant", "review_due_date"]),
            models.Index(fields=["tenant", "infection_site"]),
        ]

    def clean(self):
        super().clean()
        _validate_same_tenant(self, "patient")
        _validate_same_tenant(self, "prescription_item")
        _validate_same_tenant(self, "antibiotic")
        _validate_same_tenant(self, "reviewer")
        _validate_prescription_patient_match(self)
        if self.prescription_item_id and self.antibiotic_id and self.prescription_item.medication_id != self.antibiotic_id:
            raise ValidationError({"antibiotic": "O antibiótico deve corresponder ao item de prescrição."})
        if self.status == self.Status.ESCALATE and not self.escalation_reason:
            raise ValidationError({"escalation_reason": "Informe o motivo de escalonamento."})
        if self.reviewed_at and not self.recommendation:
            raise ValidationError({"recommendation": "Informe a recomendação da revisão."})

    def save(self, *args, **kwargs):
        _propagate_tenant_from(self, "patient")
        if self.prescription_item_id and not self.antibiotic_id:
            self.antibiotic_id = self.prescription_item.medication_id
        if not self.review_due_date and self.start_date:
            self.review_due_date = self.start_date + timedelta(days=2)
        self.full_clean()
        return super().save(*args, **kwargs)

    def __str__(self) -> str:
        return self.custom_id or f"Revisão antibiótica {self.pk}"


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


def _validate_prescription_patient_match(instance) -> None:
    prescription_item_id = getattr(instance, "prescription_item_id", None)
    patient_id = getattr(instance, "patient_id", None)
    if not prescription_item_id or not patient_id:
        return
    record = getattr(instance.prescription_item, "record", None)
    if record is not None and getattr(record, "patient_id", None) != patient_id:
        raise ValidationError({"prescription_item": "A prescrição deve pertencer ao paciente informado."})


def _validate_preparation_patient_match(instance) -> None:
    preparation_id = getattr(instance, "preparation_id", None)
    patient_id = getattr(instance, "patient_id", None)
    if not preparation_id or not patient_id:
        return
    if getattr(instance.preparation, "patient_id", None) != patient_id:
        raise ValidationError({"preparation": "A preparação IV deve pertencer ao paciente informado."})


def _find_interaction_rule(tenant_id: int, primary_id: int, interacting_id: int):
    return (
        DrugInteractionRule.objects.filter(tenant_id=tenant_id, active=True)
        .filter(
            models.Q(primary_drug_id=primary_id, interacting_drug_id=interacting_id)
            | models.Q(primary_drug_id=interacting_id, interacting_drug_id=primary_id)
        )
        .order_by("-severity", "-created_at")
        .first()
    )
