"""Configuração do Django Admin para consultas médicas."""

from django.contrib import admin

from .models.consultation_specialty import ConsultationSpecialty
from .models.holiday import Holiday
from .models.medical_consultation import MedicalConsultation


class CoreAdmin(admin.ModelAdmin):
    """Base comum com filtros e ordenação padrão."""
    list_filter = ("deleted",)
    search_fields = ("custom_id",)
    readonly_fields = ("created_at", "updated_at")
    ordering = ("-created_at",)


@admin.register(MedicalConsultation)
class MedicalConsultationAdmin(CoreAdmin):
    """Administra consultas com filtros de status e tipo de agenda."""
    list_display = (
        "scheduled_for",
        "patient",
        "doctor",
        "specialty",
        "type",
        "status",
        "price",
        "schedule_type",
        "manual_holiday",
    )
    list_filter = ("status", "schedule_type", "manual_holiday", "type")
    search_fields = ("type", "patient__name", "doctor__name")
    ordering = ("-scheduled_for", "-created_at")


@admin.register(ConsultationSpecialty)
class ConsultationSpecialtyAdmin(CoreAdmin):
    """Administra especialidades de consulta e preços base."""
    list_display = ("name", "base_price", "vat_percentage", "active", "tenant", "created_at")
    list_filter = ("active",)
    search_fields = ("name",)
    ordering = ("name",)


@admin.register(Holiday)
class HolidayAdmin(CoreAdmin):
    """Administra feriados usados para precificação de consultas."""
    list_display = ("date", "description", "active", "tenant", "created_at")
    list_filter = ("active", "date")
    search_fields = ("description",)
    ordering = ("-date", "-created_at")


