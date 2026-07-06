"""Modelos do banco de sangue com foco em doacao, transfusao e estoque."""

from __future__ import annotations

import datetime

from django.conf import settings
from django.core.exceptions import ValidationError
from django.db import models
from django.utils import timezone

from apps.bloodbank.services.compatibility import (
    compatibility_error_message,
    is_blood_compatible,
)
from core.models.base import NoNameCoreModel
from domain.bloodbank.state_machines import (
    BloodDispatchOutcomePolicy,
    BloodDonationStateMachine,
    BloodTransfusionStateMachine,
    BloodUnitStateMachine,
)

User = settings.AUTH_USER_MODEL


class BloodType(models.TextChoices):
    """Tipos sanguineos cadastrados no sistema."""

    O_NEGATIVE = "O-", "O negativo"
    O_POSITIVE = "O+", "O positivo"
    A_NEGATIVE = "A-", "A negativo"
    A_POSITIVE = "A+", "A positivo"
    B_NEGATIVE = "B-", "B negativo"
    B_POSITIVE = "B+", "B positivo"
    AB_NEGATIVE = "AB-", "AB negativo"
    AB_POSITIVE = "AB+", "AB positivo"
    UNKNOWN = "UNK", "Não informado"


class BloodComponentType(models.TextChoices):
    """Componentes hemoterapicos derivados da doacao."""

    WHOLE_BLOOD = "WB", "Sangue total"
    RED_BLOOD_CELLS = "RBC", "Concentrado de hemacias"
    PLASMA = "PLS", "Plasma fresco"
    PLATELETS = "PLT", "Concentrado de plaquetas"
    CRYOPRECIPITATE = "CRY", "Crioprecipitado"


