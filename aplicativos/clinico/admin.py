import unicodedata

from django.contrib import admin
from django.urls import reverse
from django.utils.html import format_html
from django.utils.safestring import mark_safe

from .forms_admin import ResultadoItemInlineFormSet
from .modelos.exame import Exame
from .modelos.exame_campo import ExameCampo
from .modelos.exames_medicos import ExameMedico, ExameMedicoCampo
from .modelos.paciente import Paciente
from .modelos.requisicao_analise import RequisicaoAnalise
from .modelos.requisicao_item import RequisicaoItem
from .modelos.resultado import Resultado
from .modelos.resultado_analise import ResultadoItem

# =========================================================
# RBAC HELPERS (DJANGO ADMIN)
# =========================================================


def _normalize_group(value: str) -> str:
    value = (value or "").strip().lower()
    if not value:
        return ""
    value = unicodedata.normalize("NFD", value)
    return "".join(ch for ch in value if unicodedata.category(ch) != "Mn")


def _user_has_any_group(user, group_names: list[str]) -> bool:
    if not user or not getattr(user, "is_authenticated", False):
        return False
    if getattr(user, "is_superuser", False):
        return True
    try:
        raw = list(user.groups.values_list("name", flat=True))
    except Exception:
        raw = []
    have = {_normalize_group(x) for x in raw if x}
    return any(_normalize_group(g) in have for g in (group_names or []))


# =========================================================
# BASE ADMIN
# =========================================================


class CoreAdmin(admin.ModelAdmin):
    search_fields = ("id_custom",)
    readonly_fields = ("criado_em", "atualizado_em")
    ordering = ("-criado_em",)
    list_per_page = 50


# =========================================================
# PACIENTE
# =========================================================


@admin.register(Paciente)
class PacienteAdmin(admin.ModelAdmin):
    list_display = (
        "id_custom",
        "nome",
        "numero_id",
        "genero",
        "idade",
        "contacto",
    )

    search_fields = (
        "id_custom",
        "nome",
        "numero_id",
        "contacto",
        "email",
    )

    list_filter = (
        "genero",
        "proveniencia",
        "gestante",
    )

    ordering = ("nome",)

    list_per_page = 50

    readonly_fields = (
        "id_custom",
        "idade",
        "versao",
        "criado_em",
        "criado_por",
        "criado_por_id",
        "atualizado_em",
        "atualizado_por",
        "deletado_em",
        "deletado_por",
        "deletado_por_id",
    )

    fieldsets = (
        (
            "Identificação do Paciente",
            {
                "fields": (
                    "inquilino",
                    "id_custom",
                    "nome",
                    "tipo_documento",
                    "numero_id",
                )
            },
        ),
        (
            "Dados Demográficos",
            {
                "fields": (
                    "data_nascimento",
                    "idade",
                    "genero",
                    "raca_origem",
                )
            },
        ),
        (
            "Contacto e Morada",
            {
                "fields": (
                    "contacto",
                    "email",
                    "morada",
                )
            },
        ),
        (
            "Informações Clínicas",
            {
                "fields": (
                    "gestante",
                    "idade_gestacional_semanas",
                    "proveniencia",
                )
            },
        ),
        (
            "Auditoria",
            {
                "classes": ("collapse",),
                "fields": (
                    "criado_em",
                    "criado_por",
                    "criado_por_id",
                    "atualizado_em",
                    "atualizado_por",
                    "versao",
                    "deletado_em",
                    "deletado_por",
                    "deletado_por_id",
                ),
            },
        ),
    )


# =========================================================
# EXAME CAMPO
# =========================================================


