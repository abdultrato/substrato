from __future__ import annotations

from decimal import Decimal

from django.core.exceptions import ValidationError
from django.core.validators import MaxValueValidator, MinValueValidator
from django.db import models
from django.utils import timezone

from core.mixins.model.position import ScopedPositionMixin
from core.models.base import CoreModel, NoNameCoreModel

ZERO = Decimal("0.00")
MIN_DISTANCE = MinValueValidator(Decimal("0.001"))
MIN_MONEY = MinValueValidator(ZERO)


class Vehicle(CoreModel):
    class VehicleType(models.TextChoices):
        TRUCK = "TRUCK", "Camião"
        VAN = "VAN", "Carrinha"
        CAR = "CAR", "Carro"
        MOTORCYCLE = "MOTORCYCLE", "Motociclo"
        BUS = "BUS", "Autocarro"
        AMBULANCE = "AMBULANCE", "Ambulância"
        REFRIGERATED = "REFRIGERATED", "Refrigerado"
        OTHER = "OTHER", "Outro"

    class Status(models.TextChoices):
        ACTIVE = "ACTIVE", "Ativo"
        RESERVED = "RESERVED", "Reservado"
        IN_TRIP = "IN_TRIP", "Em viagem"
        MAINTENANCE = "MAINTENANCE", "Em manutenção"
        INACTIVE = "INACTIVE", "Inativo"

    class FuelType(models.TextChoices):
        DIESEL = "DIESEL", "Diesel"
        GASOLINE = "GASOLINE", "Gasolina"
        ELECTRIC = "ELECTRIC", "Elétrico"
        HYBRID = "HYBRID", "Híbrido"
        GAS = "GAS", "Gás"
        OTHER = "OTHER", "Outro"

    class CapacityUnit(models.TextChoices):
        KG = "KG", "Kg"
        TON = "TON", "Tonelada"
        PASSENGER = "PASSENGER", "Passageiros"
        M3 = "M3", "m³"
        LITER = "LITER", "Litros"

    prefix = "VEI"

    license_plate = models.CharField("Matrícula", max_length=20, db_index=True)
    fleet_number = models.CharField("Código de frota", max_length=40, blank=True, default="", db_index=True)
    vehicle_type = models.CharField("Tipo de veículo", max_length=20, choices=VehicleType.choices, default=VehicleType.CAR, db_index=True)
    status = models.CharField("Estado", max_length=20, choices=Status.choices, default=Status.ACTIVE, db_index=True)
    brand = models.CharField("Marca", max_length=80, blank=True, default="")
    model = models.CharField("Modelo", max_length=80, blank=True, default="")
    year = models.PositiveSmallIntegerField("Ano", null=True, blank=True)
    color = models.CharField("Cor", max_length=50, blank=True, default="")
    vin = models.CharField("Chassis/VIN", max_length=80, blank=True, default="", db_index=True)
    fuel_type = models.CharField("Tipo de combustível", max_length=20, choices=FuelType.choices, default=FuelType.DIESEL, db_index=True)
    capacity_value = models.DecimalField(
        "Capacidade",
        max_digits=12,
        decimal_places=3,
        default=Decimal("0.000"),
        validators=[MinValueValidator(Decimal("0.000"))],
    )
    capacity_unit = models.CharField("Unidade de capacidade", max_length=16, choices=CapacityUnit.choices, default=CapacityUnit.KG)
    current_odometer_km = models.DecimalField(
        "Odómetro atual (km)",
        max_digits=12,
        decimal_places=3,
        default=Decimal("0.000"),
        validators=[MinValueValidator(Decimal("0.000"))],
    )
    last_latitude = models.DecimalField("Última latitude", max_digits=9, decimal_places=6, null=True, blank=True)
    last_longitude = models.DecimalField("Última longitude", max_digits=9, decimal_places=6, null=True, blank=True)
    last_location_at = models.DateTimeField("Última localização em", null=True, blank=True, db_index=True)
    notes = models.TextField("Observações", blank=True, default="")

    class Meta:
        db_table = "transportation_vehicle"
        verbose_name = "Veículo"
        verbose_name_plural = "Veículos"
        ordering = ["license_plate", "name"]
        constraints = [
            models.UniqueConstraint(fields=["tenant", "license_plate"], name="uq_transport_vehicle_plate_tenant"),
            models.UniqueConstraint(
                fields=["tenant", "fleet_number"],
                condition=~models.Q(fleet_number=""),
                name="uq_transport_vehicle_fleet_tenant",
            ),
            models.UniqueConstraint(
                fields=["tenant", "vin"],
                condition=~models.Q(vin=""),
                name="uq_transport_vehicle_vin_tenant",
            ),
        ]
        indexes = [
            models.Index(fields=["tenant", "status"]),
            models.Index(fields=["tenant", "vehicle_type"]),
            models.Index(fields=["tenant", "fuel_type"]),
        ]

    def clean(self):
        super().clean()
        if self.last_latitude is not None and not Decimal("-90.000000") <= self.last_latitude <= Decimal("90.000000"):
            raise ValidationError({"last_latitude": "A latitude deve estar entre -90 e 90."})
        if self.last_longitude is not None and not Decimal("-180.000000") <= self.last_longitude <= Decimal("180.000000"):
            raise ValidationError({"last_longitude": "A longitude deve estar entre -180 e 180."})

    def __str__(self) -> str:
        return f"{self.license_plate} - {self.name}"


