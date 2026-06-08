from __future__ import annotations

from datetime import timedelta
from decimal import Decimal
from uuid import uuid4

import pytest
from django.core.exceptions import ValidationError
from django.utils import timezone

from apps.transportation.models import (
    Driver,
    FuelLog,
    MaintenanceOrder,
    RouteStop,
    TransportationRoute,
    Trip,
    Vehicle,
    VehicleTrackingPoint,
)
from apps.transportation.services import TransportationWorkflowService
from apps.tenants.models.tenant import Tenant


def _tenant():
    suffix = uuid4().hex[:8]
    return Tenant.objects.create(
        identifier=f"tn-tr-{suffix}", name="Tenant TR", domain=f"{suffix}.local", active=True
    )


def _vehicle(tenant, *, status=Vehicle.Status.ACTIVE, odo="0.000"):
    return Vehicle.objects.create(
        tenant=tenant, name="Viatura 1", license_plate=f"AA-{uuid4().hex[:5]}",
        status=status, current_odometer_km=Decimal(odo),
    )


def _driver(tenant, *, status=Driver.Status.ACTIVE, availability=Driver.Availability.AVAILABLE):
    return Driver.objects.create(
        tenant=tenant, name="Motorista 1", license_number=f"CC-{uuid4().hex[:5]}",
        status=status, availability=availability,
        license_expiry=timezone.localdate() + timedelta(days=365),
    )


def _trip(tenant, vehicle, driver):
    return Trip.objects.create(
        tenant=tenant, vehicle=vehicle, driver=driver,
        scheduled_start=timezone.now() + timedelta(hours=1),
    )


@pytest.mark.django_db
def test_trip_full_journey_updates_vehicle_and_driver():
    tenant = _tenant()
    vehicle = _vehicle(tenant, odo="1000.000")
    driver = _driver(tenant)
    trip = _trip(tenant, vehicle, driver)

    TransportationWorkflowService.dispatch_trip(trip)
    vehicle.refresh_from_db(); driver.refresh_from_db()
    assert trip.status == Trip.Status.DISPATCHED
    assert vehicle.status == Vehicle.Status.RESERVED
    assert driver.availability == Driver.Availability.ASSIGNED

    TransportationWorkflowService.start_trip(trip)
    vehicle.refresh_from_db()
    assert trip.status == Trip.Status.IN_PROGRESS
    assert vehicle.status == Vehicle.Status.IN_TRIP
    assert trip.odometer_start_km == Decimal("1000.000")  # herdado do veículo

    TransportationWorkflowService.finalize_trip(trip, odometer_end_km="1150.000")
    vehicle.refresh_from_db(); driver.refresh_from_db()
    assert trip.status == Trip.Status.COMPLETED
    assert trip.distance_km == Decimal("150.000")
    assert vehicle.status == Vehicle.Status.ACTIVE
    assert vehicle.current_odometer_km == Decimal("1150.000")
    assert driver.availability == Driver.Availability.AVAILABLE


@pytest.mark.django_db
def test_dispatch_blocks_unavailable_vehicle_or_driver():
    tenant = _tenant()
    busy_vehicle = _vehicle(tenant, status=Vehicle.Status.MAINTENANCE)
    driver = _driver(tenant)
    trip = _trip(tenant, busy_vehicle, driver)
    with pytest.raises(ValidationError):
        TransportationWorkflowService.dispatch_trip(trip)

    vehicle = _vehicle(tenant)
    busy_driver = _driver(tenant, availability=Driver.Availability.UNAVAILABLE)
    trip2 = _trip(tenant, vehicle, busy_driver)
    with pytest.raises(ValidationError):
        TransportationWorkflowService.dispatch_trip(trip2)


@pytest.mark.django_db
def test_tracking_requires_in_progress_and_updates_vehicle():
    tenant = _tenant()
    vehicle = _vehicle(tenant)
    driver = _driver(tenant)
    trip = _trip(tenant, vehicle, driver)
    with pytest.raises(ValidationError):
        TransportationWorkflowService.register_tracking_point(trip, latitude="0", longitude="0")

    TransportationWorkflowService.start_trip(trip)
    point = TransportationWorkflowService.register_tracking_point(
        trip, latitude="-25.966", longitude="32.583", speed_kmh="60", odometer_km="1010.000"
    )
    vehicle.refresh_from_db()
    assert point.pk is not None
    assert vehicle.last_latitude == Decimal("-25.966000")
    assert vehicle.current_odometer_km == Decimal("1010.000")


@pytest.mark.django_db
def test_cancel_trip_releases_resources():
    tenant = _tenant()
    vehicle = _vehicle(tenant)
    driver = _driver(tenant)
    trip = _trip(tenant, vehicle, driver)
    TransportationWorkflowService.dispatch_trip(trip)
    TransportationWorkflowService.cancel_trip(trip, reason="Cliente cancelou")
    vehicle.refresh_from_db(); driver.refresh_from_db()
    assert trip.status == Trip.Status.CANCELLED
    assert vehicle.status == Vehicle.Status.ACTIVE
    assert driver.availability == Driver.Availability.AVAILABLE


@pytest.mark.django_db
def test_finalize_rejects_lower_odometer():
    tenant = _tenant()
    vehicle = _vehicle(tenant, odo="500.000")
    driver = _driver(tenant)
    trip = _trip(tenant, vehicle, driver)
    TransportationWorkflowService.start_trip(trip)
    with pytest.raises(ValidationError):
        TransportationWorkflowService.finalize_trip(trip, odometer_end_km="400.000")


@pytest.mark.django_db
def test_maintenance_flow_blocks_and_releases_vehicle():
    tenant = _tenant()
    vehicle = _vehicle(tenant)
    order = MaintenanceOrder.objects.create(tenant=tenant, vehicle=vehicle)

    TransportationWorkflowService.start_maintenance(order)
    vehicle.refresh_from_db()
    assert order.status == MaintenanceOrder.Status.IN_PROGRESS
    assert vehicle.status == Vehicle.Status.MAINTENANCE

    TransportationWorkflowService.complete_maintenance(order, cost="2500.00", summary="Revisão geral")
    vehicle.refresh_from_db()
    assert order.status == MaintenanceOrder.Status.COMPLETED
    assert order.cost == Decimal("2500.00")
    assert vehicle.status == Vehicle.Status.ACTIVE


@pytest.mark.django_db
def test_fuel_log_km_coherence_and_total():
    tenant = _tenant()
    vehicle = _vehicle(tenant, odo="2000.000")
    with pytest.raises(ValidationError):
        TransportationWorkflowService.register_fuel_log(vehicle=vehicle, odometer_km="1900.000", liters="40")

    fuel = TransportationWorkflowService.register_fuel_log(
        vehicle=vehicle, odometer_km="2050.000", liters="40", unit_price="80.00",
    )
    vehicle.refresh_from_db()
    assert fuel.total_cost == Decimal("3200.00")  # 40 * 80
    assert vehicle.current_odometer_km == Decimal("2050.000")


@pytest.mark.django_db
def test_route_activate_requires_stops():
    tenant = _tenant()
    route = TransportationRoute.objects.create(tenant=tenant, name="Rota A", code=f"R-{uuid4().hex[:5]}")
    with pytest.raises(ValidationError):
        TransportationWorkflowService.activate_route(route)
    RouteStop.objects.create(tenant=tenant, route=route, location_name="Unidade Central")
    TransportationWorkflowService.activate_route(route)
    assert route.status == TransportationRoute.Status.PLANNED
