from datetime import timedelta
from decimal import Decimal
import json

from django.contrib.auth import get_user_model
from django.contrib.auth.models import Group
from django.core.exceptions import ValidationError
from django.utils import timezone
import pytest

from apps.tenants.models.tenant import Tenant
from apps.transportation.models import (
    Driver,
    FuelLog,
    MaintenanceOrder,
    MaintenancePlan,
    RouteStop,
    TransportationRoute,
    Trip,
    Vehicle,
    VehicleTrackingPoint,
)


def _response_data(response):
    if hasattr(response, "data"):
        return response.data
    return json.loads(response.content)


def _items(response):
    payload = _response_data(response)
    if isinstance(payload, dict) and isinstance(payload.get("results"), list):
        return payload["results"]
    if isinstance(payload, list):
        return payload
    return []


def _tenant():
    return Tenant.objects.create(
        identifier="tn-transport",
        name="Tenant Transporte",
        domain="tenant-transport.local",
        active=True,
    )


def _authenticate_admin(tenant, api_client):
    user_model = get_user_model()
    user = user_model.objects.create_user(
        username="admin-transport",
        email="admin-transport@example.com",
        password="testpass123",
        tenant=tenant,
    )
    group, _ = Group.objects.get_or_create(name="Administrador")
    user.groups.add(group)
    api_client.defaults["HTTP_HOST"] = tenant.domain
    api_client.force_authenticate(user=user)
    return user


@pytest.mark.django_db
def test_transportation_models_propagate_tenant_and_validate_operations():
    tenant = _tenant()
    now = timezone.now()
    vehicle = Vehicle.objects.create(
        tenant=tenant,
        name="Camião 01",
        license_plate="ABC-123-MP",
        vehicle_type="TRUCK",
        current_odometer_km=Decimal("1000.000"),
    )
    driver = Driver.objects.create(
        tenant=tenant,
        name="João Motorista",
        license_number="LIC-001",
        license_category="C",
        license_expiry=timezone.localdate() + timedelta(days=365),
    )
    route = TransportationRoute.objects.create(
        tenant=tenant,
        code="ROT-001",
        name="Entrega Centro",
        origin="Armazém Central",
        destination="Centro",
    )
    first_stop = RouteStop.objects.create(route=route, location_name="Armazém", latitude=Decimal("-25.965000"), longitude=Decimal("32.583000"))
    second_stop = RouteStop.objects.create(route=route, location_name="Cliente", latitude=Decimal("-25.970000"), longitude=Decimal("32.590000"))
    trip = Trip.objects.create(
        vehicle=vehicle,
        driver=driver,
        route=route,
        scheduled_start=now,
        odometer_start_km=Decimal("1000.000"),
        odometer_end_km=Decimal("1025.500"),
    )
    tracking = VehicleTrackingPoint.objects.create(
        vehicle=vehicle,
        trip=trip,
        latitude=Decimal("-25.968000"),
        longitude=Decimal("32.586000"),
        odometer_km=Decimal("1010.000"),
    )
    plan = MaintenancePlan.objects.create(
        tenant=tenant,
        code="REV-10K",
        name="Revisão 10 mil km",
        interval_days=180,
        interval_km=Decimal("10000.000"),
    )
    order = MaintenanceOrder.objects.create(vehicle=vehicle, plan=plan, due_date=timezone.localdate() + timedelta(days=10))
    fuel = FuelLog.objects.create(
        vehicle=vehicle,
        driver=driver,
        trip=trip,
        odometer_km=Decimal("1012.000"),
        liters=Decimal("35.000"),
        unit_price=Decimal("92.50"),
    )

    assert first_stop.tenant == tenant
    assert second_stop.tenant == tenant
    assert trip.tenant == tenant
    assert tracking.tenant == tenant
    assert order.tenant == tenant
    assert fuel.tenant == tenant
    assert fuel.total_cost == Decimal("3237.50")

    vehicle.refresh_from_db()
    assert vehicle.last_latitude == Decimal("-25.968000")
    assert vehicle.current_odometer_km == Decimal("1012.000")
    assert trip.distance_km == Decimal("25.500")

    with pytest.raises(ValidationError):
        Trip.objects.create(
            vehicle=vehicle,
            driver=driver,
            scheduled_start=now,
            odometer_start_km=Decimal("2000.000"),
            odometer_end_km=Decimal("1999.000"),
        )


