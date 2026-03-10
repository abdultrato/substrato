from django.contrib import admin

from .modelos import (
    Procedimento,
    ProcedimentoItem,
    RegistroEnfermagem,
    SinalVitalEnfermagem,
)


class ProcedimentoItemInline(admin.TabularInline):
    model = ProcedimentoItem
    extra = 1
    fields = (
        "descricao",
        "quantidade",
        "realizado",
        "observacao",
    )


@admin.register(RegistroEnfermagem)
class RegistroEnfermagemAdmin(admin.ModelAdmin):
    list_display = (
        "id_custom",
        "nome",
        "paciente",
        "prioridade",
        "data_registro",
        "criado_em",
    )
    search_fields = (
        "id_custom",
        "nome",
        "paciente__nome",
    )
    list_filter = (
        "prioridade",
        "data_registro",
    )
    autocomplete_fields = ("paciente",)
    list_select_related = ("paciente",)
    ordering = ("-data_registro",)
    readonly_fields = (
        "id_custom",
        "data_registro",
        "criado_em",
        "atualizado_em",
        "criado_por",
        "atualizado_por",
        "versao",
    )
    fieldsets = (
        (
            "Registro de Enfermagem",
            {
                "fields": (
                    "id_custom",
                    "nome",
                    "paciente",
                    "prioridade",
                    "observacao",
                    "data_registro",
                )
            },
        ),
        (
            "Auditoria",
            {
                "classes": ("collapse",),
                "fields": (
                    "criado_em",
                    "atualizado_em",
                    "criado_por",
                    "atualizado_por",
                    "versao",
                ),
            },
        ),
    )


@admin.register(Procedimento)
class ProcedimentoAdmin(admin.ModelAdmin):
    list_display = (
        "id_custom",
        "paciente",
        "profissional",
        "data_realizacao",
        "itens_total",
        "criado_em",
    )
    search_fields = (
        "id_custom",
        "paciente__nome",
        "observacoes",
    )
    list_filter = (
        "data_realizacao",
        "criado_em",
    )
    autocomplete_fields = (
        "paciente",
        "profissional",
    )
    list_select_related = ("paciente", "profissional")
    ordering = ("-data_realizacao",)
    readonly_fields = (
        "id_custom",
        "criado_em",
        "atualizado_em",
        "criado_por",
        "atualizado_por",
        "versao",
    )
    inlines = (ProcedimentoItemInline,)
    fieldsets = (
        (
            "Procedimento",
            {
                "fields": (
                    "id_custom",
                    "inquilino",
                    "paciente",
                    "profissional",
                    "data_realizacao",
                    "observacoes",
                )
            },
        ),
        (
            "Auditoria",
            {
                "classes": ("collapse",),
                "fields": (
                    "criado_em",
                    "atualizado_em",
                    "criado_por",
                    "atualizado_por",
                    "versao",
                ),
            },
        ),
    )

    def itens_total(self, obj):
        return obj.itens.count()

    itens_total.short_description = "Itens"


@admin.register(ProcedimentoItem)
class ProcedimentoItemAdmin(admin.ModelAdmin):
    list_display = (
        "id_custom",
        "procedimento",
        "descricao",
        "quantidade",
        "realizado",
        "criado_em",
    )
    search_fields = (
        "id_custom",
        "descricao",
        "procedimento__id_custom",
        "procedimento__paciente__nome",
    )
    list_filter = ("realizado", "criado_em")
    autocomplete_fields = ("procedimento",)
    list_select_related = ("procedimento", "procedimento__paciente")
    ordering = ("-criado_em",)
    readonly_fields = (
        "id_custom",
        "criado_em",
        "atualizado_em",
        "criado_por",
        "atualizado_por",
        "versao",
    )
    fieldsets = (
        (
            "Item de Procedimento",
            {
                "fields": (
                    "id_custom",
                    "procedimento",
                    "descricao",
                    "quantidade",
                    "realizado",
                    "observacao",
                )
            },
        ),
        (
            "Auditoria",
            {
                "classes": ("collapse",),
                "fields": (
                    "criado_em",
                    "atualizado_em",
                    "criado_por",
                    "atualizado_por",
                    "versao",
                ),
            },
        ),
    )


@admin.register(SinalVitalEnfermagem)
class SinalVitalEnfermagemAdmin(admin.ModelAdmin):
    list_display = (
        "id_custom",
        "nome",
        "registro",
        "temperatura_c",
        "frequencia_cardiaca",
        "saturacao_oxigenio",
        "coletado_em",
    )
    search_fields = (
        "id_custom",
        "nome",
        "registro__paciente__nome",
    )
    list_filter = ("coletado_em",)
    autocomplete_fields = ("registro",)
    list_select_related = ("registro", "registro__paciente")
    ordering = ("-coletado_em",)
    readonly_fields = (
        "id_custom",
        "coletado_em",
        "criado_em",
        "atualizado_em",
        "criado_por",
        "atualizado_por",
        "versao",
    )
    fieldsets = (
        (
            "Sinais Vitais",
            {
                "fields": (
                    "id_custom",
                    "nome",
                    "registro",
                    "temperatura_c",
                    "frequencia_cardiaca",
                    "frequencia_respiratoria",
                    "saturacao_oxigenio",
                    "pressao_arterial",
                    "coletado_em",
                )
            },
        ),
        (
            "Auditoria",
            {
                "classes": ("collapse",),
                "fields": (
                    "criado_em",
                    "atualizado_em",
                    "criado_por",
                    "atualizado_por",
                    "versao",
                ),
            },
        ),
    )
