"""Modelos do banco de sangue com foco em doacao, transfusao e estoque."""

from __future__ import annotations

from django.conf import settings
from django.core.exceptions import ValidationError
from django.db import models
from django.utils import timezone

from core.models.base import NoNameCoreModel

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
    UNKNOWN = "UNK", "Nao informado"


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
        "clinico.Patient",
        db_column="donor_id",
        verbose_name="Doador",
        on_delete=models.PROTECT,
        related_name="blood_donations",
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
    )
    blood_type = models.CharField(
        db_column="blood_type",
        verbose_name="Tipo sanguineo",
        max_length=3,
        choices=BloodType.choices,
        default=BloodType.UNKNOWN,
        db_index=True,
    )
    donation_type = models.CharField(
        db_column="donation_type",
        verbose_name="Tipo de doacao",
        max_length=3,
        choices=DonationType.choices,
        default=DonationType.WHOLE_BLOOD,
        db_index=True,
    )
    status = models.CharField(
        db_column="status",
        verbose_name="Estado da doacao",
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
    contraindications = models.TextField(
        db_column="contraindications",
        verbose_name="Contraindicacoes",
        blank=True,
        default="",
    )
    notes = models.TextField(
        db_column="notes",
        verbose_name="Observacoes",
        blank=True,
        default="",
    )

    class Meta:
        db_table = "bloodbank_blood_donation"
        verbose_name = "Doacao de Sangue"
        verbose_name_plural = "Doacoes de Sangue"
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
        return f"Doacao {self.custom_id or self.pk} - {self.bag_identifier}"

    def clean(self):
        super().clean()

        if self.donor_id and self.tenant_id and self.donor.tenant_id != self.tenant_id:
            raise ValidationError({"donor": "Doador e doacao devem pertencer ao mesmo tenant."})

        if self.processed_at and self.collected_at and self.processed_at < self.collected_at:
            raise ValidationError({"processed_at": "Processamento nao pode ser anterior a coleta."})

        if self.volume_ml <= 0:
            raise ValidationError({"volume_ml": "Volume coletado deve ser maior que zero."})


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
        verbose_name="Localizacao",
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
        verbose_name="Temperatura minima (C)",
        max_digits=4,
        decimal_places=1,
        default=2.0,
    )
    temperature_max_c = models.DecimalField(
        db_column="temperature_max_c",
        verbose_name="Temperatura maxima (C)",
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
        verbose_name="Ultima validacao",
        null=True,
        blank=True,
    )
    notes = models.TextField(
        db_column="notes",
        verbose_name="Observacoes",
        blank=True,
        default="",
    )

    class Meta:
        db_table = "bloodbank_blood_storage"
        verbose_name = "Armazenamento de Sangue"
        verbose_name_plural = "Armazenamentos de Sangue"
        ordering = ["name", "created_at"]
        constraints = [
            models.UniqueConstraint(
                fields=["tenant", "name"],
                name="uq_blood_storage_name_per_tenant",
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
                {"temperature_min_c": "Temperatura minima nao pode ser maior que a maxima."}
            )


class BloodUnit(NoNameCoreModel):
    """
    Unidade estocavel de sangue ou hemocomponente.
    """

    prefix = "UNT"

    class UnitStatus(models.TextChoices):
        QUARANTINE = "QUA", "Quarentena"
        AVAILABLE = "AVL", "Disponivel"
        RESERVED = "RES", "Reservada"
        TRANSFUSED = "TRN", "Transfundida"
        EXPIRED = "EXP", "Expirada"
        DISCARDED = "DSC", "Descartada"

    donation = models.ForeignKey(
        BloodDonation,
        db_column="donation_id",
        verbose_name="Doacao de origem",
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
        "clinico.Patient",
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
        verbose_name="Numero da unidade",
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
        verbose_name="Tipo sanguineo",
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
    is_irradiated = models.BooleanField(
        db_column="is_irradiated",
        verbose_name="Irradiada",
        default=False,
    )
    notes = models.TextField(
        db_column="notes",
        verbose_name="Observacoes",
        blank=True,
        default="",
    )

    class Meta:
        db_table = "bloodbank_blood_unit"
        verbose_name = "Unidade de Sangue"
        verbose_name_plural = "Unidades de Sangue"
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

        if self.status == self.UnitStatus.RESERVED and not self.reserved_for_id:
            raise ValidationError({"reserved_for": "Informe o paciente quando a unidade estiver reservada."})

    def save(self, *args, **kwargs):
        if self.donation_id:
            if not self.blood_type:
                self.blood_type = self.donation.blood_type
            if not self.collected_at:
                self.collected_at = self.donation.collected_at
            if not self.volume_ml:
                self.volume_ml = self.donation.volume_ml

        super().save(*args, **kwargs)


class BloodTransfusion(NoNameCoreModel):
    """
    Registro de solicitação e execução de transfusao.
    """

    prefix = "TRF"

    class TransfusionStatus(models.TextChoices):
        REQUESTED = "REQ", "Solicitada"
        APPROVED = "APR", "Aprovada"
        IN_PROGRESS = "INP", "Em andamento"
        COMPLETED = "COM", "Concluida"
        CANCELED = "CAN", "Cancelada"
        ADVERSE_REACTION = "REA", "Reacao adversa"

    recipient = models.ForeignKey(
        "clinico.Patient",
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
        verbose_name="Estado da transfusao",
        max_length=3,
        choices=TransfusionStatus.choices,
        default=TransfusionStatus.REQUESTED,
        db_index=True,
    )
    requested_at = models.DateTimeField(
        db_column="requested_at",
        verbose_name="Data/hora da solicitacao",
        default=timezone.now,
        db_index=True,
    )
    started_at = models.DateTimeField(
        db_column="started_at",
        verbose_name="Data/hora de inicio",
        null=True,
        blank=True,
        db_index=True,
    )
    finished_at = models.DateTimeField(
        db_column="finished_at",
        verbose_name="Data/hora de termino",
        null=True,
        blank=True,
        db_index=True,
    )
    indication = models.TextField(
        db_column="indication",
        verbose_name="Indicacao clinica",
        blank=True,
        default="",
    )
    reaction_notes = models.TextField(
        db_column="reaction_notes",
        verbose_name="Registro de reacao",
        blank=True,
        default="",
    )
    notes = models.TextField(
        db_column="notes",
        verbose_name="Observacoes",
        blank=True,
        default="",
    )

    class Meta:
        db_table = "bloodbank_blood_transfusion"
        verbose_name = "Transfusao de Sangue"
        verbose_name_plural = "Transfusoes de Sangue"
        ordering = ["-requested_at", "-created_at"]
        indexes = [
            models.Index(fields=["tenant", "status", "requested_at"]),
            models.Index(fields=["tenant", "recipient", "status"]),
            models.Index(fields=["tenant", "blood_unit", "status"]),
        ]

    def __str__(self) -> str:
        return f"Transfusao {self.custom_id or self.pk} - {self.get_status_display()}"

    def clean(self):
        super().clean()

        if self.recipient_id and self.tenant_id and self.recipient.tenant_id != self.tenant_id:
            raise ValidationError({"recipient": "Paciente e transfusao devem pertencer ao mesmo tenant."})

        if self.blood_unit_id and self.tenant_id and self.blood_unit.tenant_id != self.tenant_id:
            raise ValidationError({"blood_unit": "Unidade e transfusao devem pertencer ao mesmo tenant."})

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


class BloodStockMovement(NoNameCoreModel):
    """
    Historico de movimentacoes de estoque do banco de sangue.
    """

    prefix = "MOV"

    class MovementType(models.TextChoices):
        INBOUND = "INB", "Entrada"
        OUTBOUND = "OUT", "Saida"
        TRANSFER = "TRF", "Transferencia"
        RESERVE = "RSV", "Reserva"
        RELEASE = "RLS", "Liberacao"
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
        verbose_name="Tipo de movimentacao",
        max_length=3,
        choices=MovementType.choices,
        db_index=True,
    )
    moved_at = models.DateTimeField(
        db_column="moved_at",
        verbose_name="Data/hora da movimentacao",
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
        verbose_name="Observacoes",
        blank=True,
        default="",
    )

    class Meta:
        db_table = "bloodbank_blood_stock_movement"
        verbose_name = "Movimentacao de Estoque de Sangue"
        verbose_name_plural = "Movimentacoes de Estoque de Sangue"
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


class BloodStorageMaintenance(NoNameCoreModel):
    """
    Plano e execucao de manutencao de armazenamento hemoterapico.
    """

    prefix = "MNT"

    class MaintenanceType(models.TextChoices):
        PREVENTIVE = "PRV", "Preventiva"
        CORRECTIVE = "COR", "Corretiva"
        CALIBRATION = "CAL", "Calibracao"
        SANITIZATION = "SAN", "Higienizacao"
        TEMPERATURE_VALIDATION = "TMP", "Validacao de temperatura"

    class MaintenanceStatus(models.TextChoices):
        SCHEDULED = "SCH", "Agendada"
        IN_PROGRESS = "INP", "Em andamento"
        COMPLETED = "COM", "Concluida"
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
        verbose_name="Tipo de manutencao",
        max_length=3,
        choices=MaintenanceType.choices,
        default=MaintenanceType.PREVENTIVE,
        db_index=True,
    )
    status = models.CharField(
        db_column="status",
        verbose_name="Estado da manutencao",
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
        verbose_name="Proxima manutencao prevista",
        null=True,
        blank=True,
    )
    technician_name = models.CharField(
        db_column="technician_name",
        verbose_name="Tecnico responsavel",
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
        verbose_name="Acoes executadas",
        blank=True,
        default="",
    )
    notes = models.TextField(
        db_column="notes",
        verbose_name="Observacoes",
        blank=True,
        default="",
    )

    class Meta:
        db_table = "bloodbank_blood_storage_maintenance"
        verbose_name = "Manutencao de Banco de Sangue"
        verbose_name_plural = "Manutencoes de Banco de Sangue"
        ordering = ["-scheduled_at", "-created_at"]
        indexes = [
            models.Index(fields=["tenant", "status", "scheduled_at"]),
            models.Index(fields=["tenant", "maintenance_type", "scheduled_at"]),
            models.Index(fields=["tenant", "storage", "status"]),
        ]

    def __str__(self) -> str:
        return f"Manutencao {self.storage.name} - {self.get_maintenance_type_display()}"

    def clean(self):
        super().clean()

        if self.storage_id and self.tenant_id and self.storage.tenant_id != self.tenant_id:
            raise ValidationError({"storage": "Armazenamento e manutencao devem pertencer ao mesmo tenant."})

        if self.performed_at and self.performed_at < self.scheduled_at:
            raise ValidationError({"performed_at": "Execucao nao pode ser anterior ao agendamento."})

        if self.status == self.MaintenanceStatus.COMPLETED and not self.performed_at:
            raise ValidationError({"performed_at": "Informe a data de execucao para manutencao concluida."})