class Driver(CoreModel):
    class Status(models.TextChoices):
        ACTIVE = "ACTIVE", "Ativo"
        INACTIVE = "INACTIVE", "Inativo"
        ON_LEAVE = "ON_LEAVE", "De licença"
        SUSPENDED = "SUSPENDED", "Suspenso"

    class Availability(models.TextChoices):
        AVAILABLE = "AVAILABLE", "Disponível"
        ASSIGNED = "ASSIGNED", "Alocado"
        RESTING = "RESTING", "Em descanso"
        UNAVAILABLE = "UNAVAILABLE", "Indisponível"

    prefix = "MOT"

    employee = models.ForeignKey(
        "recursos_humanos.Employee",
        verbose_name="Funcionário",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="transport_driver_profiles",
    )
    document_number = models.CharField("Documento", max_length=60, blank=True, default="", db_index=True)
    license_number = models.CharField("Carta de condução", max_length=60, db_index=True)
    license_category = models.CharField("Categoria", max_length=16, blank=True, default="", db_index=True)
    license_expiry = models.DateField("Validade da carta", null=True, blank=True, db_index=True)
    phone = models.CharField("Telefone", max_length=40, blank=True, default="")
    email = models.EmailField("E-mail", blank=True, default="")
    hire_date = models.DateField("Data de admissão", null=True, blank=True)
    status = models.CharField("Estado", max_length=20, choices=Status.choices, default=Status.ACTIVE, db_index=True)
    availability = models.CharField(
        "Disponibilidade",
        max_length=20,
        choices=Availability.choices,
        default=Availability.AVAILABLE,
        db_index=True,
    )
    notes = models.TextField("Observações", blank=True, default="")

    class Meta:
        db_table = "transportation_driver"
        verbose_name = "Motorista"
        verbose_name_plural = "Motoristas"
        ordering = ["name", "license_number"]
        constraints = [
            models.UniqueConstraint(fields=["tenant", "license_number"], name="uq_transport_driver_license_tenant"),
            models.UniqueConstraint(
                fields=["tenant", "document_number"],
                condition=~models.Q(document_number=""),
                name="uq_transport_driver_document_tenant",
            ),
        ]
        indexes = [
            models.Index(fields=["tenant", "status"]),
            models.Index(fields=["tenant", "availability"]),
            models.Index(fields=["tenant", "license_category"]),
        ]

    def clean(self):
        super().clean()
        _validate_same_tenant(self, "employee")
        if self.license_expiry and self.license_expiry < timezone.localdate() and self.status == self.Status.ACTIVE:
            raise ValidationError({"license_expiry": "Motorista ativo não pode ter carta de condução expirada."})

    def save(self, *args, **kwargs):
        if self.employee_id:
            _propagate_tenant_from(self, "employee")
            if not self.name and self.employee:
                self.name = self.employee.name
            if not self.phone and self.employee:
                self.phone = self.employee.phone
            if not self.email and self.employee:
                self.email = self.employee.email
        self.full_clean()
        return super().save(*args, **kwargs)

    def __str__(self) -> str:
        return self.name


