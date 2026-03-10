from django.contrib import admin

from .modelos.checkin_recepcao import CheckinRecepcao


@admin.register(CheckinRecepcao)
class CheckinRecepcaoAdmin(admin.ModelAdmin):
    list_display = (
        "id_custom",
        "paciente",
        "prioridade",
        "estado",
        "chegou_em",
        "atendente",
    )
    list_filter = ("estado", "prioridade", "chegou_em")
    search_fields = (
        "id_custom",
        "paciente__id_custom",
        "paciente__nome",
        "observacoes",
        "motivo",
    )
    autocomplete_fields = ("paciente", "requisicao", "fatura", "atendente")
    readonly_fields = (
        "id_custom",
        "criado_em",
        "atualizado_em",
        "criado_por",
        "atualizado_por",
        "deletado_em",
        "deletado_por",
        "chamado_em",
        "concluido_em",
    )
    ordering = ("-chegou_em",)

    fieldsets = (
        (
            "Check-in",
            {
                "fields": (
                    "inquilino",
                    "id_custom",
                    "paciente",
                    "prioridade",
                    "estado",
                    "atendente",
                    "motivo",
                    "observacoes",
                )
            },
        ),
        (
            "Vínculos Operacionais",
            {
                "fields": (
                    "requisicao",
                    "fatura",
                )
            },
        ),
        (
            "Tempos",
            {
                "fields": (
                    "chegou_em",
                    "chamado_em",
                    "concluido_em",
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
                    "atualizado_em",
                    "atualizado_por",
                    "deletado_em",
                    "deletado_por",
                ),
            },
        ),
    )
