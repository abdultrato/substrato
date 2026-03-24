from django.contrib import admin

from .models import (
    IntegrationCredential,
    IntegrationDocument,
    IntegrationEquipment,
    IntegrationAnalyteMapping,
    IntegrationMessage,
    IntegrationOrder,
    IntegrationOrderItem,
    IntegrationRouting,
)


@admin.register(IntegrationEquipment)
class IntegracaoEquipamentoAdmin(admin.ModelAdmin):
    list_display = ("id", "id_custom", "nome", "modalidade", "protocolo", "ativo", "inquilino")
    list_filter = ("modalidade", "protocolo", "ativo", "inquilino")
    search_fields = ("id_custom", "nome", "fabricante", "modelo", "numero_serie")


@admin.register(IntegrationCredential)
class IntegracaoCredencialAdmin(admin.ModelAdmin):
    list_display = ("id", "id_custom", "equipamento", "label", "key_prefix", "key_last4", "ativo", "revogada_em")
    list_filter = ("ativo", "equipamento")
    search_fields = ("id_custom", "label", "key_prefix", "key_last4")
    readonly_fields = ("key_hash", "key_prefix", "key_last4", "criado_em", "atualizado_em")


@admin.register(IntegrationRouting)
class IntegracaoRoteamentoAdmin(admin.ModelAdmin):
    list_display = ("id", "id_custom", "equipamento", "tipo_exame", "setor", "ativo", "inquilino")
    list_filter = ("tipo_exame", "setor", "ativo", "inquilino")
    search_fields = ("id_custom",)


class IntegracaoOrdemItemInline(admin.TabularInline):
    model = IntegrationOrderItem
    extra = 0


@admin.register(IntegrationOrder)
class IntegracaoOrdemAdmin(admin.ModelAdmin):
    list_display = ("id", "id_custom", "equipamento", "requisicao", "estado", "inquilino", "criado_em")
    list_filter = ("estado", "equipamento", "inquilino")
    search_fields = ("id_custom", "requisicao__id_custom")
    inlines = (IntegracaoOrdemItemInline,)


@admin.register(IntegrationMessage)
class IntegracaoMensagemAdmin(admin.ModelAdmin):
    list_display = ("id", "id_custom", "equipamento", "ordem", "direcao", "protocolo", "estado", "criado_em")
    list_filter = ("estado", "direcao", "protocolo", "equipamento")
    search_fields = ("id_custom", "message_id", "sha256")
    readonly_fields = ("sha256", "payload_raw", "payload_json", "criado_em", "atualizado_em")


@admin.register(IntegrationDocument)
class IntegracaoDocumentoAdmin(admin.ModelAdmin):
    list_display = ("id", "id_custom", "mensagem", "ordem_item", "filename", "content_type", "sha256", "criado_em")
    list_filter = ("content_type",)
    search_fields = ("id_custom", "filename", "sha256")


@admin.register(IntegrationAnalyteMapping)
class IntegracaoMapeamentoAnalitoAdmin(admin.ModelAdmin):
    list_display = ("id", "id_custom", "equipamento", "codigo", "exame_campo", "ativo", "inquilino")
    list_filter = ("equipamento", "ativo", "inquilino")
    search_fields = ("id_custom", "codigo", "exame_campo__nome", "equipamento__nome")