@admin.register(ExameCampo)
class ExameCampoAdmin(CoreAdmin):
    list_display = (
        "id_custom",
        "nome",
        "exame",
        "tipo",
        "unidade",
        "referencia",
    )

    search_fields = (
        "id_custom",
        "nome",
        "exame__nome",
    )

    list_filter = (
        "tipo",
        "exame",
    )

    autocomplete_fields = ("exame",)

    list_select_related = ("exame",)

    ordering = ("exame", "nome")

    list_per_page = 50

    readonly_fields = (
        "id_custom",
        "versao",
        "criado_em",
        "criado_por",
        "criado_por_id",
        "atualizado_em",
        "atualizado_por",
        "deletado_em",
        "deletado_por",
        "deletado_por_id",
    )

    fieldsets = (
        (
            "Identificação do Parâmetro",
            {
                "fields": (
                    "inquilino",
                    "id_custom",
                    "nome",
                    "exame",
                )
            },
        ),
        (
            "Configuração do Resultado",
            {
                "fields": (
                    "tipo",
                    "unidade",
                )
            },
        ),
        (
            "Valores de Referência",
            {
                "fields": (
                    "referencia_min",
                    "referencia_max",
                    "critico_min",
                    "critico_max",
                )
            },
        ),
        (
            "Auditoria",
            {
                "classes": ("collapse",),
                "fields": (
                    "criado_em",
                    "criado_por",
                    "criado_por_id",
                    "atualizado_em",
                    "atualizado_por",
                    "versao",
                    "deletado_em",
                    "deletado_por",
                    "deletado_por_id",
                ),
            },
        ),
    )

    # =====================================================
    # REFERÊNCIA FORMATADA
    # =====================================================

    def referencia(self, obj):

        min_ref = obj.referencia_min
        max_ref = obj.referencia_max

        if min_ref is not None and max_ref is not None:
            return f"{min_ref} - {max_ref}"

        if min_ref is not None:
            return f"≥ {min_ref}"

        if max_ref is not None:
            return f"≤ {max_ref}"

        return "-"

    referencia.short_description = "Referência"


# =========================================================
# EXAME CAMPO INLINE
# =========================================================


class ExameCampoInline(admin.TabularInline):
    model = ExameCampo

    extra = 0

    fields = (
        "inquilino",
        "nome",
        "tipo",
        "unidade",
        "referencia_min",
        "referencia_max",
        "critico_min",
        "critico_max",
        "delta_max",
    )

    ordering = ("nome",)

    show_change_link = True

    verbose_name = "Parâmetro do exame"
    verbose_name_plural = "Parâmetros do exame"


# =========================================================
# EXAME
# =========================================================


@admin.register(Exame)
class ExameAdmin(CoreAdmin):
    list_display = (
        "id_custom",
        "nome",
        "setor",
        "metodo",
        "trl_horas",
        "preco",
        "iva_percentual",
    )

    search_fields = (
        "id_custom",
        "nome",
    )

    list_filter = (
        "setor",
        "metodo",
    )

    ordering = ("nome",)

    list_per_page = 50

    inlines = (ExameCampoInline,)

    readonly_fields = (
        "id_custom",
        "versao",
        "criado_em",
        "criado_por",
        "criado_por_id",
        "atualizado_em",
        "atualizado_por",
        "deletado_em",
        "deletado_por",
        "deletado_por_id",
    )

    fieldsets = (
        (
            "Informações do Exame",
            {
                "fields": (
                    "inquilino",
                    "id_custom",
                    "nome",
                    "setor",
                    "metodo",
                )
            },
        ),
        (
            "Configuração Clínica",
            {
                "fields": (
                    "trl_horas",
                    "preco",
                    "iva_percentual",
                )
            },
        ),
        (
            "Auditoria",
            {
                "classes": ("collapse",),
                "fields": (
                    "criado_em",
                    "criado_por",
                    "criado_por_id",
                    "atualizado_em",
                    "atualizado_por",
                    "versao",
                    "deletado_em",
                    "deletado_por",
                    "deletado_por_id",
                ),
            },
        ),
    )


# =========================================================
# EXAME MÉDICO
# =========================================================