class TransportationRoute(CoreModel):
    class Status(models.TextChoices):
        DRAFT = "DRAFT", "Rascunho"
        PLANNED = "PLANNED", "Planeada"
        OPTIMIZED = "OPTIMIZED", "Otimizada"
        IN_PROGRESS = "IN_PROGRESS", "Em curso"
        COMPLETED = "COMPLETED", "Concluída"
        CANCELLED = "CANCELLED", "Cancelada"

    class OptimizationStatus(models.TextChoices):
        NOT_OPTIMIZED = "NOT_OPTIMIZED", "Não otimizada"
        OPTIMIZED = "OPTIMIZED", "Otimizada"
        PARTIAL = "PARTIAL", "Parcial"
        FAILED = "FAILED", "Falhou"

    class OptimizationStrategy(models.TextChoices):
        MANUAL = "MANUAL", "Manual"
        NEAREST_NEIGHBOR = "NEAREST_NEIGHBOR", "Vizinho mais próximo"

    prefix = "ROT"

    code = models.CharField("Código", max_length=40, db_index=True)
    origin = models.CharField("Origem", max_length=200, blank=True, default="")
    destination = models.CharField("Destino", max_length=200, blank=True, default="")
    status = models.CharField("Estado", max_length=20, choices=Status.choices, default=Status.DRAFT, db_index=True)
    planned_start = models.DateTimeField("Início planeado", null=True, blank=True, db_index=True)
    planned_end = models.DateTimeField("Fim planeado", null=True, blank=True, db_index=True)
    optimization_strategy = models.CharField(
        "Estratégia de otimização",
        max_length=24,
        choices=OptimizationStrategy.choices,
        default=OptimizationStrategy.NEAREST_NEIGHBOR,
        db_index=True,
    )
    optimization_status = models.CharField(
        "Estado da otimização",
        max_length=20,
        choices=OptimizationStatus.choices,
        default=OptimizationStatus.NOT_OPTIMIZED,
        db_index=True,
    )
    optimized_at = models.DateTimeField("Otimizada em", null=True, blank=True)
    planned_distance_km = models.DecimalField(
        "Distância planeada (km)",
        max_digits=12,
        decimal_places=3,
        default=Decimal("0.000"),
        validators=[MinValueValidator(Decimal("0.000"))],
    )
    estimated_duration_minutes = models.PositiveIntegerField("Duração estimada (min)", default=0)
    actual_distance_km = models.DecimalField(
        "Distância real (km)",
        max_digits=12,
        decimal_places=3,
        default=Decimal("0.000"),
        validators=[MinValueValidator(Decimal("0.000"))],
    )
    constraints = models.TextField("Restrições", blank=True, default="")
    notes = models.TextField("Observações", blank=True, default="")

    class Meta:
        db_table = "transportation_route"
        verbose_name = "Rota"
        verbose_name_plural = "Rotas"
        ordering = ["-planned_start", "code"]
        constraints = [
            models.UniqueConstraint(fields=["tenant", "code"], name="uq_transport_route_code_tenant"),
        ]
        indexes = [
            models.Index(fields=["tenant", "status"]),
            models.Index(fields=["tenant", "optimization_status"]),
            models.Index(fields=["tenant", "planned_start"]),
        ]

    def clean(self):
        super().clean()
        if self.planned_end and self.planned_start and self.planned_end <= self.planned_start:
            raise ValidationError({"planned_end": "O fim planeado deve ser posterior ao início."})

    def __str__(self) -> str:
        return f"{self.code} - {self.name}"