@pytest.mark.django_db
def test_transportation_api_exposes_fleet_route_tracking_fuel_and_maintenance(api_client):
    tenant = _tenant()
    _authenticate_admin(tenant, api_client)
    now = timezone.now()

    vehicle_response = api_client.post(
        "/api/v1/transportation/vehicle/",
        {
            "name": "Carrinha Norte",
            "license_plate": "TRN-001-MP",
            "vehicle_type": "VAN",
            "fuel_type": "DIESEL",
            "capacity_value": "1200.000",
            "capacity_unit": "KG",
        },
        format="json",
    )
    assert vehicle_response.status_code == 201
    vehicle_id = _response_data(vehicle_response)["id"]

    driver_response = api_client.post(
        "/api/v1/transportation/driver/",
        {
            "name": "Maria Condutora",
            "license_number": "DRV-001",
            "license_category": "C",
            "license_expiry": (timezone.localdate() + timedelta(days=365)).isoformat(),
            "availability": "AVAILABLE",
        },
        format="json",
    )
    assert driver_response.status_code == 201
    driver_id = _response_data(driver_response)["id"]

    route_response = api_client.post(
        "/api/v1/transportation/route/",
        {
            "code": "ROTA-NORTE",
            "name": "Rota Norte",
            "origin": "Armazém",
            "destination": "Distrito Norte",
            "planned_start": now.isoformat(),
        },
        format="json",
    )
    assert route_response.status_code == 201
    route_id = _response_data(route_response)["id"]

    for payload in [
        {"route": route_id, "location_name": "Armazém", "latitude": "-25.965000", "longitude": "32.583000"},
        {"route": route_id, "location_name": "Cliente B", "latitude": "-25.980000", "longitude": "32.610000"},
        {"route": route_id, "location_name": "Cliente A", "latitude": "-25.970000", "longitude": "32.590000"},
    ]:
        stop_response = api_client.post("/api/v1/transportation/route_stop/", payload, format="json")
        assert stop_response.status_code == 201

    optimize_response = api_client.post(
        f"/api/v1/transportation/route/{route_id}/optimize/",
        {"average_speed_kmh": "45"},
        format="json",
    )
    assert optimize_response.status_code == 200
    optimized_payload = _response_data(optimize_response)
    assert optimized_payload["route"]["optimization_status"] == "OPTIMIZED"
    assert len(optimized_payload["optimized_stop_ids"]) == 3
    assert Decimal(optimized_payload["distance_km"]) > 0

    trip_response = api_client.post(
        "/api/v1/transportation/trip/",
        {
            "vehicle": vehicle_id,
            "driver": driver_id,
            "route": route_id,
            "scheduled_start": now.isoformat(),
            "purpose": "DELIVERY",
            "odometer_start_km": "250.000",
        },
        format="json",
    )
    assert trip_response.status_code == 201
    trip_id = _response_data(trip_response)["id"]

    tracking_response = api_client.post(
        "/api/v1/transportation/tracking_point/",
        {
            "vehicle": vehicle_id,
            "trip": trip_id,
            "latitude": "-25.968000",
            "longitude": "32.586000",
            "odometer_km": "260.000",
            "source": "GPS",
        },
        format="json",
    )
    assert tracking_response.status_code == 201
    assert _response_data(tracking_response)["vehicle_plate"] == "TRN-001-MP"

    plan_response = api_client.post(
        "/api/v1/transportation/maintenance_plan/",
        {
            "code": "VAN-REV",
            "name": "Revisão carrinhas",
            "vehicle_type": "VAN",
            "interval_days": 120,
            "interval_km": "8000.000",
        },
        format="json",
    )
    assert plan_response.status_code == 201
    plan_id = _response_data(plan_response)["id"]

    maintenance_response = api_client.post(
        "/api/v1/transportation/maintenance_order/",
        {
            "vehicle": vehicle_id,
            "plan": plan_id,
            "maintenance_type": "PREVENTIVE",
            "due_date": (timezone.localdate() + timedelta(days=20)).isoformat(),
            "summary": "Revisão preventiva",
        },
        format="json",
    )
    assert maintenance_response.status_code == 201

    fuel_response = api_client.post(
        "/api/v1/transportation/fuel_log/",
        {
            "vehicle": vehicle_id,
            "driver": driver_id,
            "trip": trip_id,
            "odometer_km": "275.000",
            "liters": "40.000",
            "unit_price": "90.00",
            "station": "Posto Central",
        },
        format="json",
    )
    assert fuel_response.status_code == 201
    assert _response_data(fuel_response)["total_cost"] == "3600.00"

    list_response = api_client.get("/api/v1/transportation/vehicle/")
    assert list_response.status_code == 200
    assert len(_items(list_response)) == 1
