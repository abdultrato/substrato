from django.contrib import admin

from .models import (
    AntibioticStewardshipReview,
    ClinicalPharmacyIngredient,
    ClinicalPharmacyIVPreparation,
    ControlledSubstanceMovement,
    DrugInteractionRule,
    MedicationInteractionCheck,
)


class ClinicalPharmacyIngredientInline(admin.TabularInline):
    model = ClinicalPharmacyIngredient
    extra = 0
    fields = ("position", "product", "lot", "role", "quantity_value", "quantity_unit", "controlled_substance", "hazardous")
    ordering = ("position", "id")


class ControlledSubstanceMovementInline(admin.TabularInline):
    model = ControlledSubstanceMovement
    extra = 0
    fields = ("movement_type", "product", "lot", "quantity", "unit", "movement_at", "running_balance")
    readonly_fields = ("running_balance",)
    ordering = ("-movement_at",)


@admin.register(ClinicalPharmacyIVPreparation)
class ClinicalPharmacyIVPreparationAdmin(admin.ModelAdmin):
    list_display = ("custom_id", "patient", "preparation_type", "product", "status", "priority", "scheduled_at", "prepared_at", "expires_at")
    list_filter = ("preparation_type", "status", "priority", "hazardous_drug", "sterility_check_passed", "compatibility_check_passed", "deleted")
    search_fields = ("custom_id", "patient__name", "product__name", "protocol_reference", "notes")
    autocomplete_fields = ("patient", "prescription_item", "product", "lot", "pharmacist", "verifier", "prepared_by")
    ordering = ("-requested_at",)
    inlines = (ClinicalPharmacyIngredientInline, ControlledSubstanceMovementInline)


@admin.register(ClinicalPharmacyIngredient)
class ClinicalPharmacyIngredientAdmin(admin.ModelAdmin):
    list_display = ("custom_id", "preparation", "product", "lot", "role", "quantity_value", "quantity_unit", "controlled_substance")
    list_filter = ("role", "controlled_substance", "hazardous", "deleted")
    search_fields = ("custom_id", "preparation__custom_id", "product__name", "lot__lot_number")
    autocomplete_fields = ("preparation", "product", "lot")
    ordering = ("preparation", "position")


@admin.register(DrugInteractionRule)
class DrugInteractionRuleAdmin(admin.ModelAdmin):
    list_display = ("name", "primary_drug", "interacting_drug", "severity", "active")
    list_filter = ("severity", "active", "deleted")
    search_fields = ("name", "primary_drug__name", "interacting_drug__name", "clinical_effect", "recommendation")
    autocomplete_fields = ("primary_drug", "interacting_drug")
    ordering = ("severity", "name")


@admin.register(MedicationInteractionCheck)
class MedicationInteractionCheckAdmin(admin.ModelAdmin):
    list_display = ("custom_id", "patient", "primary_drug", "interacting_drug", "severity", "status", "checked_at")
    list_filter = ("severity", "status", "checked_at", "deleted")
    search_fields = ("custom_id", "patient__name", "primary_drug__name", "interacting_drug__name", "recommendation", "action_taken")
    autocomplete_fields = ("patient", "prescription_item", "primary_drug", "interacting_drug", "rule", "pharmacist")
    ordering = ("-checked_at",)


@admin.register(ControlledSubstanceMovement)
class ControlledSubstanceMovementAdmin(admin.ModelAdmin):
    list_display = ("custom_id", "product", "lot", "movement_type", "quantity", "unit", "running_balance", "movement_at", "patient")
    list_filter = ("movement_type", "schedule", "movement_at", "deleted")
    search_fields = ("custom_id", "product__name", "lot__lot_number", "patient__name", "chain_of_custody_code", "reason")
    autocomplete_fields = ("product", "lot", "patient", "prescription_item", "preparation", "responsible", "witness")
    readonly_fields = ("running_balance",)
    ordering = ("-movement_at",)


@admin.register(AntibioticStewardshipReview)
class AntibioticStewardshipReviewAdmin(admin.ModelAdmin):
    list_display = ("custom_id", "patient", "antibiotic", "therapy_type", "status", "start_date", "review_due_date", "reviewed_at")
    list_filter = ("therapy_type", "status", "deescalation_recommended", "review_due_date", "deleted")
    search_fields = ("custom_id", "patient__name", "antibiotic__name", "indication", "infection_site", "organism", "recommendation")
    autocomplete_fields = ("patient", "prescription_item", "antibiotic", "reviewer")
    ordering = ("-start_date",)
