from django.contrib import admin

from .models.company import Company


@admin.register(Company)
class EmpresaAdmin(admin.ModelAdmin):
    list_display = (
        "custom_id",
        "name",
        "nuit",
        "phone1",
        "email",
        "active",
        "created_at",
    )
    list_filter = ("active",)
    search_fields = ("custom_id", "name", "nuit", "phone1", "email")
    ordering = ("name",)
