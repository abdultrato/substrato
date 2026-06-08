from __future__ import annotations

from decimal import ROUND_HALF_UP, Decimal
from math import asin, cos, radians, sin, sqrt

from django.apps import apps as django_apps
from django.core.exceptions import ValidationError as DjangoValidationError
from django.utils import timezone
from rest_framework import status as http_status
from rest_framework.decorators import action
from rest_framework.exceptions import ValidationError as DRFValidationError
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.viewsets import ModelViewSet

from api.v1.viewset_mixins import TenantScopedQuerysetMixin, ValidatedSearchOrderingMixin
from apps.transportation.services import TransportationWorkflowService
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


def _as_drf_error(exc: DjangoValidationError) -> DRFValidationError:
    detail = getattr(exc, "message_dict", None) or getattr(exc, "messages", None) or [str(exc)]
    return DRFValidationError(detail)


def _resolve(label: str, model_name: str, pk, tenant):
    if pk in (None, "", 0):
        return None
    model = django_apps.get_model(label, model_name)
    instance = model.objects.filter(pk=pk).first()
    if instance is None:
        raise DRFValidationError(f"{model_name} {pk} não encontrado.")
    if tenant is not None:
        req = getattr(tenant, "id", None)
        inst = getattr(instance, "tenant_id", None)
        if inst is not None and req is not None and inst != req:
            raise DRFValidationError(f"{model_name} pertence a outro tenant.")
    return instance


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

    @action(detail=True, methods=["post"], url_path="marcar-disponivel", url_name="marcar-disponivel")
    def marcar_disponivel(self, request, pk=None):
        obj = self.get_object()
        try:
            TransportationWorkflowService.mark_vehicle_available(obj)
        except DjangoValidationError as exc:
            raise _as_drf_error(exc)
        return Response(self.get_serializer(obj).data)

    @action(detail=True, methods=["post"], url_path="marcar-avariado", url_name="marcar-avariado")
    def marcar_avariado(self, request, pk=None):
        obj = self.get_object()
        try:
            TransportationWorkflowService.mark_vehicle_maintenance(obj, reason=request.data.get("reason", ""))
        except DjangoValidationError as exc:
            raise _as_drf_error(exc)
        return Response(self.get_serializer(obj).data)

    @action(detail=True, methods=["post"], url_path="inativar", url_name="inativar")
    def inativar(self, request, pk=None):
        obj = self.get_object()
        try:
            TransportationWorkflowService.deactivate_vehicle(obj)
        except DjangoValidationError as exc:
            raise _as_drf_error(exc)
        return Response(self.get_serializer(obj).data)


