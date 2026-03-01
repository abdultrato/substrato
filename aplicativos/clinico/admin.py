from django.contrib import admin

from nucleo.constantes.laboratorio.tipo_resultado import TipoResultado

from .modelos.paciente import Paciente
from .modelos.exame import Exame
from .modelos.exame_campo import ExameCampo
from .modelos.requisicao_analise import RequisicaoAnalise
from .modelos.requisicao_analise_item import RequisicaoItem
from .modelos.resultado_analise import ResultadoItem


# =========================================================
# BASE ADMIN CORPORATIVO
# =========================================================
class CoreAdmin(admin.ModelAdmin):
    list_filter = ("ativo", "deletado")
    search_fields = ("id_custom",)
    readonly_fields = ("criado_em", "atualizado_em")
    ordering = ("-criado_em",)
    list_per_page = 50


def _aplicar_comportamento_campos_numericos(form_cls):
    class ExameCampoAdminForm(form_cls):
        CAMPOS_NUMERICOS = (
            "valor_minimo",
            "valor_maximo",
            "critico_baixo",
            "critico_alto",
        )

        class Media:
            js = ("admin/js/exame_campo_admin.js",)

        def __init__(self, *args, **kwargs):
            super().__init__(*args, **kwargs)
            tipo = self._tipo_atual()
            habilitar_numericos = str(tipo) == str(TipoResultado.NUMERICO)

            for campo in self.CAMPOS_NUMERICOS:
                if campo in self.fields:
                    self.fields[campo].required = False
                    self.fields[campo].disabled = not habilitar_numericos

        def _tipo_atual(self):
            if self.is_bound:
                return self.data.get(self.add_prefix("tipo"))
            return getattr(self.instance, "tipo", None)

        def clean(self):
            cleaned_data = super().clean()
            tipo = cleaned_data.get("tipo")

            if str(tipo) != str(TipoResultado.NUMERICO):
                for campo in self.CAMPOS_NUMERICOS:
                    cleaned_data[campo] = None

            return cleaned_data

    return ExameCampoAdminForm


# =========================================================
# PACIENTE
# =========================================================
@admin.register(Paciente)
class PacienteAdmin(CoreAdmin):
    list_display = ("nome", "numero_id", "contacto", "ativo")
    search_fields = ("nome", "numero_id", "contacto")
    autocomplete_fields = ()

@admin.register(ExameCampo)
class ExameCampoAdmin(CoreAdmin):
    list_display = ("id_custom", "nome", "exame", "ativo")
    search_fields = ("id_custom", "nome", "exame__nome")
    autocomplete_fields = ("exame",)

    def get_form(self, request, obj=None, **kwargs):
        form_cls = super().get_form(request, obj, **kwargs)
        return _aplicar_comportamento_campos_numericos(form_cls)

# =========================================================
# EXAME
# =========================================================
class ExameCampoInline(admin.TabularInline):
    model = ExameCampo
    extra = 0

    def get_formset(self, request, obj=None, **kwargs):
        formset = super().get_formset(request, obj, **kwargs)
        formset.form = _aplicar_comportamento_campos_numericos(formset.form)
        return formset


@admin.register(Exame)
class ExameAdmin(CoreAdmin):
    list_display = ("id_custom", "nome", "ativo")
    search_fields = ("id_custom", "nome")
    inlines = [ExameCampoInline]


# =========================================================
# REQUISIÇÃO (AGREGADO RAIZ)
# =========================================================
class RequisicaoItemInline(admin.TabularInline):
    model = RequisicaoItem
    extra = 1
    autocomplete_fields = ("exame",)


@admin.register(RequisicaoAnalise)
class RequisicaoAnaliseAdmin(CoreAdmin):
    list_display = ("id_custom", "paciente", "status", "status_clinico", "criado_em")
    search_fields = ("id_custom", "paciente__nome")
    list_filter = ("status", "status_clinico", "ativo")
    autocomplete_fields = ("paciente", "analista")
    inlines = [RequisicaoItemInline]


# =========================================================
# RESULTADOS
# =========================================================
@admin.register(ResultadoItem)
class ResultadoAdmin(CoreAdmin):
    list_display = ("id_custom", "exame_campo", "validado")
    list_filter = ("validado",)
    search_fields = ("id_custom",)
    autocomplete_fields = ("exame_campo",)
