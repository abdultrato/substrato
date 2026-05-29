from django.contrib import admin

from .models import (
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


class RouteStopInline(admin.TabularInline):
    model = RouteStop
    extra = 0
    fields = ("position", "stop_type", "location_name", "address", "latitude", "longitude", "status")
    ordering = ("position", "id")


class VehicleTrackingPointInline(admin.TabularInline):
    model = VehicleTrackingPoint
    extra = 0
    fields = ("recorded_at", "latitude", "longitude", "speed_kmh", "odometer_km", "source")
    ordering = ("-recorded_at",)
    readonly_fields = ()


@admin.register(Vehicle)
class VehicleAdmin(admin.ModelAdmin):
    list_display = ("license_plate", "name", "vehicle_type", "status", "fuel_type", "current_odometer_km", "last_location_at")
    list_filter = ("vehicle_type", "status", "fuel_type", "deleted")
    search_fields = ("license_plate", "fleet_number", "name", "brand", "model", "vin")
    ordering = ("license_plate",)
    inlines = (VehicleTrackingPointInline,)


@admin.register(Driver)
class DriverAdmin(admin.ModelAdmin):
    list_display = ("name", "license_number", "license_category", "license_expiry", "status", "availability", "phone")
    list_filter = ("status", "availability", "license_category", "deleted")
    search_fields = ("name", "document_number", "license_number", "phone", "email")
    autocomplete_fields = ("employee",)
    ordering = ("name",)


@admin.register(TransportationRoute)
class TransportationRouteAdmin(admin.ModelAdmin):
    list_display = ("code", "name", "status", "optimization_status", "planned_start", "planned_distance_km", "estimated_duration_minutes")
    list_filter = ("status", "optimization_status", "optimization_strategy", "deleted")
    search_fields = ("code", "name", "origin", "destination", "notes")
    ordering = ("-planned_start", "code")
    inlines = (RouteStopInline,)


@admin.register(RouteStop)
class RouteStopAdmin(admin.ModelAdmin):
    list_display = ("position", "route", "location_name", "stop_type", "status", "planned_arrival", "actual_arrival")
    list_filter = ("stop_type", "status", "deleted")
    search_fields = ("route__code", "route__name", "location_name", "address", "instructions")
    autocomplete_fields = ("route",)
    ordering = ("route", "position")


@admin.register(Trip)
class TripAdmin(admin.ModelAdmin):
    list_display = ("custom_id", "vehicle", "driver", "route", "status", "purpose", "scheduled_start", "scheduled_end")
    list_filter = ("status", "purpose", "deleted")
    search_fields = ("custom_id", "vehicle__license_plate", "driver__name", "route__code", "start_location", "end_location")
    autocomplete_fields = ("vehicle", "driver", "route")
    ordering = ("-scheduled_start",)


@admin.register(VehicleTrackingPoint)
class VehicleTrackingPointAdmin(admin.ModelAdmin):
    list_display = ("vehicle", "trip", "recorded_at", "latitude", "longitude", "speed_kmh", "source")
    list_filter = ("source", "deleted")
    search_fields = ("vehicle__license_plate", "trip__custom_id", "notes")
    autocomplete_fields = ("vehicle", "trip")
    ordering = ("-recorded_at",)


@admin.register(MaintenancePlan)
class MaintenancePlanAdmin(admin.ModelAdmin):
    list_display = ("code", "name", "vehicle_type", "trigger_type", "interval_days", "interval_km", "active")
    list_filter = ("active", "vehicle_type", "trigger_type", "deleted")
    search_fields = ("code", "name", "checklist", "notes")
    ordering = ("name", "code")


@admin.register(MaintenanceOrder)
class MaintenanceOrderAdmin(admin.ModelAdmin):
    list_display = ("custom_id", "vehicle", "plan", "maintenance_type", "status", "opened_at", "due_date", "cost")
    list_filter = ("maintenance_type", "status", "due_date", "deleted")
    search_fields = ("custom_id", "vehicle__license_plate", "plan__code", "provider", "summary", "notes")
    autocomplete_fields = ("vehicle", "plan")
    ordering = ("-opened_at",)


@admin.register(FuelLog)
class FuelLogAdmin(admin.ModelAdmin):
    list_display = ("custom_id", "vehicle", "driver", "fueled_at", "fuel_type", "liters", "total_cost", "station")
    list_filter = ("fuel_type", "fueled_at", "deleted")
    search_fields = ("custom_id", "vehicle__license_plate", "driver__name", "station", "receipt_number")
    autocomplete_fields = ("vehicle", "driver", "trip")
    ordering = ("-fueled_at",)