class RouteStop(ScopedPositionMixin, NoNameCoreModel):
    class StopType(models.TextChoices):
        PICKUP = "PICKUP", "Recolha"
        DELIVERY = "DELIVERY", "Entrega"
        CHECKPOINT = "CHECKPOINT", "Ponto de controlo"
        SERVICE = "SERVICE", "Serviço"
        REST = "REST", "Descanso"
        OTHER = "OTHER", "Outro"

    class Status(models.TextChoices):
        PENDING = "PENDING", "Pendente"
        ARRIVED = "ARRIVED", "Chegada registada"
        COMPLETED = "COMPLETED", "Concluído"
        SKIPPED = "SKIPPED", "Ignorado"
        CANCELLED = "CANCELLED", "Cancelado"

    prefix = "RTP"
    position_scope_fields = ("route",)

    route = models.ForeignKey(
        TransportationRoute,
        verbose_name="Rota",
        on_delete=models.CASCADE,
        related_name="stops",
        db_index=True,
    )
    stop_type = models.CharField("Tipo de paragem", max_length=20, choices=StopType.choices, default=StopType.DELIVERY, db_index=True)
    location_name = models.CharField("Local", max_length=160)
    address = models.CharField("Endereço", max_length=240, blank=True, default="")
    latitude = models.DecimalField(
        "Latitude",
        max_digits=9,
        decimal_places=6,
        null=True,
        blank=True,
        validators=[MinValueValidator(Decimal("-90.000000")), MaxValueValidator(Decimal("90.000000"))],
    )
    longitude = models.DecimalField(
        "Longitude",
        max_digits=9,
        decimal_places=6,
        null=True,
        blank=True,
        validators=[MinValueValidator(Decimal("-180.000000")), MaxValueValidator(Decimal("180.000000"))],
    )
    service_window_start = models.DateTimeField("Janela de serviço - início", null=True, blank=True)
    service_window_end = models.DateTimeField("Janela de serviço - fim", null=True, blank=True)
    planned_arrival = models.DateTimeField("Chegada planeada", null=True, blank=True)
    actual_arrival = models.DateTimeField("Chegada real", null=True, blank=True)
    load_quantity = models.DecimalField(
        "Carga a recolher",
        max_digits=12,
        decimal_places=3,
        default=Decimal("0.000"),
        validators=[MinValueValidator(Decimal("0.000"))],
    )
    unload_quantity = models.DecimalField(
        "Carga a entregar",
        max_digits=12,
        decimal_places=3,
        default=Decimal("0.000"),
        validators=[MinValueValidator(Decimal("0.000"))],
    )
    status = models.CharField("Estado", max_length=20, choices=Status.choices, default=Status.PENDING, db_index=True)
    instructions = models.TextField("Instruções", blank=True, default="")

    class Meta:
        db_table = "transportation_route_stop"
        verbose_name = "Paragem de Rota"
        verbose_name_plural = "Paragens de Rota"
        ordering = ["route", "position", "id"]
        indexes = [
            models.Index(fields=["tenant", "route", "position"]),
            models.Index(fields=["tenant", "status"]),
            models.Index(fields=["tenant", "stop_type"]),
        ]

    def clean(self):
        super().clean()
        _validate_same_tenant(self, "route")
        if self.service_window_start and self.service_window_end and self.service_window_end <= self.service_window_start:
            raise ValidationError({"service_window_end": "O fim da janela deve ser posterior ao início."})

    def save(self, *args, **kwargs):
        _propagate_tenant_from(self, "route")
        self.full_clean()
        return super().save(*args, **kwargs)

    def __str__(self) -> str:
        return f"{self.position}. {self.location_name}"