class BloodDonation(NoNameCoreModel):
    """
    Registro de uma doacao de sangue.
    """

    prefix = "DON"

    class DonorRole(models.TextChoices):
        VOLUNTARY = "VOL", "Voluntario"
        REPLACEMENT = "REP", "Repositor"

    class TestResult(models.TextChoices):
        PENDING = "PEN", "Pendente"
        NEGATIVE = "NEG", "Negativo"
        POSITIVE = "POS", "Positivo"
        INCONCLUSIVE = "INC", "Inconclusivo"
        NOT_DONE = "NDO", "Não realizado"

    class DonationType(models.TextChoices):
        WHOLE_BLOOD = "WBL", "Sangue total"
        APHERESIS = "APH", "Aferese"

    class DonationStatus(models.TextChoices):
        REGISTERED = "REG", "Registrada"
        SCREENING = "SCR", "Em triagem"
        COMPLETED = "COM", "Concluida"
        CANCELED = "CAN", "Cancelada"

    class ScreeningStatus(models.TextChoices):
        PENDING = "PEN", "Pendente"
        APPROVED = "APR", "Aprovada"
        REJECTED = "REJ", "Rejeitada"

    donor = models.ForeignKey(
        "clinical.Patient",
        db_column="donor_id",
        verbose_name="Doador",
        on_delete=models.PROTECT,
        related_name="blood_donations",
        db_index=True,
    )
    donor_role = models.CharField(
        db_column="donor_role",
        verbose_name="Tipo de doador",
        max_length=3,
        choices=DonorRole.choices,
        default=DonorRole.VOLUNTARY,
        db_index=True,
    )
    replacement_for = models.ForeignKey(
        "clinical.Patient",
        db_column="replacement_for_id",
        verbose_name="Reposição para (paciente)",
        on_delete=models.SET_NULL,
        related_name="replacement_blood_donations",
        null=True,
        blank=True,
        db_index=True,
    )
    collected_by = models.ForeignKey(
        User,
        db_column="collected_by_id",
        verbose_name="Profissional da coleta",
        on_delete=models.SET_NULL,
        related_name="blood_donations_collected",
        null=True,
        blank=True,
        db_index=True,
    )

    bag_identifier = models.CharField(
        db_column="bag_identifier",
        verbose_name="Identificador da bolsa",
        max_length=40,
        db_index=True,
        blank=True,
        default="",
        help_text="Gerado automaticamente a partir do custom_id quando não informado.",
    )
    blood_type = models.CharField(
        db_column="blood_type",
        verbose_name="Tipo sanguíneo",
        max_length=3,
        choices=BloodType.choices,
        default=BloodType.UNKNOWN,
        db_index=True,
    )
    donation_type = models.CharField(
        db_column="donation_type",
        verbose_name="Tipo de doação",
        max_length=3,
        choices=DonationType.choices,
        default=DonationType.WHOLE_BLOOD,
        db_index=True,
    )
    status = models.CharField(
        db_column="status",
        verbose_name="Estado da doação",
        max_length=3,
        choices=DonationStatus.choices,
        default=DonationStatus.REGISTERED,
        db_index=True,
    )
    screening_status = models.CharField(
        db_column="screening_status",
        verbose_name="Estado da triagem",
        max_length=3,
        choices=ScreeningStatus.choices,
        default=ScreeningStatus.PENDING,
        db_index=True,
    )
    collected_at = models.DateTimeField(
        db_column="collected_at",
        verbose_name="Data/hora da coleta",
        default=timezone.now,
        db_index=True,
    )
    processed_at = models.DateTimeField(
        db_column="processed_at",
        verbose_name="Data/hora do processamento",
        null=True,
        blank=True,
        db_index=True,
    )
    volume_ml = models.PositiveIntegerField(
        db_column="volume_ml",
        verbose_name="Volume coletado (ml)",
        default=450,
    )
    donor_weight_kg = models.DecimalField(
        db_column="donor_weight_kg",
        verbose_name="Peso do doador (kg)",
        max_digits=5,
        decimal_places=2,
        null=True,
        blank=True,
    )
    hemoglobin_g_dl = models.DecimalField(
        db_column="hemoglobin_g_dl",
        verbose_name="Hemoglobina (g/dL)",
        max_digits=4,
        decimal_places=2,
        null=True,
        blank=True,
    )
    donor_height_cm = models.PositiveIntegerField(
        db_column="donor_height_cm",
        verbose_name="Altura do doador (cm)",
        null=True,
        blank=True,
    )
    blood_pressure_systolic = models.PositiveIntegerField(
        db_column="blood_pressure_systolic",
        verbose_name="Pressão arterial sistólica (mmHg)",
        null=True,
        blank=True,
    )
    blood_pressure_diastolic = models.PositiveIntegerField(
        db_column="blood_pressure_diastolic",
        verbose_name="Pressão arterial diastólica (mmHg)",
        null=True,
        blank=True,
    )
    pulse_bpm = models.PositiveIntegerField(
        db_column="pulse_bpm",
        verbose_name="Pulso (bpm)",
        null=True,
        blank=True,
    )
    temperature_c = models.DecimalField(
        db_column="temperature_c",
        verbose_name="Temperatura (C)",
        max_digits=4,
        decimal_places=1,
        null=True,
        blank=True,
    )

    # Resultados de triagem laboratorial (por doacao).
    hiv_test = models.CharField(
        db_column="hiv_test",
        verbose_name="Teste de HIV",
        max_length=3,
        choices=TestResult.choices,
        default=TestResult.PENDING,
        db_index=True,
    )
    syphilis_rpr_test = models.CharField(
        db_column="syphilis_rpr_test",
        verbose_name="Teste de Sífilis/RPR",
        max_length=3,
        choices=TestResult.choices,
        default=TestResult.PENDING,
        db_index=True,
    )
    hepatitis_b_hbsag_test = models.CharField(
        db_column="hepatitis_b_hbsag_test",
        verbose_name="Teste de Hepatite B (HBsAg)",
        max_length=3,
        choices=TestResult.choices,
        default=TestResult.PENDING,
        db_index=True,
    )
    hepatitis_c_anti_hcv_test = models.CharField(
        db_column="hepatitis_c_anti_hcv_test",
        verbose_name="Teste de Hepatite C (anti-HCV)",
        max_length=3,
        choices=TestResult.choices,
        default=TestResult.PENDING,
        db_index=True,
    )
    malaria_test = models.CharField(
        db_column="malaria_test",
        verbose_name="Teste de Malária",
        max_length=3,
        choices=TestResult.choices,
        default=TestResult.PENDING,
        db_index=True,
    )
    test_notes = models.TextField(
        db_column="test_notes",
        verbose_name="Observações dos exames",
        blank=True,
        default="",
    )
    contraindications = models.TextField(
        db_column="contraindications",
        verbose_name="Contraindicações",
        blank=True,
        default="",
    )
    notes = models.TextField(
        db_column="notes",
        verbose_name="Observações",
        blank=True,
        default="",
    )

    class Meta:
        db_table = "bloodbank_blood_donation"
        verbose_name = "Doação de sangue"
        verbose_name_plural = "Doações de sangue"
        ordering = ["-collected_at", "-created_at"]
        constraints = [
            models.UniqueConstraint(
                fields=["tenant", "bag_identifier"],
                name="uq_blood_donation_bag_identifier_per_tenant",
            )
        ]
        indexes = [
            models.Index(fields=["tenant", "status", "collected_at"]),
            models.Index(fields=["tenant", "screening_status", "collected_at"]),
            models.Index(fields=["tenant", "blood_type", "collected_at"]),
        ]

    def __str__(self) -> str:
        return f"Doação {self.custom_id or self.pk} - {self.bag_identifier}"

    def clean(self):
        super().clean()

        if self.pk:
            previous_status = type(self).all_objects.filter(pk=self.pk).values_list("status", flat=True).first()
            BloodDonationStateMachine.validate_transition(previous_status, self.status)

        if self.donor_id and self.tenant_id and self.donor.tenant_id != self.tenant_id:
            raise ValidationError({"donor": "Doador e doacao devem pertencer ao mesmo tenant."})

        if self.replacement_for_id and self.tenant_id and self.replacement_for.tenant_id != self.tenant_id:
            raise ValidationError(
                {"replacement_for": "Paciente de reposicao e doacao devem pertencer ao mesmo tenant."}
            )

        if self.donor_role == self.DonorRole.VOLUNTARY and self.replacement_for_id:
            raise ValidationError(
                {"replacement_for": "Doador voluntário não pode ser vinculado a paciente de reposição."}
            )

        if self.donor_role == self.DonorRole.REPLACEMENT:
            if not self.replacement_for_id:
                raise ValidationError({"replacement_for": "Informe o paciente para doacao do tipo repositor."})

            if getattr(self.donor, "is_replacement_donor_inapt", False):
                until = getattr(self.donor, "replacement_donor_inapt_at", None)
                base = "Doador repositor inapto."
                msg = f"{base} Inapto desde {until:%Y-%m-%d %H:%M}." if until else base
                raise ValidationError({"donor": msg})

            # Para doador repositor, exige registro de todos os exames (nao pode ficar pendente).
            required = {
                "hiv_test": self.hiv_test,
                "syphilis_rpr_test": self.syphilis_rpr_test,
                "hepatitis_b_hbsag_test": self.hepatitis_b_hbsag_test,
                "hepatitis_c_anti_hcv_test": self.hepatitis_c_anti_hcv_test,
                "malaria_test": self.malaria_test,
            }
            errors = {}
            for field_name, value in required.items():
                if value == self.TestResult.PENDING:
                    errors[field_name] = "Para repositor, informe o resultado do exame (nao pode ficar pendente)."
            if errors:
                raise ValidationError(errors)

        # Regra geral: intervalo minimo entre doacoes conforme sexo biologico.
        if self.donor_id and self.collected_at:
            try:
                collected_date = timezone.localdate(self.collected_at)
            except Exception:
                collected_date = self.collected_at.date()

            donor_gender = str(getattr(self.donor, "gender", "") or "").strip().lower()
            minimum_interval_days = 120 if donor_gender in {"femenino", "feminino", "f"} else 90

            last = (
                BloodDonation.objects.filter(
                    tenant_id=self.tenant_id,
                    donor_id=self.donor_id,
                    deleted=False,
                )
                .exclude(pk=self.pk)
                .exclude(status=self.DonationStatus.CANCELED)
                .filter(collected_at__lt=self.collected_at)
                .order_by("-collected_at")
                .first()
            )
            if last is not None and last.collected_at:
                try:
                    last_date = timezone.localdate(last.collected_at)
                except Exception:
                    last_date = last.collected_at.date()

                next_ok = last_date + datetime.timedelta(days=minimum_interval_days)
                if collected_date < next_ok:
                    remaining_days = (next_ok - collected_date).days
                    gender_label = "feminino" if minimum_interval_days == 120 else "masculino"
                    raise ValidationError(
                        {
                            "donor": (
                                f"Nova doação ainda não permitida para este doador. "
                                f"O intervalo mínimo para sexo {gender_label} é de {minimum_interval_days} dias. "
                                f"Faltam {remaining_days} dia(s) para liberar a próxima doação, prevista para {next_ok:%Y-%m-%d}."
                            )
                        }
                    )

        if self.donor_id:
            # Elegibilidade etaria para doacao: entre 16 e 54 anos.
            birth_date = getattr(self.donor, "birth_date", None)
            if not birth_date:
                raise ValidationError({"donor": "Doador sem data de nascimento. Informe para validar a elegibilidade etaria."})

            collected_date = None
            if isinstance(self.collected_at, datetime.datetime):
                try:
                    collected_date = timezone.localdate(self.collected_at)
                except Exception:
                    collected_date = self.collected_at.date()
            if collected_date is None:
                collected_date = timezone.localdate()

            if isinstance(birth_date, datetime.date):
                years = collected_date.year - birth_date.year
                if (collected_date.month, collected_date.day) < (birth_date.month, birth_date.day):
                    years -= 1
                if years < 16:
                    raise ValidationError({"donor": "Idade minima para doacao de sangue: 16 anos."})
                if years > 54:
                    raise ValidationError({"donor": "Idade maxima para doacao de sangue: 54 anos."})

        if self.processed_at and self.collected_at and self.processed_at < self.collected_at:
            raise ValidationError({"processed_at": "Processamento nao pode ser anterior a coleta."})

        if self.volume_ml <= 0:
            raise ValidationError({"volume_ml": "Volume coletado deve ser maior que zero."})

        if self.donor_weight_kg is not None and self.donor_weight_kg < 50:
            raise ValidationError({"donor_weight_kg": "Peso minimo para doacao: 50 kg."})

        if self.screening_status == self.ScreeningStatus.APPROVED:
            required_negative = {
                "hiv_test": self.hiv_test,
                "syphilis_rpr_test": self.syphilis_rpr_test,
                "hepatitis_b_hbsag_test": self.hepatitis_b_hbsag_test,
                "hepatitis_c_anti_hcv_test": self.hepatitis_c_anti_hcv_test,
                "malaria_test": self.malaria_test,
            }
            errors = {}
            for field_name, value in required_negative.items():
                if value != self.TestResult.NEGATIVE:
                    errors[field_name] = "Triagem aprovada exige resultado NEGATIVO."
            if self.donor_weight_kg is None:
                errors["donor_weight_kg"] = "Informe o peso do doador para triagem aprovada."
            if self.hemoglobin_g_dl is None:
                errors["hemoglobin_g_dl"] = "Informe a hemoglobina para triagem aprovada."
            if errors:
                raise ValidationError(errors)

    def _has_any_positive_test(self) -> bool:
        return any(
            v == self.TestResult.POSITIVE
            for v in (
                self.hiv_test,
                self.syphilis_rpr_test,
                self.hepatitis_b_hbsag_test,
                self.hepatitis_c_anti_hcv_test,
                self.malaria_test,
            )
        )

    def _quarantine_related_units(self, reason: str):
        qs = BloodUnit.objects.filter(tenant_id=self.tenant_id, donation_id=self.id, deleted=False)
        for unit in qs:
            if unit.status in {
                BloodUnit.UnitStatus.TRANSFUSED,
                BloodUnit.UnitStatus.DISCARDED,
                BloodUnit.UnitStatus.EXPIRED,
            }:
                continue
            if unit.status != BloodUnit.UnitStatus.QUARANTINE:
                unit.status = BloodUnit.UnitStatus.QUARANTINE
            unit.reserved_for = None
            unit.forwarded_to_sector = ""
            unit.forwarded_at = None
            unit.forwarded_by = None
            unit.dispatch_outcome = BloodUnit.DispatchOutcome.PENDING
            unit.dispatch_outcome_at = None
            unit.dispatch_outcome_by = None
            unit.dispatch_outcome_notes = ""
            unit.notes = (unit.notes or "").strip()
            suffix = f"[QUARENTENA] {reason}"
            unit.notes = f"{unit.notes}\n{suffix}".strip() if unit.notes else suffix
            unit.save()

    def _resolve_unit_status_for_screening(self) -> str:
        if self._has_any_positive_test():
            return BloodUnit.UnitStatus.QUARANTINE
        return BloodUnit.UnitStatus.AVAILABLE

    def _resolve_default_storage(self):
        storage = (
            BloodStorage.objects.filter(tenant_id=self.tenant_id, is_active=True, deleted=False)
            .order_by("name", "id")
            .first()
        )
        if storage is not None:
            return storage
        return BloodStorage.objects.create(
            tenant_id=self.tenant_id,
            name="Banco de Sangue - Principal",
            location="Banco de Sangue",
            capacity_units=500,
            temperature_min_c=2.0,
            temperature_max_c=6.0,
            is_active=True,
        )

    def _ensure_units_after_completion(self):
        if self.status != self.DonationStatus.COMPLETED:
            return

        unit = (
            BloodUnit.objects.filter(tenant_id=self.tenant_id, donation_id=self.id, deleted=False)
            .order_by("id")
            .first()
        )
        created = False
        if unit is None:
            unit = BloodUnit(
                tenant_id=self.tenant_id,
                donation=self,
                unit_number=f"{self.bag_identifier}-01",
                component_type=(
                    BloodComponentType.WHOLE_BLOOD
                    if self.donation_type == self.DonationType.WHOLE_BLOOD
                    else BloodComponentType.PLATELETS
                ),
                blood_type=self.blood_type,
                volume_ml=self.volume_ml,
                collected_at=self.collected_at,
                expires_at=self.collected_at + datetime.timedelta(days=35),
                storage=self._resolve_default_storage(),
                status=self._resolve_unit_status_for_screening(),
            )
            created = True
        else:
            if not BloodUnitStateMachine.is_terminal(unit.status):
                unit.status = self._resolve_unit_status_for_screening()
            if unit.status == BloodUnit.UnitStatus.QUARANTINE:
                unit.reserved_for = None
            if not unit.storage_id:
                unit.storage = self._resolve_default_storage()
            if not unit.expires_at or unit.expires_at <= unit.collected_at:
                unit.expires_at = self.collected_at + datetime.timedelta(days=35)

        unit.save()
        if created or not BloodStockMovement.objects.filter(
            tenant_id=self.tenant_id,
            unit_id=unit.id,
            movement_type=BloodStockMovement.MovementType.INBOUND,
            deleted=False,
        ).exists():
            BloodStockMovement(
                tenant=unit.tenant,
                unit=unit,
                destination_storage=unit.storage,
                movement_type=BloodStockMovement.MovementType.INBOUND,
                moved_at=timezone.now(),
                reason="Entrada automática por doação concluída",
            ).save()

    def _discard_related_units(self, reason: str):
        now = timezone.now()
        qs = BloodUnit.objects.filter(tenant_id=self.tenant_id, donation_id=self.id, deleted=False)
        for unit in qs.select_related("storage"):
            if unit.status == BloodUnit.UnitStatus.TRANSFUSED:
                continue
            if unit.status == BloodUnit.UnitStatus.DISCARDED:
                continue
            unit.status = BloodUnit.UnitStatus.DISCARDED
            unit.reserved_for = None
            unit.notes = (unit.notes or "").strip()
            suffix = f"[DESCARTE] {reason}"
            unit.notes = f"{unit.notes}\n{suffix}".strip() if unit.notes else suffix
            unit.save()

            BloodStockMovement(
                tenant=unit.tenant,
                unit=unit,
                source_storage=unit.storage,
                movement_type=BloodStockMovement.MovementType.DISCARD,
                moved_at=now,
                reason=reason,
            ).save()

    def generate_identifier(self):
        # Gera o custom_id (via IdentifierMixin) e, quando a bolsa não foi
        # informada, usa o mesmo identificador na bolsa. Roda dentro do laço de
        # retry do IdentifierMixin, portanto acompanha eventuais recodificações.
        super().generate_identifier()
        if getattr(self, "_auto_bag_identifier", False) and self.custom_id:
            self.bag_identifier = self.custom_id

    def save(self, *args, **kwargs):
        # Identificador da bolsa é gerado automaticamente a partir do custom_id
        # quando não informado explicitamente.
        self._auto_bag_identifier = not (self.bag_identifier or "").strip()
        if self._auto_bag_identifier and self.custom_id:
            self.bag_identifier = self.custom_id

        # Padroniza validacoes (clean()) antes de persistir.
        self.full_clean()
        result = super().save(*args, **kwargs)

        # Repositor com exame POSITIVO: torna repositor inapto e rejeita triagem.
        if self.donor_role == self.DonorRole.REPLACEMENT and self.donor_id and self._has_any_positive_test():
            donor = self.donor
            changed_donor = False
            if not getattr(donor, "is_replacement_donor_inapt", False):
                donor.is_replacement_donor_inapt = True
                donor.replacement_donor_inapt_at = timezone.now()
                donor.replacement_donor_inapt_reason = (
                    donor.replacement_donor_inapt_reason or ""
                ).strip() or "Exame positivo em doacao repositor."
                changed_donor = True
            if changed_donor:
                donor.save()

            if self.screening_status != self.ScreeningStatus.REJECTED:
                self.screening_status = self.ScreeningStatus.REJECTED
                super().save(update_fields=["screening_status"])

        if self._has_any_positive_test():
            self._quarantine_related_units("Exame sorológico positivo")

        self._ensure_units_after_completion()

        return result


