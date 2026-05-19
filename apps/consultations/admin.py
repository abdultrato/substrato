"""Configuração do Django Admin para consultas médicas."""

from django.contrib import admin
from django.urls import reverse
from django.utils.html import format_html, format_html_join

from apps.medical_records.models.medical_record_entry import MedicalRecordEntry

from .models.consultation_specialty import ConsultationSpecialty
from .models.holiday import Holiday
from .models.medical_consultation import MedicalConsultation


class CoreAdmin(admin.ModelAdmin):
    """Base comum com filtros e ordenação padrão."""
    list_filter = ("deleted",)
    search_fields = ("custom_id",)
    readonly_fields = ("created_at", "updated_at")
    ordering = ("-created_at",)


class CardexConsultationInline(admin.TabularInline):
    model = MedicalRecordEntry.consultations.through
    fk_name = "medicalconsultation"
    extra = 0
    autocomplete_fields = ("medicalrecordentry",)
    fields = ("medicalrecordentry",)
    verbose_name = "Cardex (Prontuário)"
    verbose_name_plural = "Cardex (Prontuário)"


@admin.register(MedicalConsultation)
class MedicalConsultationAdmin(CoreAdmin):
    """Administra consultas com filtros de status e tipo de agenda."""
    inlines = [CardexConsultationInline]
    readonly_fields = (*CoreAdmin.readonly_fields, "historia_clinica_api", "cardex_preview")
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
        "cardex_count",
        "historia_clinica_api",
    )
    list_filter = ("status", "schedule_type", "manual_holiday", "type")
    search_fields = ("type", "patient__name", "doctor__name")
    ordering = ("-scheduled_for", "-created_at")

    @admin.display(description="Cardex")
    def cardex_count(self, obj: MedicalConsultation) -> int:
        try:
            return obj.cardex_registros.filter(deleted=False).count()
        except Exception:
            return 0

    @admin.display(description="História clínica (API)")
    def historia_clinica_api(self, obj: MedicalConsultation) -> str:
        if not getattr(obj, "patient_id", None):
            return "-"
        url = f"/api/v1/clinical/patient/{obj.patient_id}/historia_clinica/?limit=200"
        return format_html('<a href="{}" target="_blank" rel="noreferrer">Abrir</a>', url)

    @admin.display(description="Prévia do Cardex")
    def cardex_preview(self, obj: MedicalConsultation) -> str:
        if not getattr(obj, "patient_id", None):
            return "-"

        qs = (
            MedicalRecordEntry.objects.filter(
                deleted=False,
                patient_id=obj.patient_id,
                consultations=obj,
            )
            .select_related("doctor")
            .order_by("-care_start_at", "-created_at")
        )[:5]

        items = []
        for entry in qs:
            dt = getattr(entry, "care_start_at", None)
            doctor_name = getattr(getattr(entry, "doctor", None), "name", "") or "-"
            diagnosis = (getattr(entry, "diagnosis", "") or "").strip() or "-"
            items.append((dt, doctor_name, diagnosis))

        if not items:
            changelist = reverse("admin:prontuario_medicalrecordentry_changelist")
            url = f"{changelist}?patient__id__exact={obj.patient_id}"
            return format_html('Sem cardex vinculado. <a href="{}">Ver por paciente</a>', url)

        return format_html(
            "<div><strong>Últimos 5 cardex vinculados a esta consulta:</strong></div>"
            "<ul>{}</ul>",
            format_html_join(
                "",
                "<li>{} — {} — {}</li>",
                ((dt or "-", doctor, diagnosis) for dt, doctor, diagnosis in items),
            ),
        )


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


