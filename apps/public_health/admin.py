from django.contrib import admin

from .models import (
    AdverseEventFollowingImmunization,
    ImmunizationRecord,
    PublicHealthNotification,
    VaccinationCampaign,
    VaccinationCampaignTarget,
    VaccineLot,
    VaccineProduct,
)


@admin.register(VaccineProduct)
class VaccineProductAdmin(admin.ModelAdmin):
    list_display = ("custom_id", "name", "disease", "code", "vaccine_type", "dose_count_required", "active")
    list_filter = ("vaccine_type", "active", "disease", "deleted")
    search_fields = ("custom_id", "name", "code", "official_code", "disease", "manufacturer")
    ordering = ("name", "disease")


@admin.register(VaccineLot)
class VaccineLotAdmin(admin.ModelAdmin):
    list_display = ("custom_id", "vaccine", "lot_number", "status", "expiration_date", "doses_available", "cold_chain_status")
    list_filter = ("status", "cold_chain_status", "expiration_date", "deleted")
    search_fields = ("custom_id", "vaccine__name", "lot_number", "official_batch_code", "storage_location")
    autocomplete_fields = ("vaccine",)
    ordering = ("expiration_date", "vaccine")


@admin.register(VaccinationCampaign)
class VaccinationCampaignAdmin(admin.ModelAdmin):
    list_display = ("custom_id", "name", "vaccine", "campaign_type", "status", "target_region", "start_date", "end_date")
    list_filter = ("campaign_type", "status", "start_date", "target_region", "deleted")
    search_fields = ("custom_id", "name", "vaccine__name", "target_region", "official_program_code")
    autocomplete_fields = ("vaccine", "manager")
    ordering = ("-start_date", "name")


@admin.register(VaccinationCampaignTarget)
class VaccinationCampaignTargetAdmin(admin.ModelAdmin):
    list_display = ("custom_id", "campaign", "region", "district", "target_population", "target_doses", "administered_doses")
    list_filter = ("region", "district", "deleted")
    search_fields = ("custom_id", "campaign__name", "region", "district")
    autocomplete_fields = ("campaign",)
    ordering = ("campaign", "region", "district")


@admin.register(ImmunizationRecord)
class ImmunizationRecordAdmin(admin.ModelAdmin):
    list_display = ("custom_id", "patient", "vaccine", "dose_number", "status", "administered_at", "next_due_date")
    list_filter = ("status", "source", "route", "administered_at", "deleted")
    search_fields = ("custom_id", "patient__name", "vaccine__name", "lot__lot_number", "official_notification_id")
    autocomplete_fields = ("patient", "vaccine", "lot", "campaign", "target_group", "administered_by")
    ordering = ("-administered_at",)


@admin.register(AdverseEventFollowingImmunization)
class AdverseEventFollowingImmunizationAdmin(admin.ModelAdmin):
    list_display = ("custom_id", "patient", "vaccine", "severity", "serious", "status", "reported_at", "investigation_due_at")
    list_filter = ("severity", "serious", "status", "outcome", "reported_at", "deleted")
    search_fields = ("custom_id", "patient__name", "vaccine__name", "symptoms", "official_notification_id")
    autocomplete_fields = ("immunization_record", "patient", "vaccine", "lot", "reported_by", "investigated_by")
    ordering = ("-reported_at",)


@admin.register(PublicHealthNotification)
class PublicHealthNotificationAdmin(admin.ModelAdmin):
    list_display = ("custom_id", "official_system", "event_type", "status", "external_reference", "attempt_count", "sent_at")
    list_filter = ("official_system", "event_type", "status", "sent_at", "deleted")
    search_fields = ("custom_id", "external_reference", "error_message")
    autocomplete_fields = ("campaign", "immunization_record", "adverse_event")
    ordering = ("-created_at",)