class BloodStorage(NoNameCoreModel):
    """
    Local de armazenamento de bolsas e hemocomponentes.
    """

    prefix = "STG"

    name = models.CharField(
        db_column="name",
        verbose_name="Nome do armazenamento",
        max_length=120,
        db_index=True,
    )
    location = models.CharField(
        db_column="location",
        verbose_name="Localização",
        max_length=255,
        blank=True,
        default="",
    )
    capacity_units = models.PositiveIntegerField(
        db_column="capacity_units",
        verbose_name="Capacidade (unidades)",
        default=100,
    )
    temperature_min_c = models.DecimalField(
        db_column="temperature_min_c",
        verbose_name="Temperatura mínima (°C)",
        max_digits=4,
        decimal_places=1,
        default=2.0,
    )
    temperature_max_c = models.DecimalField(
        db_column="temperature_max_c",
        verbose_name="Temperatura máxima (°C)",
        max_digits=4,
        decimal_places=1,
        default=6.0,
    )
    is_active = models.BooleanField(
        db_column="is_active",
        verbose_name="Ativo",
        default=True,
        db_index=True,
    )
    last_validation_at = models.DateTimeField(
        db_column="last_validation_at",
        verbose_name="Última validação",
        null=True,
        blank=True,
    )
    notes = models.TextField(
        db_column="notes",
        verbose_name="Observações",
        blank=True,
        default="",
    )

    class Meta:
        db_table = "bloodbank_blood_storage"
        verbose_name = "Armazenamento de sangue"
        verbose_name_plural = "Armazenamentos de sangue"
        ordering = ["name", "created_at"]
        constraints = [
            models.UniqueConstraint(
                fields=["tenant", "name"],
                name="uq_blood_storage_name_per_tenant",
                violation_error_message="Já existe um armazenamento com este nome neste tenant.",
            )
        ]
        indexes = [
            models.Index(fields=["tenant", "is_active", "name"]),
        ]

    def __str__(self) -> str:
        return self.name

    def clean(self):
        super().clean()

        if self.capacity_units <= 0:
            raise ValidationError({"capacity_units": "Capacidade deve ser maior que zero."})

        if self.temperature_min_c > self.temperature_max_c:
            raise ValidationError(
                {"temperature_min_c": "Temperatura mínima não pode ser maior que a máxima."}
            )


