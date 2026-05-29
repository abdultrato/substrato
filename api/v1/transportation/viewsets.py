from __future__ import annotations

from decimal import ROUND_HALF_UP, Decimal
from math import asin, cos, radians, sin, sqrt

from django.utils import timezone
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.viewsets import ModelViewSet

from api.v1.viewset_mixins import TenantScopedQuerysetMixin, ValidatedSearchOrderingMixin
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

from .filters import (
    DriverFilter,
    FuelLogFilter,
    MaintenanceOrderFilter,
    MaintenancePlanFilter,
    RouteStopFilter,
    TransportationRouteFilter,
    TripFilter,
    VehicleFilter,
    VehicleTrackingPointFilter,
)
from .serializers import (
    DriverSerializer,
    FuelLogSerializer,
    MaintenanceOrderSerializer,
    MaintenancePlanSerializer,
    RouteStopSerializer,
    TransportationRouteSerializer,
    TripSerializer,
    VehicleSerializer,
    VehicleTrackingPointSerializer,
)


class TransportationModelViewSet(ValidatedSearchOrderingMixin, TenantScopedQuerysetMixin, ModelViewSet):
    permission_classes = [IsAuthenticated]
    ordering_fields = "__all__"
    ordering = ["-created_at"]


class VehicleViewSet(TransportationModelViewSet):
    queryset = Vehicle.objects.all()
    serializer_class = VehicleSerializer
    filterset_class = VehicleFilter
    search_fields = ["custom_id", "license_plate", "fleet_number", "name", "brand", "model", "vin", "notes"]
    ordering = ["license_plate", "name"]


class DriverViewSet(TransportationModelViewSet):
    queryset = Driver.objects.select_related("employee").all()
    serializer_class = DriverSerializer
    filterset_class = DriverFilter
    search_fields = ["custom_id", "name", "document_number", "license_number", "phone", "email", "notes"]
    ordering = ["name", "license_number"]


class TransportationRouteViewSet(TransportationModelViewSet):
    queryset = TransportationRoute.objects.prefetch_related("stops").all()
    serializer_class = TransportationRouteSerializer
    filterset_class = TransportationRouteFilter
    search_fields = ["custom_id", "code", "name", "origin", "destination", "constraints", "notes"]
    ordering = ["-planned_start", "code"]

    @action(detail=True, methods=["post"], url_path="optimize", url_name="optimize")
    def optimize(self, request, pk=None):
        route = self.get_object()
        average_speed = _decimal_from_request(request.data.get("average_speed_kmh"), Decimal("40.000"))
        if average_speed <= 0:
            average_speed = Decimal("40.000")

        stops = list(route.stops.filter(deleted=False).order_by("position", "id"))
        ordered_stops, total_distance = _nearest_neighbor_sequence(stops)

        if ordered_stops:
            for index, stop in enumerate(ordered_stops, start=1):
                if stop.position != index:
                    RouteStop.objects.filter(pk=stop.pk).update(position=index)

        route.planned_distance_km = _quantize_distance(total_distance)
        route.estimated_duration_minutes = int((total_distance / average_speed * Decimal("60")).to_integral_value(rounding=ROUND_HALF_UP))
        route.optimized_at = timezone.now()
        route.optimization_status = (
            TransportationRoute.OptimizationStatus.OPTIMIZED
            if len(ordered_stops) == len(stops) and len(ordered_stops) >= 2
            else TransportationRoute.OptimizationStatus.PARTIAL
        )
        if route.status in {TransportationRoute.Status.DRAFT, TransportationRoute.Status.PLANNED}:
            route.status = TransportationRoute.Status.OPTIMIZED
        route.save(update_fields=["planned_distance_km", "estimated_duration_minutes", "optimized_at", "optimization_status", "status", "updated_at"])
        route.refresh_from_db()

        serializer = self.get_serializer(route)
        return Response(
            {
                "route": serializer.data,
                "optimized_stop_ids": [stop.id for stop in ordered_stops],
                "distance_km": str(route.planned_distance_km),
            }
        )


class RouteStopViewSet(TransportationModelViewSet):
    queryset = RouteStop.objects.select_related("route").all()
    serializer_class = RouteStopSerializer
    filterset_class = RouteStopFilter
    search_fields = ["custom_id", "route__code", "route__name", "location_name", "address", "instructions"]
    ordering = ["route", "position", "id"]


