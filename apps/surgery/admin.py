"""Configuração do admin para Cirurgias e procedimentos cirúrgicos."""

from django.contrib import admin

from .models import (
    AnesthesiaRecord,
    LargeSurgery,
    OperatingRoom,
    OperativeReport,
    RecoveryRecord,
    SmallSurgery,
    Surgery,
    SurgicalConsumption,
    SurgicalMaterial,
    SurgicalProcedure,
    SurgicalSafetyChecklist,
    SurgicalSchedule,
    SurgicalTeamMember,
)


class CoreAdmin(admin.ModelAdmin):
    """Base admin com filtros padrões e auditoria read-only."""
    list_filter = ("deleted",)
    search_fields = ("custom_id",)
    readonly_fields = ("custom_id", "created_at", "updated_at")
    ordering = ("-created_at",)


class BaseCirurgiaAdmin(CoreAdmin):
    """Base compartilhada para pequenas e grandes cirurgias."""
    list_display = (
        "scheduled_for",
        "patient",
        "surgeon",
        "procedures_lista",
        "estimated_price",
        "vat_percentage",
        "surgery_size",
        "status",
    )
    list_filter = ("surgery_size", "status", "deleted")
    search_fields = ("custom_id", "procedure", "patient__name", "surgeon__username", "procedures__name")
    ordering = ("-scheduled_for", "-created_at")
    filter_horizontal = ("procedures",)
    autocomplete_fields = ("patient", "surgeon", "procedures")

    def procedures_lista(self, obj):
        """Lista resumida de procedimentos associados (fallback para texto livre)."""
        nomes = list(obj.procedures.values_list("name", flat=True)[:3])
        if not nomes and (obj.procedure or "").strip():
            return obj.procedure
        if len(nomes) == 3 and obj.procedures.count() > 3:
            return ", ".join(nomes) + "..."
        return ", ".join(nomes) if nomes else "-"

    procedures_lista.short_description = "Procedimentos"


@admin.register(SmallSurgery)
class PequenaCirurgiaAdmin(BaseCirurgiaAdmin):
    """Administra pequenas cirurgias."""


@admin.register(LargeSurgery)
class GrandeCirurgiaAdmin(BaseCirurgiaAdmin):
    """Administra grandes cirurgias."""


@admin.register(Surgery)
class CirurgiaAdmin(BaseCirurgiaAdmin):
    """Administra todas as cirurgias (visão consolidada)."""


@admin.register(SurgicalProcedure)
class ProcedimentoCirurgicoAdmin(CoreAdmin):
    """Catálogo de procedimentos cirúrgicos."""
    list_display = ("name", "base_price", "vat_percentage", "applies_vat_by_default", "active", "created_at")
    list_filter = ("active", "deleted")
    search_fields = ("name", "description", "custom_id")
    ordering = ("name",)


@admin.register(OperatingRoom)
class OperatingRoomAdmin(CoreAdmin):
    list_display = ("code", "name", "room_type", "status", "location", "sterile")
    list_filter = ("room_type", "status", "sterile", "deleted")
    search_fields = ("custom_id", "code", "name", "location", "equipment_notes")
    ordering = ("name", "code")


@admin.register(SurgicalSchedule)
class SurgicalScheduleAdmin(CoreAdmin):
    list_display = ("scheduled_start", "scheduled_end", "surgery", "operating_room", "status", "priority")
    list_filter = ("status", "priority", "deleted", "scheduled_start")
    search_fields = ("custom_id", "surgery__custom_id", "surgery__patient__name", "operating_room__name", "notes")
    autocomplete_fields = ("surgery", "operating_room")
    date_hierarchy = "scheduled_start"


@admin.register(SurgicalTeamMember)
class SurgicalTeamMemberAdmin(CoreAdmin):
    list_display = ("surgery", "employee", "role", "lead", "present")
    list_filter = ("role", "lead", "present", "deleted")
    search_fields = ("custom_id", "surgery__custom_id", "employee__name", "notes")
    autocomplete_fields = ("surgery", "employee")


@admin.register(AnesthesiaRecord)
class AnesthesiaRecordAdmin(CoreAdmin):
    list_display = ("surgery", "anesthetist", "anesthesia_type", "asa_class", "status", "started_at", "ended_at")
    list_filter = ("anesthesia_type", "status", "asa_class", "deleted", "started_at")
    search_fields = ("custom_id", "surgery__custom_id", "anesthetist__name", "airway_management", "complications", "notes")
    autocomplete_fields = ("surgery", "anesthetist")
    date_hierarchy = "started_at"


@admin.register(SurgicalSafetyChecklist)
class SurgicalSafetyChecklistAdmin(CoreAdmin):
    list_display = ("surgery", "phase", "completed_by", "completed_at", "is_complete")
    list_filter = ("phase", "completed_at", "deleted")
    search_fields = ("custom_id", "surgery__custom_id", "completed_by__name", "notes")
    autocomplete_fields = ("surgery", "completed_by")
    date_hierarchy = "completed_at"


@admin.register(SurgicalMaterial)
class SurgicalMaterialAdmin(CoreAdmin):
    list_display = ("code", "name", "material_type", "unit", "reusable", "sterile", "active")
    list_filter = ("material_type", "reusable", "sterile", "active", "deleted")
    search_fields = ("custom_id", "code", "name", "product__name", "notes")
    autocomplete_fields = ("product",)
    ordering = ("name", "code")


@admin.register(SurgicalConsumption)
class SurgicalConsumptionAdmin(CoreAdmin):
    list_display = ("consumed_at", "surgery", "material", "product", "quantity", "unit_cost", "total_cost")
    list_filter = ("deleted", "consumed_at")
    search_fields = ("custom_id", "surgery__custom_id", "material__name", "product__name", "batch_number", "notes")
    autocomplete_fields = ("surgery", "material", "product", "consumed_by")
    date_hierarchy = "consumed_at"


@admin.register(RecoveryRecord)
class RecoveryRecordAdmin(CoreAdmin):
    list_display = ("admitted_at", "discharged_at", "surgery", "nurse", "status", "pain_score", "aldrete_score")
    list_filter = ("status", "deleted", "admitted_at")
    search_fields = ("custom_id", "surgery__custom_id", "nurse__name", "destination", "complications", "notes")
    autocomplete_fields = ("surgery", "nurse")
    date_hierarchy = "admitted_at"


@admin.register(OperativeReport)
class OperativeReportAdmin(CoreAdmin):
    list_display = ("surgery", "primary_surgeon", "status", "specimen_sent_to_pathology", "signed_at")
    list_filter = ("status", "specimen_sent_to_pathology", "deleted", "signed_at")
    search_fields = ("custom_id", "surgery__custom_id", "primary_surgeon__name", "procedure_performed", "findings", "pathology_accession_number")
    autocomplete_fields = ("surgery", "primary_surgeon")
    date_hierarchy = "signed_at"