class BloodUnit(NoNameCoreModel):
    """
    Unidade estocavel de sangue ou hemocomponente.
    """

    prefix = "UNT"

    class UnitStatus(models.TextChoices):
        QUARANTINE = "QUA", "Quarentena"
        AVAILABLE = "AVL", "Disponível"
        RESERVED = "RES", "Reservada"
        FORWARDED = "FWD", "Aviada para setor"
        TRANSFUSED = "TRN", "Transfundida"
        EXPIRED = "EXP", "Expirada"
        DISCARDED = "DSC", "Descartada"

    class DispatchOutcome(models.TextChoices):
        PENDING = "PEN", "Pendente"
        TRANSFUSED = "TRN", "Transfundida"
        RETURNED = "RET", "Devolvida"
        DISCARDED = "DSC", "Descartada"

    donation = models.ForeignKey(
        BloodDonation,
        db_column="donation_id",
        verbose_name="Doação de origem",
        on_delete=models.PROTECT,
        related_name="blood_units",
        db_index=True,
    )
    storage = models.ForeignKey(
        BloodStorage,
        db_column="storage_id",
        verbose_name="Armazenamento atual",
        on_delete=models.SET_NULL,
        related_name="blood_units",
        null=True,
        blank=True,
        db_index=True,
    )
    reserved_for = models.ForeignKey(
        "clinical.Patient",
        db_column="reserved_for_id",
        verbose_name="Paciente reservado",
        on_delete=models.SET_NULL,
        related_name="reserved_blood_units",
        null=True,
        blank=True,
        db_index=True,
    )
    unit_number = models.CharField(
        db_column="unit_number",
        verbose_name="Número da unidade",
        max_length=40,
        db_index=True,
    )
    component_type = models.CharField(
        db_column="component_type",
        verbose_name="Tipo de componente",
        max_length=3,
        choices=BloodComponentType.choices,
        default=BloodComponentType.WHOLE_BLOOD,
        db_index=True,
    )
    blood_type = models.CharField(
        db_column="blood_type",
        verbose_name="Tipo sanguíneo",
        max_length=3,
        choices=BloodType.choices,
        default=BloodType.UNKNOWN,
        db_index=True,
    )
    volume_ml = models.PositiveIntegerField(
        db_column="volume_ml",
        verbose_name="Volume da unidade (ml)",
        default=0,
    )
    collected_at = models.DateTimeField(
        db_column="collected_at",
        verbose_name="Data/hora da coleta",
        db_index=True,
    )
    expires_at = models.DateTimeField(
        db_column="expires_at",
        verbose_name="Data/hora de validade",
        db_index=True,
    )
    status = models.CharField(
        db_column="status",
        verbose_name="Estado da unidade",
        max_length=3,
        choices=UnitStatus.choices,
        default=UnitStatus.QUARANTINE,
        db_index=True,
    )
    forwarded_to_sector = models.CharField(
        db_column="forwarded_to_sector",
        verbose_name="Setor de aviação",
        max_length=80,
        blank=True,
        default="",
        db_index=True,
    )
    forwarded_at = models.DateTimeField(
        db_column="forwarded_at",
        verbose_name="Data/hora da aviação",
        null=True,
        blank=True,
        db_index=True,
    )
    forwarded_by = models.ForeignKey(
        User,
        db_column="forwarded_by_id",
        verbose_name="Aviada por",
        on_delete=models.SET_NULL,
        related_name="blood_units_forwarded",
        null=True,
        blank=True,
        db_index=True,
    )
    dispatch_outcome = models.CharField(
        db_column="dispatch_outcome",
        verbose_name="Desfecho da aviação",
        max_length=3,
        choices=DispatchOutcome.choices,
        default=DispatchOutcome.PENDING,
        db_index=True,
    )
    dispatch_outcome_at = models.DateTimeField(
        db_column="dispatch_outcome_at",
        verbose_name="Data/hora do desfecho da aviação",
        null=True,
        blank=True,
        db_index=True,
    )
    dispatch_outcome_by = models.ForeignKey(
        User,
        db_column="dispatch_outcome_by_id",
        verbose_name="Desfecho registado por",
        on_delete=models.SET_NULL,
        related_name="blood_units_dispatch_outcomes",
        null=True,
        blank=True,
        db_index=True,
    )
    dispatch_outcome_notes = models.TextField(
        db_column="dispatch_outcome_notes",
        verbose_name="Observações do desfecho da aviação",
        blank=True,
        default="",
    )
    is_irradiated = models.BooleanField(
        db_column="is_irradiated",
        verbose_name="Irradiada",
        default=False,
    )
    notes = models.TextField(
        db_column="notes",
        verbose_name="Observações",
        blank=True,
        default="",
    )

    class Meta:
        db_table = "bloodbank_blood_unit"
        verbose_name = "Unidade de sangue"
        verbose_name_plural = "Unidades de sangue"
        ordering = ["-collected_at", "-created_at"]
        constraints = [
            models.UniqueConstraint(
                fields=["tenant", "unit_number"],
                name="uq_blood_unit_number_per_tenant",
            )
        ]
        indexes = [
            models.Index(fields=["tenant", "status", "expires_at"]),
            models.Index(fields=["tenant", "blood_type", "status"]),
            models.Index(fields=["tenant", "storage", "status"]),
        ]

    def __str__(self) -> str:
        return f"Unidade {self.unit_number} ({self.get_component_type_display()})"

    @property
    def is_expired(self) -> bool:
        return bool(self.expires_at and self.expires_at <= timezone.now())

    def clean(self):
        super().clean()

        if self.donation_id and self.tenant_id and self.donation.tenant_id != self.tenant_id:
            raise ValidationError({"donation": "Doacao e unidade devem pertencer ao mesmo tenant."})

        if self.storage_id and self.tenant_id and self.storage.tenant_id != self.tenant_id:
            raise ValidationError({"storage": "Armazenamento e unidade devem pertencer ao mesmo tenant."})

        if self.reserved_for_id and self.tenant_id and self.reserved_for.tenant_id != self.tenant_id:
            raise ValidationError({"reserved_for": "Paciente reservado e unidade devem pertencer ao mesmo tenant."})

        if self.expires_at <= self.collected_at:
            raise ValidationError({"expires_at": "Validade deve ser posterior a data da coleta."})

        if self.status == self.UnitStatus.FORWARDED and not self.forwarded_to_sector:
            raise ValidationError({"forwarded_to_sector": "Informe o setor para aviar a unidade."})

        if self.status == self.UnitStatus.FORWARDED and not self.forwarded_at:
            raise ValidationError({"forwarded_at": "Informe a data/hora da aviação."})

        if self.reserved_for_id:
            recipient_blood_type = getattr(self.reserved_for, "blood_type", None)
            if not is_blood_compatible(self.blood_type, recipient_blood_type, self.component_type):
                raise ValidationError(
                    {
                        "reserved_for": compatibility_error_message(
                            self.blood_type,
                            recipient_blood_type,
                            self.component_type,
                        )
                    }
                )

        if self.status == self.UnitStatus.RESERVED and not self.reserved_for_id:
            raise ValidationError({"reserved_for": "Informe o paciente quando a unidade estiver reservada."})

        BloodDispatchOutcomePolicy.validate(outcome=self.dispatch_outcome, unit_status=self.status)

        if self._has_positive_serology() and self.status not in {
            self.UnitStatus.QUARANTINE,
            self.UnitStatus.TRANSFUSED,
            self.UnitStatus.DISCARDED,
            self.UnitStatus.EXPIRED,
        }:
            raise ValidationError(
                {"status": "Unidade com teste sorológico positivo deve permanecer em quarentena até decisão clínica."}
            )

    def _has_positive_serology(self) -> bool:
        donation = getattr(self, "donation", None)
        if donation is None:
            return False
        return donation._has_any_positive_test()

    def save(self, *args, **kwargs):
        if self.pk:
            previous_status = type(self).all_objects.filter(pk=self.pk).values_list("status", flat=True).first()
            BloodUnitStateMachine.validate_transition(previous_status, self.status)

        if self.donation_id:
            if not self.blood_type:
                self.blood_type = self.donation.blood_type
            if not self.collected_at:
                self.collected_at = self.donation.collected_at
            if not self.volume_ml:
                self.volume_ml = self.donation.volume_ml

        self.full_clean()
        return super().save(*args, **kwargs)