class Trip(NoNameCoreModel):
    class Status(models.TextChoices):
        SCHEDULED = "SCHEDULED", "Agendada"
        DISPATCHED = "DISPATCHED", "Despachada"
        IN_PROGRESS = "IN_PROGRESS", "Em curso"
        COMPLETED = "COMPLETED", "Concluída"
        CANCELLED = "CANCELLED", "Cancelada"

    class Purpose(models.TextChoices):
        DELIVERY = "DELIVERY", "Entrega"
        PICKUP = "PICKUP", "Recolha"
        PASSENGER = "PASSENGER", "Transporte de passageiros"
        TRANSFER = "TRANSFER", "Transferência"
        MAINTENANCE = "MAINTENANCE", "Manutenção"
        OTHER = "OTHER", "Outro"

    prefix = "TRP"

    vehicle = models.ForeignKey(Vehicle, verbose_name="Veículo", on_delete=models.PROTECT, related_name="trips", db_index=True)
    driver = models.ForeignKey(Driver, verbose_name="Motorista", on_delete=models.PROTECT, related_name="trips", db_index=True)
    route = models.ForeignKey(
        TransportationRoute,
        verbose_name="Rota",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="trips",
    )
    start_location = models.CharField("Local de início", max_length=200, blank=True, default="")
    end_location = models.CharField("Local de fim", max_length=200, blank=True, default="")
    scheduled_start = models.DateTimeField("Início agendado", db_index=True)
    scheduled_end = models.DateTimeField("Fim agendado", null=True, blank=True)
    actual_start = models.DateTimeField("Início real", null=True, blank=True)
    actual_end = models.DateTimeField("Fim real", null=True, blank=True)
    status = models.CharField("Estado", max_length=20, choices=Status.choices, default=Status.SCHEDULED, db_index=True)
    purpose = models.CharField("Finalidade", max_length=20, choices=Purpose.choices, default=Purpose.DELIVERY, db_index=True)
    odometer_start_km = models.DecimalField(
        "Odómetro inicial (km)",
        max_digits=12,
        decimal_places=3,
        default=Decimal("0.000"),
        validators=[MinValueValidator(Decimal("0.000"))],
    )
    odometer_end_km = models.DecimalField(
        "Odómetro final (km)",
        max_digits=12,
        decimal_places=3,
        null=True,
        blank=True,
        validators=[MinValueValidator(Decimal("0.000"))],
    )
    cargo_description = models.CharField("Carga/serviço", max_length=200, blank=True, default="")
    passenger_count = models.PositiveSmallIntegerField("Passageiros", default=0)
    notes = models.TextField("Observações", blank=True, default="")

    class Meta:
        db_table = "transportation_trip"
        verbose_name = "Viagem"
        verbose_name_plural = "Viagens"
        ordering = ["-scheduled_start", "-created_at"]
        indexes = [
            models.Index(fields=["tenant", "vehicle", "scheduled_start"]),
            models.Index(fields=["tenant", "driver", "scheduled_start"]),
            models.Index(fields=["tenant", "status"]),
            models.Index(fields=["tenant", "purpose"]),
        ]

    @property
    def distance_km(self) -> Decimal:
        if self.odometer_end_km is None:
            return Decimal("0.000")
        return max(self.odometer_end_km - self.odometer_start_km, Decimal("0.000"))

    def clean(self):
        super().clean()
        _validate_same_tenant(self, "vehicle")
        _validate_same_tenant(self, "driver")
        _validate_same_tenant(self, "route")
        if self.scheduled_end and self.scheduled_start and self.scheduled_end <= self.scheduled_start:
            raise ValidationError({"scheduled_end": "O fim agendado deve ser posterior ao início."})
        if self.actual_end and self.actual_start and self.actual_end <= self.actual_start:
            raise ValidationError({"actual_end": "O fim real deve ser posterior ao início real."})
        if self.odometer_end_km is not None and self.odometer_end_km < self.odometer_start_km:
            raise ValidationError({"odometer_end_km": "O odómetro final não pode ser inferior ao inicial."})

    def save(self, *args, **kwargs):
        _propagate_tenant_from(self, "vehicle")
        self.full_clean()
        return super().save(*args, **kwargs)

    def __str__(self) -> str:
        return self.custom_id or f"Viagem {self.pk}"