class DriverViewSet(TransportationModelViewSet):
    queryset = Driver.objects.select_related("employee").all()
    serializer_class = DriverSerializer
    filterset_class = DriverFilter
    search_fields = ["custom_id", "name", "document_number", "license_number", "phone", "email", "notes"]
    ordering = ["name", "license_number"]

    @action(detail=True, methods=["post"], url_path="ativar", url_name="ativar")
    def ativar(self, request, pk=None):
        obj = self.get_object()
        try:
            TransportationWorkflowService.activate_driver(obj)
        except DjangoValidationError as exc:
            raise _as_drf_error(exc)
        return Response(self.get_serializer(obj).data)

    @action(detail=True, methods=["post"], url_path="suspender", url_name="suspender")
    def suspender(self, request, pk=None):
        obj = self.get_object()
        try:
            TransportationWorkflowService.suspend_driver(obj, reason=request.data.get("reason", ""))
        except DjangoValidationError as exc:
            raise _as_drf_error(exc)
        return Response(self.get_serializer(obj).data)


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

    @action(detail=True, methods=["post"], url_path="ativar", url_name="ativar")
    def ativar(self, request, pk=None):
        route = self.get_object()
        try:
            TransportationWorkflowService.activate_route(route)
        except DjangoValidationError as exc:
            raise _as_drf_error(exc)
        return Response(self.get_serializer(route).data)

    @action(detail=True, methods=["post"], url_path="cancelar", url_name="cancelar")
    def cancelar(self, request, pk=None):
        route = self.get_object()
        try:
            TransportationWorkflowService.cancel_route(route, reason=request.data.get("reason", ""))
        except DjangoValidationError as exc:
            raise _as_drf_error(exc)
        return Response(self.get_serializer(route).data)


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

    @action(detail=True, methods=["post"], url_path="aprovar", url_name="aprovar")
    def aprovar(self, request, pk=None):
        trip = self.get_object()
        try:
            TransportationWorkflowService.dispatch_trip(trip)
        except DjangoValidationError as exc:
            raise _as_drf_error(exc)
        return Response(self.get_serializer(trip).data)

    @action(detail=True, methods=["post"], url_path="iniciar", url_name="iniciar")
    def iniciar(self, request, pk=None):
        trip = self.get_object()
        try:
            TransportationWorkflowService.start_trip(trip, odometer_start_km=request.data.get("odometer_start_km"))
        except DjangoValidationError as exc:
            raise _as_drf_error(exc)
        return Response(self.get_serializer(trip).data)

    @action(detail=True, methods=["post"], url_path="finalizar", url_name="finalizar")
    def finalizar(self, request, pk=None):
        trip = self.get_object()
        try:
            TransportationWorkflowService.finalize_trip(trip, odometer_end_km=request.data.get("odometer_end_km"))
        except DjangoValidationError as exc:
            raise _as_drf_error(exc)
        return Response(self.get_serializer(trip).data)

    @action(detail=True, methods=["post"], url_path="cancelar", url_name="cancelar")
    def cancelar(self, request, pk=None):
        trip = self.get_object()
        try:
            TransportationWorkflowService.cancel_trip(trip, reason=request.data.get("reason", ""))
        except DjangoValidationError as exc:
            raise _as_drf_error(exc)
        return Response(self.get_serializer(trip).data)

    @action(detail=True, methods=["post"], url_path="rastrear", url_name="rastrear")
    def rastrear(self, request, pk=None):
        trip = self.get_object()
        data = request.data
        try:
            point = TransportationWorkflowService.register_tracking_point(
                trip,
                latitude=data.get("latitude"),
                longitude=data.get("longitude"),
                speed_kmh=data.get("speed_kmh", 0),
                heading_degrees=int(data.get("heading_degrees", 0) or 0),
                odometer_km=data.get("odometer_km"),
                source=data.get("source") or VehicleTrackingPoint.Source.GPS,
            )
        except DjangoValidationError as exc:
            raise _as_drf_error(exc)
        return Response(
            VehicleTrackingPointSerializer(point, context=self.get_serializer_context()).data,
            status=http_status.HTTP_201_CREATED,
        )


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

    @action(detail=True, methods=["post"], url_path="iniciar", url_name="iniciar")
    def iniciar(self, request, pk=None):
        order = self.get_object()
        try:
            TransportationWorkflowService.start_maintenance(order)
        except DjangoValidationError as exc:
            raise _as_drf_error(exc)
        return Response(self.get_serializer(order).data)

    @action(detail=True, methods=["post"], url_path="concluir", url_name="concluir")
    def concluir(self, request, pk=None):
        order = self.get_object()
        data = request.data
        try:
            TransportationWorkflowService.complete_maintenance(
                order,
                cost=data.get("cost"),
                summary=data.get("summary", ""),
                checklist_result=data.get("checklist_result", ""),
                odometer_km=data.get("odometer_km"),
            )
        except DjangoValidationError as exc:
            raise _as_drf_error(exc)
        return Response(self.get_serializer(order).data)

    @action(detail=True, methods=["post"], url_path="cancelar", url_name="cancelar")
    def cancelar(self, request, pk=None):
        order = self.get_object()
        try:
            TransportationWorkflowService.cancel_maintenance(order, reason=request.data.get("reason", ""))
        except DjangoValidationError as exc:
            raise _as_drf_error(exc)
        return Response(self.get_serializer(order).data)


class FuelLogViewSet(TransportationModelViewSet):
    queryset = FuelLog.objects.select_related("vehicle", "driver", "trip").all()
    serializer_class = FuelLogSerializer
    filterset_class = FuelLogFilter
    search_fields = ["custom_id", "vehicle__license_plate", "driver__name", "station", "receipt_number", "notes"]
    ordering = ["-fueled_at", "-created_at"]

    @action(detail=False, methods=["post"], url_path="registar", url_name="registar")
    def registar(self, request):
        tenant = getattr(request, "tenant", None)
        vehicle = _resolve("transportation", "Vehicle", request.data.get("vehicle"), tenant)
        if vehicle is None:
            raise DRFValidationError({"vehicle": "Veículo é obrigatório."})
        driver = _resolve("transportation", "Driver", request.data.get("driver"), tenant)
        trip = _resolve("transportation", "Trip", request.data.get("trip"), tenant)
        try:
            fuel = TransportationWorkflowService.register_fuel_log(
                vehicle=vehicle,
                odometer_km=request.data.get("odometer_km"),
                liters=request.data.get("liters"),
                unit_price=request.data.get("unit_price", 0),
                driver=driver,
                trip=trip,
                fuel_type=request.data.get("fuel_type"),
                station=request.data.get("station", ""),
                receipt_number=request.data.get("receipt_number", ""),
            )
        except DjangoValidationError as exc:
            raise _as_drf_error(exc)
        return Response(self.get_serializer(fuel).data, status=http_status.HTTP_201_CREATED)


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