class ExameMedicoCampoInline(admin.TabularInline):
    model = ExameMedicoCampo
    extra = 0
    fields = (
        "inquilino",
        "nome",
        "tipo",
        "unidade",
        "referencia_min",
        "referencia_max",
        "critico_min",
        "critico_max",
        "delta_max",
    )
    ordering = ("nome",)
    show_change_link = True
    verbose_name = "Parâmetro do exame médico"
    verbose_name_plural = "Parâmetros do exame médico"


@admin.register(ExameMedico)
class ExameMedicoAdmin(CoreAdmin):
    list_display = (
        "id_custom",
        "nome",
        "setor",
        "metodo",
        "trl_horas",
        "preco",
        "iva_percentual",
    )

    search_fields = (
        "id_custom",
        "nome",
    )

    list_filter = (
        "setor",
        "metodo",
    )

    ordering = ("nome",)

    list_per_page = 50

    inlines = (ExameMedicoCampoInline,)

    readonly_fields = (
        "id_custom",
        "versao",
        "criado_em",
        "criado_por",
        "criado_por_id",
        "atualizado_em",
        "atualizado_por",
        "deletado_em",
        "deletado_por",
        "deletado_por_id",
    )

    fieldsets = (
        (
            "Informações do Exame Médico",
            {
                "fields": (
                    "inquilino",
                    "id_custom",
                    "nome",
                    "setor",
                    "metodo",
                )
            },
        ),
        (
            "Configuração Clínica",
            {
                "fields": (
                    "trl_horas",
                    "preco",
                    "iva_percentual",
                )
            },
        ),
        (
            "Auditoria",
            {
                "classes": ("collapse",),
                "fields": (
                    "criado_em",
                    "criado_por",
                    "criado_por_id",
                    "atualizado_em",
                    "atualizado_por",
                    "versao",
                    "deletado_em",
                    "deletado_por",
                    "deletado_por_id",
                ),
            },
        ),
    )


# =========================================================
# REQUISIÇÃO ITEM INLINE
# =========================================================


class RequisicaoItemLabInline(admin.TabularInline):
    model = RequisicaoItem
    extra = 1

    autocomplete_fields = ("exame",)

    fields = ("exame",)

    def get_queryset(self, request):
        return super().get_queryset(request).filter(exame__isnull=False)


class RequisicaoItemMedInline(admin.TabularInline):
    model = RequisicaoItem
    extra = 1

    autocomplete_fields = ("exame_medico",)

    fields = ("exame_medico",)

    def get_queryset(self, request):
        return super().get_queryset(request).filter(exame_medico__isnull=False)


# =========================================================
# REQUISIÇÃO
# =========================================================