class VehicleTrackingPoint(NoNameCoreModel):
    class Source(models.TextChoices):
        GPS = "GPS", "GPS"
        MOBILE = "MOBILE", "Aplicação móvel"
        MANUAL = "MANUAL", "Manual"
        TELEMATICS = "TELEMATICS", "Telemetria"

    prefix = "TRK"

    vehicle = models.ForeignKey(Vehicle, verbose_name="Veículo", on_delete=models.CASCADE, related_name="tracking_points", db_index=True)
    trip = models.ForeignKey(Trip, verbose_name="Viagem", on_delete=models.SET_NULL, null=True, blank=True, related_name="tracking_points")
    recorded_at = models.DateTimeField("Registado em", default=timezone.now, db_index=True)
    latitude = models.DecimalField(
        "Latitude",
        max_digits=9,
        decimal_places=6,
        validators=[MinValueValidator(Decimal("-90.000000")), MaxValueValidator(Decimal("90.000000"))],
    )
    longitude = models.DecimalField(
        "Longitude",
        max_digits=9,
        decimal_places=6,
        validators=[MinValueValidator(Decimal("-180.000000")), MaxValueValidator(Decimal("180.000000"))],
    )
    speed_kmh = models.DecimalField(
        "Velocidade (km/h)",
        max_digits=8,
        decimal_places=2,
        default=Decimal("0.00"),
        validators=[MinValueValidator(Decimal("0.00"))],
    )
    heading_degrees = models.PositiveSmallIntegerField("Direção (graus)", default=0, validators=[MaxValueValidator(359)])
    odometer_km = models.DecimalField(
        "Odómetro (km)",
        max_digits=12,
        decimal_places=3,
        null=True,
        blank=True,
        validators=[MinValueValidator(Decimal("0.000"))],
    )
    accuracy_m = models.DecimalField(
        "Precisão (m)",
        max_digits=8,
        decimal_places=2,
        default=Decimal("0.00"),
        validators=[MinValueValidator(Decimal("0.00"))],
    )
    source = models.CharField("Origem", max_length=20, choices=Source.choices, default=Source.GPS, db_index=True)
    notes = models.TextField("Observações", blank=True, default="")

    class Meta:
        db_table = "transportation_tracking_point"
        verbose_name = "Ponto de Rastreamento"
        verbose_name_plural = "Pontos de Rastreamento"
        ordering = ["-recorded_at", "-created_at"]
        indexes = [
            models.Index(fields=["tenant", "vehicle", "recorded_at"]),
            models.Index(fields=["tenant", "trip", "recorded_at"]),
            models.Index(fields=["tenant", "source"]),
        ]

    def clean(self):
        super().clean()
        _validate_same_tenant(self, "vehicle")
        _validate_same_tenant(self, "trip")
        if self.trip_id and self.trip and self.vehicle_id and self.trip.vehicle_id != self.vehicle_id:
            raise ValidationError({"trip": "A viagem deve pertencer ao mesmo veículo."})

    def save(self, *args, **kwargs):
        _propagate_tenant_from(self, "vehicle")
        self.full_clean()
        result = super().save(*args, **kwargs)
        Vehicle.objects.filter(pk=self.vehicle_id).update(
            last_latitude=self.latitude,
            last_longitude=self.longitude,
            last_location_at=self.recorded_at,
        )
        if self.odometer_km is not None:
            Vehicle.objects.filter(pk=self.vehicle_id, current_odometer_km__lt=self.odometer_km).update(
                current_odometer_km=self.odometer_km
            )
        return result

    def __str__(self) -> str:
        return f"{self.vehicle} @ {self.recorded_at:%Y-%m-%d %H:%M}"


