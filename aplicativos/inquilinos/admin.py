from django.contrib import admin
from django.utils.html import format_html
from django.db.models import Count
from .modelos.inquilino import  Inquilino
from .modelos.configuracao import  ConfiguracaoInquilino
from .modelos.feature_flags import FeatureFlagTenant
from .modelos.plano_assinatura import PlanoAssinatura
from .modelos.uso_tenant import UsoTenant
from nucleo.modelos.base import CoreModel

# ===============================
# Inline Uso
# ===============================

class UsoInline(admin.StackedInline):
    model = UsoTenant
    extra = 0
    can_delete = False
    readonly_fields = ("usuarios_ativos", "requisicoes_mes_atual")


# ===============================
# Inline Config
# ===============================

class ConfigInline(admin.StackedInline):
    model = ConfiguracaoInquilino
    extra = 0
    can_delete = False


# ===============================
# Admin Principal
# ===============================

@admin.register(Inquilino)
class InquilinoAdmin(admin.ModelAdmin):
    list_display = (
        "nome",
        "identificador",
        "usuarios_ativos",
        "uso_requisicoes",
        "status",
    )

    list_filter = ("ativo", )

    search_fields = ("nome", "identificador")

    inlines = [
        ConfigInline,
        
        UsoInline,
    ]

    # ---------------------------------
    # Performance
    # ---------------------------------

    def get_queryset(self, request):
        return (
            super()
            .get_queryset(request)
            .select_related("plano", "uso", "configuracao")
        )

    # ---------------------------------
    # Colunas calculadas
    # ---------------------------------

    @admin.display(description="Plano")
    def tipo_plano(self, obj):
        if hasattr(obj, "plano"):
            return obj.plano.tipo
        return "-"

    @admin.display(description="Usuários")
    def usuarios_ativos(self, obj):
        if hasattr(obj, "uso"):
            return obj.uso.usuarios_ativos
        return 0

    @admin.display(description="Uso Req.")
    def uso_requisicoes(self, obj):
        if hasattr(obj, "uso") and hasattr(obj, "plano"):
            percentual = obj.uso.percentual_uso_requisicoes()

            cor = "green"
            if percentual > 80:
                cor = "orange"
            if percentual > 100:
                cor = "red"

            return format_html(
                '<b style="color:{};">{:.1f}%</b>',
                cor,
                percentual,
            )
        return "-"

    @admin.display(description="Status")
    def status(self, obj):
        if obj.ativo:
            return format_html('<span style="color:green;">● Ativo</span>')
        return format_html('<span style="color:red;">● Inativo</span>')

    # ---------------------------------
    # Segurança
    # ---------------------------------

    def has_delete_permission(self, request, obj=None):
        return request.user.is_superuser