@admin.register(RequisicaoAnalise)
class RequisicaoAnaliseAdmin(CoreAdmin):
    list_display = (
        "id_custom",
        "paciente",
        "tipo",
        "estado",
        "status_clinico",
        "criado_em",
    )

    search_fields = (
        "id_custom",
        "paciente__nome",
    )

    list_filter = (
        "status_clinico",
        "estado",
    )

    autocomplete_fields = (
        "paciente",
        "analista",
    )

    list_select_related = (
        "paciente",
        "analista",
    )

    ordering = ("-criado_em",)

    list_per_page = 50

    readonly_fields = (
        "id_custom",
        "criado_em",
        "criado_por_id",
        "criado_por",
        "atualizado_por",
        "deletado_em",
        "deletado_por_id",
        "deletado_por",
        "versao",
    )

    # Inlines são escolhidos dinamicamente (por tipo/setor).
    inlines: tuple = ()

    # =====================================================
    # FIELDSETS
    # =====================================================

    fieldsets = (
        (
            "Identificação da Requisição",
            {
                "fields": (
                    "inquilino",
                    "id_custom",
                )
            },
        ),
        (
            "Informações Clínicas",
            {
                "fields": (
                    "paciente",
                    "tipo",
                    "analista",
                    "estado",
                    "status_clinico",
                )
            },
        ),
        (
            "Auditoria",
            {
                "classes": ("collapse",),
                "fields": (
                    "criado_em",
                    "criado_por",
                    "criado_por_id",
                    "atualizado_por",
                    "versao",
                    "deletado_em",
                    "deletado_por",
                    "deletado_por_id",
                ),
            },
        ),
    )

    # =====================================================
    # UI POR PERFIL (RESTRIÇÕES DE LANÇAMENTO)
    # =====================================================

    def get_list_display(self, request):
        base = [
            "id_custom",
            "paciente",
            "tipo",
            "estado",
            "status_clinico",
            "criado_em",
        ]

        # "Lançar resultados" / PDF somente para Administrador e Técnico de Laboratório.
        if _user_has_any_group(request.user, ["Administrador", "Técnico de Laboratório"]):
            base.insert(5, "lancar_resultado")
            base.insert(6, "ver_pdf_resultado")

        return tuple(base)

    def get_readonly_fields(self, request, obj=None):
        ro = list(super().get_readonly_fields(request, obj))
        # Tipo/setor só pode ser definido na criação.
        if obj is not None and "tipo" not in ro:
            ro.append("tipo")
        return tuple(ro)

    def get_inline_instances(self, request, obj=None):
        # Requisição por setor: mostrar apenas os itens relevantes no change form.
        inline_classes = []
        if obj is None:
            # No add form mostramos ambos para permitir escolher o tipo antes de salvar.
            inline_classes = [RequisicaoItemLabInline, RequisicaoItemMedInline]
        else:
            if obj.tipo == RequisicaoAnalise.Tipo.EXAME_MEDICO:
                inline_classes = [RequisicaoItemMedInline]
            else:
                inline_classes = [RequisicaoItemLabInline]

        return [inline_class(self.model, self.admin_site) for inline_class in inline_classes]

    # -----------------------------------------------------
    # LANÇAR RESULTADO
    # -----------------------------------------------------

    def lancar_resultado(self, obj):

        resultado = obj.obter_resultado()

        if not resultado:
            return "—"

        url = reverse(
            "admin:clinico_resultado_change",
            args=[resultado.id],
        )

        return format_html(
            '<a class="button" href="{}">Lançar resultados</a>',
            url,
        )

    lancar_resultado.short_description = "Lançar resultado"

    # -----------------------------------------------------
    # PDF RESULTADO
    # -----------------------------------------------------

    def ver_pdf_resultado(self, obj):

        if not hasattr(obj, "resultado"):
            return mark_safe('<span style="color:gray;">Ainda sem resultados</span>')

        resultado = obj.resultado
        itens = resultado.itens.all()

        if not itens.exists():
            return mark_safe('<span style="color:gray;">Ainda sem resultados</span>')

        if itens.filter(alerta_critico=True).exists():
            cor = "#c0392b"
            texto = "PDF Crítico"

        elif itens.filter(estado="VALIDADO").count() != itens.count():
            cor = "#e67e22"
            texto = "PDF Parcial"

        else:
            cor = "#27ae60"
            texto = "PDF Final"

        url = reverse(
            "resultado_pdf",
            args=[obj.id_custom],
        )

        return format_html(
            '<a style="background:{};color:white;padding:4px 10px;border-radius:4px;text-decoration:none;" target="_blank" href="{}">{}</a>',
            cor,
            url,
            texto,
        )

    ver_pdf_resultado.short_description = "Resultado PDF"


# =========================================================
# RESULTADO ITEM INLINE
# =========================================================


