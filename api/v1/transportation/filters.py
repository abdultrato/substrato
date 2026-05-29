from api.core.filters import SafeFilterSet
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

BASE_FIELDS = [
    "tenant",
    "custom_id",
    "deleted",
    "deleted_at",
    "created_at",
    "updated_at",
    "created_by",
    "updated_by",
]


class VehicleFilter(SafeFilterSet):
    class Meta:
        model = Vehicle
        fields = [*BASE_FIELDS, "license_plate", "fleet_number", "vehicle_type", "status", "fuel_type"]


class DriverFilter(SafeFilterSet):
    class Meta:
        model = Driver
        fields = [*BASE_FIELDS, "employee", "document_number", "license_number", "license_category", "status", "availability"]


class TransportationRouteFilter(SafeFilterSet):
    class Meta:
        model = TransportationRoute
        fields = [*BASE_FIELDS, "code", "status", "optimization_status", "optimization_strategy", "planned_start"]


class RouteStopFilter(SafeFilterSet):
    class Meta:
        model = RouteStop
        fields = [*BASE_FIELDS, "route", "stop_type", "status", "position"]


class TripFilter(SafeFilterSet):
    class Meta:
        model = Trip
        fields = [*BASE_FIELDS, "vehicle", "driver", "route", "status", "purpose", "scheduled_start"]


class VehicleTrackingPointFilter(SafeFilterSet):
    class Meta:
        model = VehicleTrackingPoint
        fields = [*BASE_FIELDS, "vehicle", "trip", "recorded_at", "source"]


class MaintenancePlanFilter(SafeFilterSet):
    class Meta:
        model = MaintenancePlan
        fields = [*BASE_FIELDS, "code", "vehicle_type", "trigger_type", "active"]


class MaintenanceOrderFilter(SafeFilterSet):
    class Meta:
        model = MaintenanceOrder
        fields = [*BASE_FIELDS, "vehicle", "plan", "maintenance_type", "status", "due_date"]


class FuelLogFilter(SafeFilterSet):
    class Meta:
        model = FuelLog
        fields = [*BASE_FIELDS, "vehicle", "driver", "trip", "fuel_type", "fueled_at"]


FILTER_MAP = {
    "vehicle": VehicleFilter,
    "driver": DriverFilter,
    "route": TransportationRouteFilter,
    "route_stop": RouteStopFilter,
    "trip": TripFilter,
    "tracking_point": VehicleTrackingPointFilter,
    "maintenance_plan": MaintenancePlanFilter,
    "maintenance_order": MaintenanceOrderFilter,
    "fuel_log": FuelLogFilter,
}
