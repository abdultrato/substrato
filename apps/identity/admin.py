from django.contrib import admin
from django.contrib.auth.admin import UserAdmin
from django.utils.html import format_html

from .models import User


@admin.register(User)
class UserModelAdmin(UserAdmin):
    _all_fields_cache = None  # Cache para evitar recomputar list_display
    # Campos extras que queremos expor no admin.
    personal_extra_fields = ("phone", "photo")
    tenant_fields = ("tenant",)
    readonly_fields = ("photo_preview",)

    def get_list_display(self, request):
        # Usa todos os campos concretos para manter listagem completa.
        if self._all_fields_cache is None:
            # Todos os campos concretos (inclui FKs e booleanos), evita reversos auto_criados.
            self._all_fields_cache = tuple(
                f.name
                for f in self.model._meta.get_fields()
                if not f.auto_created and not f.many_to_many and not f.one_to_many
            )
        return ("photo_thumbnail", *self._all_fields_cache)

    @admin.display(description="Foto")
    def photo_thumbnail(self, obj):
        if not obj or not obj.photo:
            return "Sem foto"
        try:
            photo_url = obj.photo.url
        except ValueError:
            return "Sem foto"
        return format_html(
            '<img src="{}" alt="{}" style="width:36px;height:36px;object-fit:cover;border-radius:999px;border:1px solid #e5e7eb;background:#fff;" />',
            photo_url,
            obj.get_full_name() or obj.username,
        )

    @admin.display(description="Pré-visualização da foto")
    def photo_preview(self, obj):
        if not obj or not obj.photo:
            return "Sem foto carregada."
        try:
            photo_url = obj.photo.url
        except ValueError:
            return "Sem foto carregada."
        return format_html(
            '<a href="{0}" target="_blank" rel="noreferrer">'
            '<img src="{0}" alt="{1}" style="max-width:160px;max-height:160px;object-fit:cover;border-radius:12px;border:1px solid #e5e7eb;background:#fff;padding:4px;" />'
            "</a>",
            photo_url,
            obj.get_full_name() or obj.username,
        )

    # Inclui foto/telefone no formulário de edição.
    fieldsets = (
        (
            None,
            {"fields": ("username", "password")},
        ),
        (
            "Informações pessoais",
            {"fields": ("photo_preview", "first_name", "last_name", "email", *personal_extra_fields)},
        ),
        (
            "Cliente",
            {"fields": tenant_fields},
        ),
        (
            "Permissões",
            {
                "fields": (
                    "is_active",
                    "is_staff",
                    "is_superuser",
                    "groups",
                    "user_permissions",
                )
            },
        ),
        ("Datas importantes", {"fields": ("last_login", "date_joined")}),
    )

    # Inclui foto/telefone no formulário de criação.
    add_fieldsets = (
        (
            None,
            {
                "classes": ("wide",),
                "fields": (
                    "username",
                    "email",
                    "first_name",
                    "last_name",
                    *personal_extra_fields,
                    *tenant_fields,
                    "password1",
                    "password2",
                    "is_active",
                    "is_staff",
                    "is_superuser",
                    "groups",
                ),
            },
        ),
    )

