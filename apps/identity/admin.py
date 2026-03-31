from django.contrib import admin
from django.contrib.auth.admin import UserAdmin

from .models import User


@admin.register(User)
class UserModelAdmin(UserAdmin):
    _all_fields_cache = None  # Cache para evitar recomputar list_display
    # Campos extras que queremos expor no admin.
    personal_extra_fields = ("phone", "photo")
    tenant_fields = ("tenant",)

    def get_list_display(self, request):
        # Usa todos os campos concretos para manter listagem completa.
        if self._all_fields_cache is None:
            # Todos os campos concretos (inclui FKs e booleanos), evita reversos auto_criados.
            self._all_fields_cache = tuple(
                f.name
                for f in self.model._meta.get_fields()
                if not f.auto_created and not f.many_to_many and not f.one_to_many
            )
        return self._all_fields_cache

    # Inclui foto/telefone no formulário de edição.
    fieldsets = (
        (
            None,
            {"fields": ("username", "password")},
        ),
        (
            "Informações pessoais",
            {"fields": ("first_name", "last_name", "email", *personal_extra_fields)},
        ),
        (
            "Tenant",
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