class BloodTransfusion(NoNameCoreModel):
    """
    Registro de solicitação e execução de transfusao.
    """

    prefix = "TRF"

    class TransfusionStatus(models.TextChoices):
        REQUESTED = "REQ", "Solicitada"
        APPROVED = "APR", "Aprovada"
        IN_PROGRESS = "INP", "Em andamento"
        COMPLETED = "COM", "Concluída"
        CANCELED = "CAN", "Cancelada"
        ADVERSE_REACTION = "REA", "Reação adversa"

    recipient = models.ForeignKey(
        "clinical.Patient",
        db_column="recipient_id",
        verbose_name="Paciente receptor",
        on_delete=models.PROTECT,
        related_name="blood_transfusions",
        db_index=True,
    )
    blood_unit = models.ForeignKey(
        BloodUnit,
        db_column="blood_unit_id",
        verbose_name="Unidade transfundida",
        on_delete=models.PROTECT,
        related_name="transfusions",
        db_index=True,
    )
    requested_by = models.ForeignKey(
        User,
        db_column="requested_by_id",
        verbose_name="Solicitado por",
        on_delete=models.SET_NULL,
        related_name="blood_transfusions_requested",
        null=True,
        blank=True,
    )
    performed_by = models.ForeignKey(
        User,
        db_column="performed_by_id",
        verbose_name="Executado por",
        on_delete=models.SET_NULL,
        related_name="blood_transfusions_performed",
        null=True,
        blank=True,
    )

    status = models.CharField(
        db_column="status",
        verbose_name="Estado da transfusão",
        max_length=3,
        choices=TransfusionStatus.choices,
        default=TransfusionStatus.REQUESTED,
        db_index=True,
    )
    requested_at = models.DateTimeField(
        db_column="requested_at",
        verbose_name="Data/hora da solicitação",
        default=timezone.now,
        db_index=True,
    )
    started_at = models.DateTimeField(
        db_column="started_at",
        verbose_name="Data/hora de início",
        null=True,
        blank=True,
        db_index=True,
    )
    finished_at = models.DateTimeField(
        db_column="finished_at",
        verbose_name="Data/hora de término",
        null=True,
        blank=True,
        db_index=True,
    )
    indication = models.TextField(
        db_column="indication",
        verbose_name="Indicação clínica",
        blank=True,
        default="",
    )
    reaction_notes = models.TextField(
        db_column="reaction_notes",
        verbose_name="Registo de reação",
        blank=True,
        default="",
    )
    notes = models.TextField(
        db_column="notes",
        verbose_name="Observações",
        blank=True,
        default="",
    )

    class Meta:
        db_table = "bloodbank_blood_transfusion"
        verbose_name = "Transfusão de sangue"
        verbose_name_plural = "Transfusões de sangue"
        ordering = ["-requested_at", "-created_at"]
        indexes = [
            models.Index(fields=["tenant", "status", "requested_at"]),
            models.Index(fields=["tenant", "recipient", "status"]),
            models.Index(fields=["tenant", "blood_unit", "status"]),
        ]

    def __str__(self) -> str:
        return f"Transfusão {self.custom_id or self.pk} - {self.get_status_display()}"

    def clean(self):
        super().clean()

        if self.pk:
            previous_status = type(self).all_objects.filter(pk=self.pk).values_list("status", flat=True).first()
            BloodTransfusionStateMachine.validate_transition(previous_status, self.status)

        if self.recipient_id and self.tenant_id and self.recipient.tenant_id != self.tenant_id:
            raise ValidationError({"recipient": "Paciente e transfusao devem pertencer ao mesmo tenant."})

        if self.blood_unit_id and self.tenant_id and self.blood_unit.tenant_id != self.tenant_id:
            raise ValidationError({"blood_unit": "Unidade e transfusao devem pertencer ao mesmo tenant."})

        if self.recipient_id and self.blood_unit_id:
            recipient_blood_type = getattr(self.recipient, "blood_type", None)
            if getattr(self.blood_unit, "reserved_for_id", None) and self.blood_unit.reserved_for_id != self.recipient_id:
                raise ValidationError({"blood_unit": "Unidade reservada para outro paciente."})
            if not is_blood_compatible(
                getattr(self.blood_unit, "blood_type", None),
                recipient_blood_type,
                getattr(self.blood_unit, "component_type", None),
            ):
                raise ValidationError(
                    {
                        "blood_unit": compatibility_error_message(
                            getattr(self.blood_unit, "blood_type", None),
                            recipient_blood_type,
                            getattr(self.blood_unit, "component_type", None),
                        )
                    }
                )

        if self.finished_at and not self.started_at:
            raise ValidationError({"finished_at": "Nao e possivel terminar sem iniciar a transfusao."})

        if self.started_at and self.started_at < self.requested_at:
            raise ValidationError({"started_at": "Inicio nao pode ser anterior a solicitacao."})

        if self.finished_at and self.started_at and self.finished_at < self.started_at:
            raise ValidationError({"finished_at": "Termino nao pode ser anterior ao inicio."})

        if self.status == self.TransfusionStatus.IN_PROGRESS and not self.started_at:
            raise ValidationError({"started_at": "Informe a data de inicio para transfusao em andamento."})

        if self.status == self.TransfusionStatus.COMPLETED and not self.finished_at:
            raise ValidationError({"finished_at": "Informe a data de termino para transfusao concluida."})

    def save(self, *args, **kwargs):
        self.full_clean()
        return super().save(*args, **kwargs)


