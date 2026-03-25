from django.contrib import admin

from .models.configuration import TenantConfiguration
from .models.tenant import Tenant


class CoreAdmin(admin.ModelAdmin):
    list_filter = ("deleted",)
    search_fields = ("custom_id",)
    readonly_fields = ("created_at", "updated_at")
    ordering = ("-created_at",)


@admin.register(Tenant)
class TenantAdmin(admin.ModelAdmin):
    list_display = ("identifier", "name", "domain", "active", "commercial_status", "trial_until")
    list_filter = ("active", "commercial_status")
    search_fields = ("identifier", "name", "domain")
    ordering = ("identifier",)


@admin.register(TenantConfiguration)
class TenantConfigurationAdmin(CoreAdmin):
    list_display = (
        "tenant",
        "time_zone",
        "currency",
        "language",
        "holiday_consultation_percentage_surcharge",
    )
    list_filter = ("currency", "language")
    search_fields = ("tenant__name", "tenant__identifier")


