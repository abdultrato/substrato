from django.contrib import admin

from .models import (
    IntegrationAnalyteMapping,
    IntegrationCredential,
    IntegrationDocument,
    IntegrationEquipment,
    IntegrationMessage,
    IntegrationOrder,
    IntegrationOrderItem,
    IntegrationRouting,
)


@admin.register(IntegrationEquipment)
class IntegrationEquipmentAdmin(admin.ModelAdmin):
    list_display = ("id", "id_custom", "nome", "modalidade", "protocolo", "ativo", "inquilino")
    list_filter = ("modalidade", "protocolo", "ativo", "inquilino")
    search_fields = ("id_custom", "nome", "fabricante", "modelo", "numero_serie")


@admin.register(IntegrationCredential)
class IntegrationCredentialAdmin(admin.ModelAdmin):
    list_display = ("id", "id_custom", "equipamento", "label", "key_prefix", "key_last4", "ativo", "revogada_em")
    list_filter = ("ativo", "equipamento")
    search_fields = ("id_custom", "label", "key_prefix", "key_last4")
    readonly_fields = ("key_hash", "key_prefix", "key_last4", "criado_em", "atualizado_em")


@admin.register(IntegrationRouting)
class IntegrationRoutingAdmin(admin.ModelAdmin):
    list_display = ("id", "id_custom", "equipamento", "tipo_exame", "setor", "ativo", "inquilino")
    list_filter = ("tipo_exame", "setor", "ativo", "inquilino")
    search_fields = ("id_custom",)


class IntegrationOrderItemInline(admin.TabularInline):
    model = IntegrationOrderItem
    extra = 0


@admin.register(IntegrationOrder)
class IntegrationOrderAdmin(admin.ModelAdmin):
    list_display = ("id", "id_custom", "equipamento", "requisicao", "estado", "inquilino", "criado_em")
    list_filter = ("estado", "equipamento", "inquilino")
    search_fields = ("id_custom", "requisicao__id_custom")
    inlines = (IntegrationOrderItemInline,)


@admin.register(IntegrationMessage)
class IntegrationMessageAdmin(admin.ModelAdmin):
    list_display = ("id", "id_custom", "equipamento", "ordem", "direcao", "protocolo", "estado", "criado_em")
    list_filter = ("estado", "direcao", "protocolo", "equipamento")
    search_fields = ("id_custom", "message_id", "sha256")
    readonly_fields = ("sha256", "payload_raw", "payload_json", "criado_em", "atualizado_em")


@admin.register(IntegrationDocument)
class IntegrationDocumentAdmin(admin.ModelAdmin):
    list_display = ("id", "id_custom", "mensagem", "ordem_item", "filename", "content_type", "sha256", "criado_em")
    list_filter = ("content_type",)
    search_fields = ("id_custom", "filename", "sha256")


@admin.register(IntegrationAnalyteMapping)
class IntegrationAnalyteMappingAdmin(admin.ModelAdmin):
    list_display = ("id", "id_custom", "equipamento", "codigo", "exame_campo", "ativo", "inquilino")
    list_filter = ("equipamento", "ativo", "inquilino")
    search_fields = ("id_custom", "codigo", "exame_campo__nome", "equipamento__nome")


IntegracaoEquipamentoAdmin = IntegrationEquipmentAdmin
IntegracaoCredencialAdmin = IntegrationCredentialAdmin
IntegracaoRoteamentoAdmin = IntegrationRoutingAdmin
IntegracaoOrdemItemInline = IntegrationOrderItemInline
IntegracaoOrdemAdmin = IntegrationOrderAdmin
IntegracaoMensagemAdmin = IntegrationMessageAdmin
IntegracaoDocumentoAdmin = IntegrationDocumentAdmin
IntegracaoMapeamentoAnalitoAdmin = IntegrationAnalyteMappingAdmin