class BloodStockMovement(NoNameCoreModel):
    """
    Historico de movimentacoes de estoque do banco de sangue.
    """

    prefix = "MOV"

    class MovementType(models.TextChoices):
        INBOUND = "INB", "Entrada"
        OUTBOUND = "OUT", "Saída"
        TRANSFER = "TRF", "Transferência"
        RESERVE = "RSV", "Reserva"
        RELEASE = "RLS", "Liberação"
        FORWARD = "FWD", "Aviação para setor"
        RETURN = "RTN", "Devolução ao banco de sangue"
        DISCARD = "DSC", "Descarte"
        EXPIRE = "EXP", "Baixa por validade"
        ADJUSTMENT = "ADJ", "Ajuste manual"

    unit = models.ForeignKey(
        BloodUnit,
        db_column="unit_id",
        verbose_name="Unidade movimentada",
        on_delete=models.PROTECT,
        related_name="stock_movements",
        db_index=True,
    )
    source_storage = models.ForeignKey(
        BloodStorage,
        db_column="source_storage_id",
        verbose_name="Armazenamento de origem",
        on_delete=models.SET_NULL,
        related_name="stock_movements_out",
        null=True,
        blank=True,
    )
    destination_storage = models.ForeignKey(
        BloodStorage,
        db_column="destination_storage_id",
        verbose_name="Armazenamento de destino",
        on_delete=models.SET_NULL,
        related_name="stock_movements_in",
        null=True,
        blank=True,
    )
    movement_type = models.CharField(
        db_column="movement_type",
        verbose_name="Tipo de movimentação",
        max_length=3,
        choices=MovementType.choices,
        db_index=True,
    )
    moved_at = models.DateTimeField(
        db_column="moved_at",
        verbose_name="Data/hora da movimentação",
        default=timezone.now,
        db_index=True,
    )
    performed_by = models.ForeignKey(
        User,
        db_column="performed_by_id",
        verbose_name="Executado por",
        on_delete=models.SET_NULL,
        related_name="blood_stock_movements",
        null=True,
        blank=True,
    )
    reason = models.CharField(
        db_column="reason",
        verbose_name="Motivo",
        max_length=200,
        blank=True,
        default="",
    )
    notes = models.TextField(
        db_column="notes",
        verbose_name="Observações",
        blank=True,
        default="",
    )

    class Meta:
        db_table = "bloodbank_blood_stock_movement"
        verbose_name = "Movimentação de stock de sangue"
        verbose_name_plural = "Movimentações de stock de sangue"
        ordering = ["-moved_at", "-created_at"]
        indexes = [
            models.Index(fields=["tenant", "movement_type", "moved_at"]),
            models.Index(fields=["tenant", "unit", "moved_at"]),
            models.Index(fields=["tenant", "source_storage", "destination_storage"]),
        ]

    def __str__(self) -> str:
        return f"Movimento {self.get_movement_type_display()} - {self.unit.unit_number}"

    def clean(self):
        super().clean()

        if self.unit_id and self.tenant_id and self.unit.tenant_id != self.tenant_id:
            raise ValidationError({"unit": "Unidade e movimentacao devem pertencer ao mesmo tenant."})

        if self.source_storage_id and self.tenant_id and self.source_storage.tenant_id != self.tenant_id:
            raise ValidationError({"source_storage": "Origem e movimentacao devem pertencer ao mesmo tenant."})

        if self.destination_storage_id and self.tenant_id and self.destination_storage.tenant_id != self.tenant_id:
            raise ValidationError({"destination_storage": "Destino e movimentacao devem pertencer ao mesmo tenant."})

        if self.movement_type == self.MovementType.TRANSFER:
            if not self.source_storage_id or not self.destination_storage_id:
                raise ValidationError(
                    {"movement_type": "Transferencia exige armazenamento de origem e destino."}
                )
            if self.source_storage_id == self.destination_storage_id:
                raise ValidationError(
                    {"destination_storage": "Origem e destino devem ser diferentes para transferencia."}
                )

        if self.movement_type == self.MovementType.FORWARD and not self.source_storage_id:
            raise ValidationError({"source_storage": "Aviação exige armazenamento de origem."})

        if self.movement_type == self.MovementType.RETURN and not self.destination_storage_id:
            raise ValidationError({"destination_storage": "Devolução exige armazenamento de destino."})

        if self.movement_type == self.MovementType.ADJUSTMENT:
            raise ValidationError(
                {"movement_type": "Ajuste manual está bloqueado. O stock depende do fluxo de doação/transfusão."}
            )