class TripViewSet(TransportationModelViewSet):
    queryset = Trip.objects.select_related("vehicle", "driver", "route").all()
    serializer_class = TripSerializer
    filterset_class = TripFilter
    search_fields = [
        "custom_id",
        "vehicle__license_plate",
        "vehicle__name",
        "driver__name",
        "route__code",
        "start_location",
        "end_location",
        "cargo_description",
        "notes",
    ]
    ordering = ["-scheduled_start", "-created_at"]


class VehicleTrackingPointViewSet(TransportationModelViewSet):
    queryset = VehicleTrackingPoint.objects.select_related("vehicle", "trip").all()
    serializer_class = VehicleTrackingPointSerializer
    filterset_class = VehicleTrackingPointFilter
    search_fields = ["custom_id", "vehicle__license_plate", "trip__custom_id", "notes"]
    ordering = ["-recorded_at", "-created_at"]


class MaintenancePlanViewSet(TransportationModelViewSet):
    queryset = MaintenancePlan.objects.all()
    serializer_class = MaintenancePlanSerializer
    filterset_class = MaintenancePlanFilter
    search_fields = ["custom_id", "code", "name", "checklist", "notes"]
    ordering = ["name", "code"]


class MaintenanceOrderViewSet(TransportationModelViewSet):
    queryset = MaintenanceOrder.objects.select_related("vehicle", "plan").all()
    serializer_class = MaintenanceOrderSerializer
    filterset_class = MaintenanceOrderFilter
    search_fields = ["custom_id", "vehicle__license_plate", "vehicle__name", "plan__code", "provider", "summary", "notes"]
    ordering = ["-opened_at", "-created_at"]


class FuelLogViewSet(TransportationModelViewSet):
    queryset = FuelLog.objects.select_related("vehicle", "driver", "trip").all()
    serializer_class = FuelLogSerializer
    filterset_class = FuelLogFilter
    search_fields = ["custom_id", "vehicle__license_plate", "driver__name", "station", "receipt_number", "notes"]
    ordering = ["-fueled_at", "-created_at"]


def _decimal_from_request(value, default: Decimal) -> Decimal:
    try:
        return Decimal(str(value))
    except Exception:
        return default


def _has_coordinates(stop: RouteStop) -> bool:
    return stop.latitude is not None and stop.longitude is not None


def _distance_km(first: RouteStop, second: RouteStop) -> Decimal:
    lat1 = radians(float(first.latitude))
    lon1 = radians(float(first.longitude))
    lat2 = radians(float(second.latitude))
    lon2 = radians(float(second.longitude))
    dlat = lat2 - lat1
    dlon = lon2 - lon1
    haversine = sin(dlat / 2) ** 2 + cos(lat1) * cos(lat2) * sin(dlon / 2) ** 2
    km = 2 * 6371.0088 * asin(sqrt(haversine))
    return Decimal(str(km))


def _nearest_neighbor_sequence(stops: list[RouteStop]) -> tuple[list[RouteStop], Decimal]:
    coordinate_stops = [stop for stop in stops if _has_coordinates(stop)]
    if len(coordinate_stops) < 2:
        return coordinate_stops, Decimal("0.000")

    ordered = [coordinate_stops[0]]
    remaining = coordinate_stops[1:]
    total_distance = Decimal("0.000")

    while remaining:
        current = ordered[-1]
        next_stop = min(remaining, key=lambda stop: _distance_km(current, stop))
        total_distance += _distance_km(current, next_stop)
        ordered.append(next_stop)
        remaining.remove(next_stop)

    without_coordinates = [stop for stop in stops if not _has_coordinates(stop)]
    return [*ordered, *without_coordinates], total_distance


def _quantize_distance(value: Decimal) -> Decimal:
    return value.quantize(Decimal("0.001"), rounding=ROUND_HALF_UP)


VIEWSET_MAP = {
    "vehicle": VehicleViewSet,
    "driver": DriverViewSet,
    "route": TransportationRouteViewSet,
    "route_stop": RouteStopViewSet,
    "trip": TripViewSet,
    "tracking_point": VehicleTrackingPointViewSet,
    "maintenance_plan": MaintenancePlanViewSet,
    "maintenance_order": MaintenanceOrderViewSet,
    "fuel_log": FuelLogViewSet,
}
