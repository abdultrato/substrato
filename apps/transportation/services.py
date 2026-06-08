from __future__ import annotations

from decimal import Decimal, InvalidOperation

from django.core.exceptions import ValidationError
from django.db import transaction
from django.utils import timezone

from apps.transportation.models import (
    Driver,
    FuelLog,
    MaintenanceOrder,
    TransportationRoute,
    Trip,
    Vehicle,
    VehicleTrackingPoint,
)

ZERO = Decimal("0.000")


def _append(current: str, label: str, text: str) -> str:
    if not text:
        return current
    return f"{current}\n[{label}] {text}".strip()


def _to_decimal(value, *, field: str = "value"):
    if value in (None, ""):
        return None
    try:
        return Decimal(str(value))
    except (InvalidOperation, TypeError, ValueError) as exc:
        raise ValidationError({field: "Valor numérico inválido."}) from exc


class TransportationWorkflowService:
    """Casos de uso de transporte e logística (§11.15): planear → escalar → viajar → rastrear → finalizar → manter."""

    # ------------------------------------------------------------------ #
    # Veículo
    # ------------------------------------------------------------------ #
    @staticmethod
    @transaction.atomic
    def mark_vehicle_available(vehicle: Vehicle) -> Vehicle:
        if vehicle.status == Vehicle.Status.IN_TRIP:
            raise ValidationError("Um veículo em viagem não pode ser marcado disponível diretamente.")
        vehicle.status = Vehicle.Status.ACTIVE
        vehicle.save()
        return vehicle

    @staticmethod
    @transaction.atomic
    def mark_vehicle_maintenance(vehicle: Vehicle, *, reason: str = "") -> Vehicle:
        vehicle.status = Vehicle.Status.MAINTENANCE
        vehicle.notes = _append(vehicle.notes, "Manutenção/Avaria", reason)
        vehicle.save()
        return vehicle

    @staticmethod
    @transaction.atomic
    def deactivate_vehicle(vehicle: Vehicle) -> Vehicle:
        if vehicle.status == Vehicle.Status.IN_TRIP:
            raise ValidationError("Um veículo em viagem não pode ser inativado.")
        vehicle.status = Vehicle.Status.INACTIVE
        vehicle.save()
        return vehicle

    # ------------------------------------------------------------------ #
    # Motorista
    # ------------------------------------------------------------------ #
    @staticmethod
    @transaction.atomic
    def activate_driver(driver: Driver) -> Driver:
        if driver.license_expiry and driver.license_expiry < timezone.localdate():
            raise ValidationError({"license_expiry": "Carta de condução expirada — não é possível ativar o motorista."})
        driver.status = Driver.Status.ACTIVE
        driver.save()
        return driver

    @staticmethod
    @transaction.atomic
    def suspend_driver(driver: Driver, *, reason: str = "") -> Driver:
        driver.status = Driver.Status.SUSPENDED
        driver.availability = Driver.Availability.UNAVAILABLE
        driver.notes = _append(driver.notes, "Suspensão", reason)
        driver.save()
        return driver

    @staticmethod
    def _ensure_driver_schedulable(driver: Driver) -> None:
        if driver.status != Driver.Status.ACTIVE:
            raise ValidationError({"driver": "Motorista inativo/suspenso/de licença não pode ser escalado."})
        if driver.availability != Driver.Availability.AVAILABLE:
            raise ValidationError({"driver": "Motorista não está disponível."})
        if driver.license_expiry and driver.license_expiry < timezone.localdate():
            raise ValidationError({"driver": "Carta de condução do motorista está expirada."})

    @staticmethod
    def _ensure_vehicle_schedulable(vehicle: Vehicle) -> None:
        if vehicle.status != Vehicle.Status.ACTIVE:
            raise ValidationError({"vehicle": "Veículo não está disponível (reservado/em viagem/manutenção/inativo)."})

    # ------------------------------------------------------------------ #
    # Rota
    # ------------------------------------------------------------------ #
    @staticmethod
    @transaction.atomic
    def activate_route(route: TransportationRoute) -> TransportationRoute:
        if route.status not in {TransportationRoute.Status.DRAFT, TransportationRoute.Status.OPTIMIZED}:
            raise ValidationError("Apenas rotas em rascunho ou otimizadas podem ser ativadas.")
        if not route.stops.exists():
            raise ValidationError("A rota precisa de pelo menos uma paragem.")
        route.status = TransportationRoute.Status.PLANNED
        route.save()
        return route

    @staticmethod
    @transaction.atomic
    def cancel_route(route: TransportationRoute, *, reason: str = "") -> TransportationRoute:
        if route.status == TransportationRoute.Status.COMPLETED:
            raise ValidationError("Uma rota concluída não pode ser cancelada.")
        if not reason.strip():
            raise ValidationError({"reason": "Informe o motivo do cancelamento."})
        route.status = TransportationRoute.Status.CANCELLED
        route.notes = _append(route.notes, "Cancelamento", reason)
        route.save()
        return route

    # ------------------------------------------------------------------ #
    # Viagem
    # ------------------------------------------------------------------ #
    @staticmethod
    @transaction.atomic
    def dispatch_trip(trip: Trip) -> Trip:
        """Aprova/despacha a viagem e reserva veículo + motorista (§11.15 agendar/aprovar)."""
        if trip.status != Trip.Status.SCHEDULED:
            raise ValidationError("Apenas viagens agendadas podem ser despachadas.")
        TransportationWorkflowService._ensure_vehicle_schedulable(trip.vehicle)
        TransportationWorkflowService._ensure_driver_schedulable(trip.driver)
        trip.status = Trip.Status.DISPATCHED
        trip.save()
        trip.vehicle.status = Vehicle.Status.RESERVED
        trip.vehicle.save()
        trip.driver.availability = Driver.Availability.ASSIGNED
        trip.driver.save()
        return trip

    @staticmethod
    @transaction.atomic
    def start_trip(trip: Trip, *, odometer_start_km=None) -> Trip:
        if trip.status not in {Trip.Status.SCHEDULED, Trip.Status.DISPATCHED}:
            raise ValidationError("Apenas viagens agendadas/despachadas podem ser iniciadas.")
        vehicle = trip.vehicle
        if vehicle.status not in {Vehicle.Status.ACTIVE, Vehicle.Status.RESERVED}:
            raise ValidationError({"vehicle": "Veículo indisponível para iniciar viagem."})
        if trip.driver.status != Driver.Status.ACTIVE:
            raise ValidationError({"driver": "Motorista indisponível para iniciar viagem."})

        start_km = _to_decimal(odometer_start_km, field="odometer_start_km")
        if start_km is None:
            start_km = vehicle.current_odometer_km
        trip.odometer_start_km = start_km
        trip.actual_start = timezone.now()
        trip.status = Trip.Status.IN_PROGRESS
        trip.save()

        vehicle.status = Vehicle.Status.IN_TRIP
        vehicle.save()
        trip.driver.availability = Driver.Availability.ASSIGNED
        trip.driver.save()
        return trip

    @staticmethod
    @transaction.atomic
    def finalize_trip(trip: Trip, *, odometer_end_km) -> Trip:
        if trip.status != Trip.Status.IN_PROGRESS:
            raise ValidationError("Apenas viagens em curso podem ser finalizadas.")
        end_km = _to_decimal(odometer_end_km, field="odometer_end_km")
        if end_km is None:
            raise ValidationError({"odometer_end_km": "Informe o odómetro final."})
        if end_km < trip.odometer_start_km:
            raise ValidationError({"odometer_end_km": "O odómetro final não pode ser inferior ao inicial."})

        trip.odometer_end_km = end_km
        trip.actual_end = timezone.now()
        trip.status = Trip.Status.COMPLETED
        trip.save()

        vehicle = trip.vehicle
        if vehicle.current_odometer_km < end_km:
            vehicle.current_odometer_km = end_km
        vehicle.status = Vehicle.Status.ACTIVE
        vehicle.save()
        trip.driver.availability = Driver.Availability.AVAILABLE
        trip.driver.save()
        return trip

    @staticmethod
    @transaction.atomic
    def cancel_trip(trip: Trip, *, reason: str = "") -> Trip:
        if trip.status == Trip.Status.COMPLETED:
            raise ValidationError("Uma viagem concluída não pode ser cancelada.")
        if not reason.strip():
            raise ValidationError({"reason": "Informe o motivo do cancelamento."})
        trip.status = Trip.Status.CANCELLED
        trip.notes = _append(trip.notes, "Cancelamento", reason)
        trip.save()
        vehicle = trip.vehicle
        if vehicle.status in {Vehicle.Status.RESERVED, Vehicle.Status.IN_TRIP}:
            vehicle.status = Vehicle.Status.ACTIVE
            vehicle.save()
        if trip.driver.availability == Driver.Availability.ASSIGNED:
            trip.driver.availability = Driver.Availability.AVAILABLE
            trip.driver.save()
        return trip

    @staticmethod
    @transaction.atomic
    def register_tracking_point(
        trip: Trip,
        *,
        latitude,
        longitude,
        speed_kmh=ZERO,
        heading_degrees: int = 0,
        odometer_km=None,
        source: str = VehicleTrackingPoint.Source.GPS,
    ) -> VehicleTrackingPoint:
        """Regista um ponto de rastreamento (o save() do modelo atualiza a localização/odómetro do veículo) (§11.10)."""
        if trip.status != Trip.Status.IN_PROGRESS:
            raise ValidationError("Apenas viagens em curso aceitam rastreamento.")
        return VehicleTrackingPoint.objects.create(
            tenant=trip.tenant,
            vehicle=trip.vehicle,
            trip=trip,
            latitude=_to_decimal(latitude, field="latitude"),
            longitude=_to_decimal(longitude, field="longitude"),
            speed_kmh=_to_decimal(speed_kmh, field="speed_kmh") or ZERO,
            heading_degrees=heading_degrees,
            odometer_km=_to_decimal(odometer_km, field="odometer_km"),
            source=source,
        )

    # ------------------------------------------------------------------ #
    # Manutenção
    # ------------------------------------------------------------------ #
    @staticmethod
    @transaction.atomic
    def start_maintenance(order: MaintenanceOrder) -> MaintenanceOrder:
        if order.status not in {MaintenanceOrder.Status.SCHEDULED, MaintenanceOrder.Status.OVERDUE}:
            raise ValidationError("Apenas ordens agendadas/atrasadas podem iniciar execução.")
        order.status = MaintenanceOrder.Status.IN_PROGRESS
        order.save()
        vehicle = order.vehicle
        if vehicle.status not in {Vehicle.Status.IN_TRIP}:
            vehicle.status = Vehicle.Status.MAINTENANCE
            vehicle.save()
        return order

    @staticmethod
    @transaction.atomic
    def complete_maintenance(
        order: MaintenanceOrder, *, cost=None, summary: str = "", checklist_result: str = "", odometer_km=None
    ) -> MaintenanceOrder:
        if order.status not in {MaintenanceOrder.Status.IN_PROGRESS, MaintenanceOrder.Status.SCHEDULED, MaintenanceOrder.Status.OVERDUE}:
            raise ValidationError("Apenas ordens abertas/em execução podem ser concluídas.")
        if cost is not None:
            order.cost = _to_decimal(cost, field="cost")
        if summary:
            order.summary = summary
        if checklist_result:
            order.checklist_result = checklist_result
        if odometer_km is not None:
            order.odometer_km = _to_decimal(odometer_km, field="odometer_km")
        order.status = MaintenanceOrder.Status.COMPLETED
        order.completed_at = timezone.now()
        order.save()

        vehicle = order.vehicle
        if vehicle.status == Vehicle.Status.MAINTENANCE:
            vehicle.status = Vehicle.Status.ACTIVE
            vehicle.save()
        return order

    @staticmethod
    @transaction.atomic
    def cancel_maintenance(order: MaintenanceOrder, *, reason: str = "") -> MaintenanceOrder:
        if order.status == MaintenanceOrder.Status.COMPLETED:
            raise ValidationError("Uma ordem concluída não pode ser cancelada.")
        if not reason.strip():
            raise ValidationError({"reason": "Informe o motivo do cancelamento."})
        order.status = MaintenanceOrder.Status.CANCELLED
        order.notes = _append(order.notes, "Cancelamento", reason)
        order.save()
        vehicle = order.vehicle
        if vehicle.status == Vehicle.Status.MAINTENANCE:
            vehicle.status = Vehicle.Status.ACTIVE
            vehicle.save()
        return order

    # ------------------------------------------------------------------ #
    # Abastecimento
    # ------------------------------------------------------------------ #
    @staticmethod
    @transaction.atomic
    def register_fuel_log(
        *,
        vehicle: Vehicle,
        odometer_km,
        liters,
        unit_price=ZERO,
        driver: Driver | None = None,
        trip: Trip | None = None,
        fuel_type: str | None = None,
        station: str = "",
        receipt_number: str = "",
    ) -> FuelLog:
        """Regista abastecimento com coerência de odómetro; o save() do modelo calcula o total e atualiza o veículo (§11.13)."""
        odometer = _to_decimal(odometer_km, field="odometer_km")
        liters_value = _to_decimal(liters, field="liters")
        if odometer is None or odometer < vehicle.current_odometer_km:
            raise ValidationError({"odometer_km": "O odómetro não pode ser inferior ao último registado no veículo."})
        if liters_value is None or liters_value <= ZERO:
            raise ValidationError({"liters": "A quantidade abastecida deve ser positiva."})
        return FuelLog.objects.create(
            tenant=vehicle.tenant,
            vehicle=vehicle,
            driver=driver,
            trip=trip,
            odometer_km=odometer,
            liters=liters_value,
            unit_price=_to_decimal(unit_price, field="unit_price") or ZERO,
            fuel_type=fuel_type or vehicle.fuel_type,
            station=station,
            receipt_number=receipt_number,
        )