class BloodStorageMaintenance(NoNameCoreModel):
    """
    Plano e execucao de manutencao de armazenamento hemoterapico.
    """

    prefix = "MNT"

    class MaintenanceType(models.TextChoices):
        PREVENTIVE = "PRV", "Preventiva"
        CORRECTIVE = "COR", "Corretiva"
        CALIBRATION = "CAL", "Calibração"
        SANITIZATION = "SAN", "Higienização"
        TEMPERATURE_VALIDATION = "TMP", "Validação de temperatura"

    class MaintenanceStatus(models.TextChoices):
        SCHEDULED = "SCH", "Agendada"
        IN_PROGRESS = "INP", "Em andamento"
        COMPLETED = "COM", "Concluída"
        CANCELED = "CAN", "Cancelada"

    storage = models.ForeignKey(
        BloodStorage,
        db_column="storage_id",
        verbose_name="Armazenamento",
        on_delete=models.PROTECT,
        related_name="maintenances",
        db_index=True,
    )
    maintenance_type = models.CharField(
        db_column="maintenance_type",
        verbose_name="Tipo de manutenção",
        max_length=3,
        choices=MaintenanceType.choices,
        default=MaintenanceType.PREVENTIVE,
        db_index=True,
    )
    status = models.CharField(
        db_column="status",
        verbose_name="Estado da manutenção",
        max_length=3,
        choices=MaintenanceStatus.choices,
        default=MaintenanceStatus.SCHEDULED,
        db_index=True,
    )
    scheduled_at = models.DateTimeField(
        db_column="scheduled_at",
        verbose_name="Data/hora agendada",
        default=timezone.now,
        db_index=True,
    )
    performed_at = models.DateTimeField(
        db_column="performed_at",
        verbose_name="Data/hora executada",
        null=True,
        blank=True,
    )
    next_due_at = models.DateTimeField(
        db_column="next_due_at",
        verbose_name="Próxima manutenção prevista",
        null=True,
        blank=True,
    )
    technician_name = models.CharField(
        db_column="technician_name",
        verbose_name="Técnico responsável",
        max_length=120,
        blank=True,
        default="",
    )
    findings = models.TextField(
        db_column="findings",
        verbose_name="Achados",
        blank=True,
        default="",
    )
    actions_taken = models.TextField(
        db_column="actions_taken",
        verbose_name="Ações executadas",
        blank=True,
        default="",
    )
    notes = models.TextField(
        db_column="notes",
        verbose_name="Observações",
        blank=True,
        default="",
    )

    class Meta:
        db_table = "bloodbank_blood_storage_maintenance"
        verbose_name = "Manutenção de banco de sangue"
        verbose_name_plural = "Manutenções de banco de sangue"
        ordering = ["-scheduled_at", "-created_at"]
        indexes = [
            models.Index(fields=["tenant", "status", "scheduled_at"]),
            models.Index(fields=["tenant", "maintenance_type", "scheduled_at"]),
            models.Index(fields=["tenant", "storage", "status"]),
        ]

    def __str__(self) -> str:
        return f"Manutenção {self.storage.name} - {self.get_maintenance_type_display()}"

    def clean(self):
        super().clean()

        if self.storage_id and self.tenant_id and self.storage.tenant_id != self.tenant_id:
            raise ValidationError({"storage": "Armazenamento e manutencao devem pertencer ao mesmo tenant."})

        if self.performed_at and self.performed_at < self.scheduled_at:
            raise ValidationError({"performed_at": "Execucao nao pode ser anterior ao agendamento."})

        if self.status == self.MaintenanceStatus.COMPLETED and not self.performed_at:
            raise ValidationError({"performed_at": "Informe a data de execucao para manutencao concluida."})