class MaintenancePlan(CoreModel):
    class TriggerType(models.TextChoices):
        TIME = "TIME", "Tempo"
        ODOMETER = "ODOMETER", "Odómetro"
        BOTH = "BOTH", "Tempo e odómetro"

    prefix = "PLM"

    code = models.CharField("Código", max_length=40, db_index=True)
    vehicle_type = models.CharField("Tipo de veículo", max_length=20, choices=Vehicle.VehicleType.choices, blank=True, default="", db_index=True)
    trigger_type = models.CharField("Gatilho", max_length=16, choices=TriggerType.choices, default=TriggerType.BOTH, db_index=True)
    interval_days = models.PositiveIntegerField("Intervalo em dias", default=180)
    interval_km = models.DecimalField(
        "Intervalo em km",
        max_digits=12,
        decimal_places=3,
        default=Decimal("10000.000"),
        validators=[MinValueValidator(Decimal("0.000"))],
    )
    active = models.BooleanField("Ativo", default=True, db_index=True)
    checklist = models.TextField("Checklist", blank=True, default="")
    notes = models.TextField("Observações", blank=True, default="")

    class Meta:
        db_table = "transportation_maintenance_plan"
        verbose_name = "Plano de Manutenção"
        verbose_name_plural = "Planos de Manutenção"
        ordering = ["name", "code"]
        constraints = [
            models.UniqueConstraint(fields=["tenant", "code"], name="uq_transport_maintenance_plan_code_tenant"),
        ]
        indexes = [
            models.Index(fields=["tenant", "active"]),
            models.Index(fields=["tenant", "vehicle_type"]),
        ]

    def clean(self):
        super().clean()
        if self.trigger_type in {self.TriggerType.TIME, self.TriggerType.BOTH} and self.interval_days <= 0:
            raise ValidationError({"interval_days": "O intervalo em dias deve ser maior que zero."})
        if self.trigger_type in {self.TriggerType.ODOMETER, self.TriggerType.BOTH} and self.interval_km <= 0:
            raise ValidationError({"interval_km": "O intervalo em km deve ser maior que zero."})

    def __str__(self) -> str:
        return f"{self.code} - {self.name}"


class MaintenanceOrder(NoNameCoreModel):
    class Status(models.TextChoices):
        SCHEDULED = "SCHEDULED", "Agendada"
        IN_PROGRESS = "IN_PROGRESS", "Em execução"
        COMPLETED = "COMPLETED", "Concluída"
        CANCELLED = "CANCELLED", "Cancelada"
        OVERDUE = "OVERDUE", "Atrasada"

    class MaintenanceType(models.TextChoices):
        PREVENTIVE = "PREVENTIVE", "Preventiva"
        CORRECTIVE = "CORRECTIVE", "Corretiva"
        INSPECTION = "INSPECTION", "Inspeção"
        OTHER = "OTHER", "Outra"

    prefix = "OSM"

    vehicle = models.ForeignKey(Vehicle, verbose_name="Veículo", on_delete=models.PROTECT, related_name="maintenance_orders", db_index=True)
    plan = models.ForeignKey(
        MaintenancePlan,
        verbose_name="Plano",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="orders",
    )
    maintenance_type = models.CharField(
        "Tipo",
        max_length=20,
        choices=MaintenanceType.choices,
        default=MaintenanceType.PREVENTIVE,
        db_index=True,
    )
    status = models.CharField("Estado", max_length=20, choices=Status.choices, default=Status.SCHEDULED, db_index=True)
    opened_at = models.DateTimeField("Aberta em", default=timezone.now, db_index=True)
    due_date = models.DateField("Data prevista", null=True, blank=True, db_index=True)
    completed_at = models.DateTimeField("Concluída em", null=True, blank=True)
    odometer_km = models.DecimalField(
        "Odómetro (km)",
        max_digits=12,
        decimal_places=3,
        default=Decimal("0.000"),
        validators=[MinValueValidator(Decimal("0.000"))],
    )
    provider = models.CharField("Fornecedor/oficina", max_length=160, blank=True, default="")
    summary = models.CharField("Resumo", max_length=200, blank=True, default="")
    checklist_result = models.TextField("Resultado do checklist", blank=True, default="")
    cost = models.DecimalField("Custo", max_digits=12, decimal_places=2, default=ZERO, validators=[MIN_MONEY])
    notes = models.TextField("Observações", blank=True, default="")

    class Meta:
        db_table = "transportation_maintenance_order"
        verbose_name = "Ordem de Manutenção"
        verbose_name_plural = "Ordens de Manutenção"
        ordering = ["-opened_at", "-created_at"]
        indexes = [
            models.Index(fields=["tenant", "vehicle", "opened_at"]),
            models.Index(fields=["tenant", "status"]),
            models.Index(fields=["tenant", "maintenance_type"]),
            models.Index(fields=["tenant", "due_date"]),
        ]

    def clean(self):
        super().clean()
        _validate_same_tenant(self, "vehicle")
        _validate_same_tenant(self, "plan")
        if self.completed_at and self.opened_at and self.completed_at < self.opened_at:
            raise ValidationError({"completed_at": "A conclusão não pode ser anterior à abertura."})

    def save(self, *args, **kwargs):
        _propagate_tenant_from(self, "vehicle")
        self.full_clean()
        return super().save(*args, **kwargs)

    def __str__(self) -> str:
        return self.custom_id or f"Manutenção {self.pk}"


