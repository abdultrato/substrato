from django.contrib import admin
from django.utils.html import format_html

from .models.coverage_plan import CoveragePlan
from .models.insurer import Insurer
from .models.procedure_authorization import ProcedureAuthorization

# =====================================================
# SEGURADORA
# =====================================================


@admin.register(Insurer)
class InsurerAdmin(admin.ModelAdmin):
    list_display = (
        "custom_id",
        "name",
        "active",
        "created_at",
    )

    search_fields = ("name", "custom_id", "external_code")
    list_filter = ("active", "created_at")
    ordering = ("name",)

    readonly_fields = (
        "custom_id",
        "created_at",
        "updated_at",
    )

    fieldsets = (
        (
            "Informações Gerais",
            {
                "fields": (
                    "custom_id",
                    "name",
                    "active",
                )
            },
        ),
        (
            "Contato",
            {
                "fields": (
                    "email",
                    "phone",
                )
            },
        ),
        (
            "Auditoria",
            {
                "fields": (
                    "created_at",
                    "updated_at",
                    "created_by",
                    "updated_by",
                )
            },
        ),
    )


# =====================================================
# PLANO COBERTURA
# =====================================================


@admin.register(CoveragePlan)
class CoveragePlanAdmin(admin.ModelAdmin):
    list_display = (
        "custom_id",
        "name",
        "insurer",
        "coverage_percentage",
        "requires_authorization",
        "created_at",
    )

    search_fields = (
        "name",
        "insurer__name",
        "custom_id",
    )

    list_filter = (
        "insurer",
        "requires_authorization",
        "created_at",
    )

    readonly_fields = (
        "custom_id",
        "created_at",
        "updated_at",
    )

    autocomplete_fields = ("insurer",)

    fieldsets = (
        (
            "Informações do Plano",
            {
                "fields": (
                    "custom_id",
                    "name",
                    "insurer",
                    "coverage_percentage",
                    "requires_authorization",
                )
            },
        ),
        (
            "Auditoria",
            {
                "fields": (
                    "created_at",
                    "updated_at",
                    "created_by",
                    "updated_by",
                )
            },
        ),
    )


# =====================================================
# AUTORIZAÇÃO
# =====================================================


@admin.register(ProcedureAuthorization)
class ProcedureAuthorizationAdmin(admin.ModelAdmin):
    list_display = (
        "custom_id",
        "request_id",
        "plan",
        "status_colorido",
        "response_date",
    )

    list_filter = (
        "status",
        "plan__insurer",
    )

    search_fields = (
        "custom_id",
        "request_id",
        "authorization_code",
    )

    readonly_fields = (
        "custom_id",
        "authorization_code",
        "response_date",
        "created_at",
        "updated_at",
    )

    autocomplete_fields = ("plan",)

    fieldsets = (
        (
            "Autorização",
            {
                "fields": (
                    "custom_id",
                    "request_id",
                    "plan",
                    "status",
                    "authorization_code",
                    "response_date",
                )
            },
        ),
        (
            "Auditoria",
            {
                "fields": (
                    "created_at",
                    "updated_at",
                    "created_by",
                    "updated_by",
                )
            },
        ),
    )

    def status_colorido(self, obj):
        colors = {
            "PENDENTE": "orange",
            "APROVADA": "green",
            "NEGADA": "red",
        }
        return format_html(
            '<b style="color:{};">{}</b>',
            colors.get(obj.status, "black"),
            obj.status,
        )

    status_colorido.short_description = "Status"


