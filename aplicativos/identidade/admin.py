from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin

from .modelos.usuario import Usuario
from .modelos.perfil import PerfilProfissional
from .modelos.password_reset import PasswordResetToken


# =====================================================
# PERFIL INLINE
# =====================================================


class PerfilInline(admin.StackedInline):
    model = PerfilProfissional
    can_delete = False
    extra = 0


# =====================================================
# USUÁRIO
# =====================================================


@admin.register(Usuario)
class UsuarioAdmin(BaseUserAdmin):

    ordering = ("-data_criacao",)

    list_display = (
        "email",
        "first_name",
        "last_name",
        "is_staff",
        "is_active",
        "data_criacao",
    )

    search_fields = ("email", "first_name", "last_name")

    list_filter = ("is_staff", "is_active", "groups")

    readonly_fields = ("data_criacao", "last_login")

    inlines = [PerfilInline]

    fieldsets = (
        (None, {"fields": ("email", "password")}),
        ("Informações Pessoais", {"fields": ("first_name", "last_name", "telefone")}),
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
        ("Datas Importantes", {"fields": ("last_login", "data_criacao")}),
    )

    add_fieldsets = (
        (
            None,
            {
                "classes": ("wide",),
                "fields": ("email", "password1", "password2"),
            },
        ),
    )


# =====================================================
# PASSWORD RESET TOKEN
# =====================================================


@admin.register(PasswordResetToken)
class PasswordResetTokenAdmin(admin.ModelAdmin):

    list_display = ("user", "token", "usado", "criado_em")
    list_filter = ("usado", "criado_em")
    search_fields = ("user__email", "token")

    readonly_fields = ("user", "token", "criado_em", "usado")

    ordering = ("-criado_em",)

    def has_add_permission(self, request):
        return False

    def has_delete_permission(self, request, obj=None):
        return False