class ResultadoItemInline(admin.TabularInline):
    model = ResultadoItem
    formset = ResultadoItemInlineFormSet

    extra = 0
    can_delete = False

    fields = (
        "inquilino",
        "exame_nome",
        "exame_campo",
        "referencia",
        "resultado_valor",
        "resultado_colorido",
        "estado",
        "interpretacao",
    )

    readonly_fields = (
        "exame_nome",
        "exame_campo",
        "referencia",
        "resultado_colorido",
        "interpretacao",
    )

    autocomplete_fields = ("exame_campo",)

    # -----------------------------------------------------
    # QUERY OTIMIZADA
    # -----------------------------------------------------

    def get_queryset(self, request):

        qs = super().get_queryset(request)

        return qs.select_related(
            "exame_campo",
            "exame_campo__exame",
        ).order_by(
            "exame_campo__exame__nome",
            "exame_campo__nome",
        )

    # -----------------------------------------------------
    # EXAME
    # -----------------------------------------------------

    def exame_nome(self, obj):

        campo = getattr(obj, "exame_campo", None)

        if campo and campo.exame:
            return format_html("<strong>{}</strong>", campo.exame.nome)

        return "-"

    exame_nome.short_description = "Exame"

    # -----------------------------------------------------
    # REFERÊNCIA
    # -----------------------------------------------------

    def referencia(self, obj):

        campo = getattr(obj, "exame_campo", None)

        if not campo:
            return "-"

        return campo.referencia or "-"

    referencia.short_description = "Referência"

    # -----------------------------------------------------
    # RESULTADO COLORIDO
    # -----------------------------------------------------

    def resultado_colorido(self, obj):

        cor = obj.cor_laudo or "#2c3e50"

        return format_html(
            "<strong style='color:{}'>{}</strong>",
            cor,
            obj.resultado_valor_formatado,
        )

    resultado_colorido.short_description = "Resultado"

    # -----------------------------------------------------
    # INTERPRETAÇÃO
    # -----------------------------------------------------

    def interpretacao(self, obj):

        if not obj.status_clinico:
            return "-"

        cores = {
            "NORMAL": "#2c3e50",
            "BAIXO": "#2980b9",
            "ALTO": "#e67e22",
            "CRITICO_BAIXO": "#c0392b",
            "CRITICO_ALTO": "#c0392b",
        }

        cor = cores.get(obj.status_clinico, "#2c3e50")

        return format_html(
            "<strong style='color:{}'>{}</strong>",
            cor,
            obj.status_clinico,
        )

    interpretacao.short_description = "Interpretação"


# =========================================================
# RESULTADO
# =========================================================


@admin.register(Resultado)
class ResultadoAdmin(CoreAdmin):
    list_display = (
        "id_custom",
        "requisicao",
        "analista",
        "finalizado",
        "criado_em",
    )

    search_fields = (
        "id_custom",
        "requisicao__id_custom",
        "requisicao__paciente__nome",
    )

    list_filter = (
        "finalizado",
        "criado_em",
    )

    list_select_related = (
        "requisicao",
        "analista",
    )

    raw_id_fields = (
        "requisicao",
        "analista",
    )

    ordering = ("-criado_em",)

    list_per_page = 50

    readonly_fields = (
        "id_custom",
        "analista",
        "criado_em",
        "criado_por",
        "criado_por_id",
        "atualizado_por",
        "atualizado_em",
        "deletado_em",
        "deletado_por",
        "deletado_por_id",
        "versao",
    )

    inlines = (ResultadoItemInline,)

    # =====================================================
    # FIELDSETS
    # =====================================================

    fieldsets = (
        (
            "Identificação do Resultado",
            {
                "fields": (
                    "inquilino",
                    "id_custom",
                )
            },
        ),
        (
            "Informações da Requisição",
            {
                "fields": (
                    "requisicao",
                    "analista",
                    "finalizado",
                )
            },
        ),
        (
            "Auditoria",
            {
                "classes": ("collapse",),
                "fields": (
                    "criado_em",
                    "criado_por",
                    "criado_por_id",
                    "atualizado_em",
                    "atualizado_por",
                    "versao",
                    "deletado_em",
                    "deletado_por",
                    "deletado_por_id",
                ),
            },
        ),
    )