class FuelLog(NoNameCoreModel):
    prefix = "ABS"

    vehicle = models.ForeignKey(Vehicle, verbose_name="Veículo", on_delete=models.PROTECT, related_name="fuel_logs", db_index=True)
    driver = models.ForeignKey(Driver, verbose_name="Motorista", on_delete=models.SET_NULL, null=True, blank=True, related_name="fuel_logs")
    trip = models.ForeignKey(Trip, verbose_name="Viagem", on_delete=models.SET_NULL, null=True, blank=True, related_name="fuel_logs")
    fueled_at = models.DateTimeField("Abastecido em", default=timezone.now, db_index=True)
    fuel_type = models.CharField("Combustível", max_length=20, choices=Vehicle.FuelType.choices, default=Vehicle.FuelType.DIESEL, db_index=True)
    odometer_km = models.DecimalField(
        "Odómetro (km)",
        max_digits=12,
        decimal_places=3,
        validators=[MinValueValidator(Decimal("0.000"))],
    )
    liters = models.DecimalField("Litros", max_digits=10, decimal_places=3, validators=[MIN_DISTANCE])
    unit_price = models.DecimalField("Preço unitário", max_digits=10, decimal_places=2, default=ZERO, validators=[MIN_MONEY])
    total_cost = models.DecimalField("Custo total", max_digits=12, decimal_places=2, default=ZERO, validators=[MIN_MONEY])
    station = models.CharField("Posto/fornecedor", max_length=160, blank=True, default="")
    receipt_number = models.CharField("Comprovativo", max_length=80, blank=True, default="", db_index=True)
    notes = models.TextField("Observações", blank=True, default="")

    class Meta:
        db_table = "transportation_fuel_log"
        verbose_name = "Abastecimento"
        verbose_name_plural = "Abastecimentos"
        ordering = ["-fueled_at", "-created_at"]
        indexes = [
            models.Index(fields=["tenant", "vehicle", "fueled_at"]),
            models.Index(fields=["tenant", "driver"]),
            models.Index(fields=["tenant", "fuel_type"]),
        ]

    def clean(self):
        super().clean()
        _validate_same_tenant(self, "vehicle")
        _validate_same_tenant(self, "driver")
        _validate_same_tenant(self, "trip")
        if self.trip_id and self.trip and self.vehicle_id and self.trip.vehicle_id != self.vehicle_id:
            raise ValidationError({"trip": "A viagem deve pertencer ao mesmo veículo."})
        if self.trip_id and self.trip and self.driver_id and self.trip.driver_id != self.driver_id:
            raise ValidationError({"driver": "O motorista deve corresponder à viagem selecionada."})

    def save(self, *args, **kwargs):
        _propagate_tenant_from(self, "vehicle")
        if self.total_cost == ZERO and self.unit_price > ZERO:
            self.total_cost = (self.liters * self.unit_price).quantize(Decimal("0.01"))
        self.full_clean()
        result = super().save(*args, **kwargs)
        Vehicle.objects.filter(pk=self.vehicle_id, current_odometer_km__lt=self.odometer_km).update(current_odometer_km=self.odometer_km)
        return result

    def __str__(self) -> str:
        return self.custom_id or f"Abastecimento {self.pk}"


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
