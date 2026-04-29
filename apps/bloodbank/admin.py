from django.contrib import admin

from .models import (
    BloodDonation,
    BloodStockMovement,
    BloodStorage,
    BloodStorageMaintenance,
    BloodTransfusion,
    BloodUnit,
)


class BloodBankCoreAdmin(admin.ModelAdmin):
    list_filter = ("deleted",)
    search_fields = ("custom_id",)
    readonly_fields = (
        "custom_id",
        "created_at",
        "updated_at",
        "deleted_at",
        "version",
        "created_by",
        "updated_by",
        "deleted_by",
    )
    ordering = ("-created_at",)


@admin.register(BloodDonation)
class BloodDonationAdmin(BloodBankCoreAdmin):
    list_display = (
        "custom_id",
        "bag_identifier",
        "donor",
        "blood_type",
        "donor_role",
        "status",
        "screening_status",
        "collected_at",
    )
    list_filter = BloodBankCoreAdmin.list_filter + (
        "status",
        "screening_status",
        "blood_type",
        "donor_role",
    )
    search_fields = BloodBankCoreAdmin.search_fields + (
        "bag_identifier",
        "donor__name",
    )
    list_select_related = ("donor", "collected_by", "replacement_for")


@admin.register(BloodStorage)
class BloodStorageAdmin(BloodBankCoreAdmin):
    list_display = (
        "custom_id",
        "name",
        "location",
        "capacity_units",
        "temperature_min_c",
        "temperature_max_c",
        "is_active",
    )
    list_filter = BloodBankCoreAdmin.list_filter + ("is_active",)
    search_fields = BloodBankCoreAdmin.search_fields + ("name", "location")
    ordering = ("name",)


@admin.register(BloodUnit)
class BloodUnitAdmin(BloodBankCoreAdmin):
    list_display = (
        "custom_id",
        "unit_number",
        "blood_type",
        "component_type",
        "status",
        "storage",
        "reserved_for",
        "expires_at",
    )
    list_filter = BloodBankCoreAdmin.list_filter + (
        "status",
        "blood_type",
        "component_type",
    )
    search_fields = BloodBankCoreAdmin.search_fields + (
        "unit_number",
        "donation__bag_identifier",
    )
    list_select_related = ("donation", "storage", "reserved_for")
    ordering = ("-collected_at", "-created_at")


@admin.register(BloodTransfusion)
class BloodTransfusionAdmin(BloodBankCoreAdmin):
    list_display = (
        "custom_id",
        "recipient",
        "blood_unit",
        "status",
        "requested_at",
        "started_at",
        "finished_at",
    )
    list_filter = BloodBankCoreAdmin.list_filter + ("status",)
    search_fields = BloodBankCoreAdmin.search_fields + (
        "recipient__name",
        "blood_unit__unit_number",
    )
    list_select_related = ("recipient", "blood_unit", "requested_by", "performed_by")
    ordering = ("-requested_at", "-created_at")


@admin.register(BloodStockMovement)
class BloodStockMovementAdmin(BloodBankCoreAdmin):
    list_display = (
        "custom_id",
        "movement_type",
        "unit",
        "source_storage",
        "destination_storage",
        "moved_at",
    )
    list_filter = BloodBankCoreAdmin.list_filter + ("movement_type",)
    search_fields = BloodBankCoreAdmin.search_fields + ("unit__unit_number", "reason")
    list_select_related = ("unit", "source_storage", "destination_storage", "performed_by")
    ordering = ("-moved_at", "-created_at")


@admin.register(BloodStorageMaintenance)
class BloodStorageMaintenanceAdmin(BloodBankCoreAdmin):
    list_display = (
        "custom_id",
        "storage",
        "maintenance_type",
        "status",
        "scheduled_at",
        "performed_at",
        "next_due_at",
    )
    list_filter = BloodBankCoreAdmin.list_filter + ("maintenance_type", "status")
    search_fields = BloodBankCoreAdmin.search_fields + ("storage__name", "technician_name")
    list_select_related = ("storage",)
    ordering = ("-scheduled_at", "-created_at")
