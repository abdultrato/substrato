from __future__ import annotations

from rest_framework import serializers

from api.v1.compat import LegacyAliasSerializerMixin
from apps.equipment_integrations.models import (
    IntegrationAnalyteMapping,
    IntegrationCredential,
    IntegrationDocument,
    IntegrationEquipment,
    IntegrationMessage,
    IntegrationOrder,
    IntegrationOrderItem,
    IntegrationRouting,
)

CORE_READ_ONLY_FIELDS = [
    "id",
    "custom_id",
    "tenant",
    "created_by",
    "updated_by",
    "created_at",
    "updated_at",
    "deleted",
    "deleted_at",
    "deleted_by",
    "version",
]

INTEGRATION_EQUIPMENT_ALIASES = {
    "id_custom": "custom_id",
    "nome": "name",
    "modalidade": "modality",
    "protocolo": "protocol",
    "fabricante": "manufacturer",
    "modelo": "model",
    "serial": "serial_number",
    "numero_serie": "serial_number",
    "número_série": "serial_number",
    "numero_de_serie": "serial_number",
    "número_de_série": "serial_number",
    "ativo": "active",
    "activa": "active",
    "modo_comunicacao": "connection_mode",
    "modo_comunicação": "connection_mode",
    "host_tcp": "tcp_host",
    "endereco_tcp": "tcp_host",
    "endereço_tcp": "tcp_host",
    "porta_tcp": "tcp_port",
    "timeout_tcp": "tcp_timeout_seconds",
    "enquadramento_tcp": "tcp_framing",
    "codificacao": "encoding",
    "codificação": "encoding",
    "consumo_automatico": "auto_consume_results",
    "tipos_exame_suportados": "supported_exam_types",
    "ultima_comunicacao": "last_seen_at",
    "última_comunicação": "last_seen_at",
    "configuracao": "config",
    "configuração": "config",
}

INTEGRATION_CREDENTIAL_ALIASES = {
    "id_custom": "custom_id",
    "equipamento": "equipment",
    "rotulo": "label",
    "rótulo": "label",
    "nome": "label",
    "chave_prefixo": "key_prefix",
    "ultimos_4": "key_last4",
    "últimos_4": "key_last4",
    "escopos": "scopes",
    "permissoes": "scopes",
    "permissões": "scopes",
    "ativo": "active",
    "revogado_em": "revoked_at",
    "chave_gerada": "generated_key",
}

INTEGRATION_ROUTING_ALIASES = {
    "id_custom": "custom_id",
    "equipamento": "equipment",
    "tipo_exame": "exam_type",
    "tipo_de_exame": "exam_type",
    "setor": "sector",
    "sector": "sector",
    "ativo": "active",
}

INTEGRATION_ORDER_ALIASES = {
    "id_custom": "custom_id",
    "equipamento": "equipment",
    "requisicao": "request",
    "requisição": "request",
    "pedido": "request",
    "estado": "status",
    "observacao": "observation",
    "observação": "observation",
    "observacoes": "observation",
    "observações": "observation",
}

INTEGRATION_ORDER_ITEM_ALIASES = {
    "id_custom": "custom_id",
    "ordem": "order",
    "order": "order",
    "item_requisicao": "request_item",
    "item_requisição": "request_item",
    "item_pedido": "request_item",
    "estado": "status",
    "posicao": "position",
    "posição": "position",
}

INTEGRATION_MESSAGE_ALIASES = {
    "id_custom": "custom_id",
    "equipamento": "equipment",
    "ordem": "order",
    "direcao": "direction",
    "direção": "direction",
    "sentido": "direction",
    "protocolo": "protocol",
    "id_mensagem": "message_id",
    "mensagem_externa": "message_id",
    "tipo_conteudo": "content_type",
    "tipo_conteúdo": "content_type",
    "checksum": "sha256",
    "payload": "payload_json",
    "payload_bruto": "payload_raw",
    "estado": "status",
    "erro": "error",
    "processado_em": "processed_at",
}

INTEGRATION_DOCUMENT_ALIASES = {
    "id_custom": "custom_id",
    "mensagem": "message",
    "item_ordem": "order_item",
    "ficheiro": "file",
    "arquivo": "file",
    "nome_ficheiro": "filename",
    "nome_arquivo": "filename",
    "tipo_conteudo": "content_type",
    "tipo_conteúdo": "content_type",
    "checksum": "sha256",
}

INTEGRATION_ANALYTE_MAPPING_ALIASES = {
    "id_custom": "custom_id",
    "nome": "name",
    "equipamento": "equipment",
    "codigo": "code",
    "código": "code",
    "codigo_analito": "code",
    "código_analito": "code",
    "campo_exame": "exam_field",
    "campo_de_exame": "exam_field",
    "unidade": "unit_override",
    "unidade_override": "unit_override",
    "ativo": "active",
}


class IntegrationEquipmentSerializer(LegacyAliasSerializerMixin, serializers.ModelSerializer):
    legacy_input_aliases = INTEGRATION_EQUIPMENT_ALIASES
    legacy_output_aliases = INTEGRATION_EQUIPMENT_ALIASES

    class Meta:
        model = IntegrationEquipment
        fields = "__all__"
        read_only_fields = [*CORE_READ_ONLY_FIELDS, "last_seen_at"]


class IntegrationCredentialSerializer(LegacyAliasSerializerMixin, serializers.ModelSerializer):
    generated_key = serializers.CharField(read_only=True)

    legacy_input_aliases = INTEGRATION_CREDENTIAL_ALIASES
    legacy_output_aliases = INTEGRATION_CREDENTIAL_ALIASES

    class Meta:
        model = IntegrationCredential
        exclude = ("key_hash",)
        read_only_fields = [
            *CORE_READ_ONLY_FIELDS,
            "key_prefix",
            "key_last4",
            "revoked_at",
        ]

    def create(self, validated_data):
        tenant = validated_data.pop("tenant", None)
        equipment = validated_data.pop("equipment")
        label = validated_data.pop("label", "")
        scopes = validated_data.pop("scopes", None)
        active = validated_data.pop("active", True)

        if tenant is not None and equipment.tenant_id != tenant.id:
            raise serializers.ValidationError({"equipment": "Equipamento pertence a outro tenant."})

        credential, raw_key = IntegrationCredential.generate(
            equipment=equipment,
            label=label,
            scopes=scopes,
        )
        if active is False:
            credential.active = False
            credential.save(update_fields=["active", "updated_at"])
        credential.generated_key = raw_key
        return credential

    def to_representation(self, instance):
        data = super().to_representation(instance)
        generated_key = getattr(instance, "generated_key", "")
        if generated_key:
            data["generated_key"] = generated_key
        return data


class IntegrationRoutingSerializer(LegacyAliasSerializerMixin, serializers.ModelSerializer):
    legacy_input_aliases = INTEGRATION_ROUTING_ALIASES
    legacy_output_aliases = INTEGRATION_ROUTING_ALIASES

    class Meta:
        model = IntegrationRouting
        fields = "__all__"
        read_only_fields = CORE_READ_ONLY_FIELDS


class IntegrationOrderSerializer(LegacyAliasSerializerMixin, serializers.ModelSerializer):
    legacy_input_aliases = INTEGRATION_ORDER_ALIASES
    legacy_output_aliases = INTEGRATION_ORDER_ALIASES

    class Meta:
        model = IntegrationOrder
        fields = "__all__"
        read_only_fields = CORE_READ_ONLY_FIELDS


class IntegrationOrderItemSerializer(LegacyAliasSerializerMixin, serializers.ModelSerializer):
    legacy_input_aliases = INTEGRATION_ORDER_ITEM_ALIASES
    legacy_output_aliases = INTEGRATION_ORDER_ITEM_ALIASES

    class Meta:
        model = IntegrationOrderItem
        fields = "__all__"
        read_only_fields = CORE_READ_ONLY_FIELDS


class IntegrationMessageSerializer(LegacyAliasSerializerMixin, serializers.ModelSerializer):
    legacy_input_aliases = INTEGRATION_MESSAGE_ALIASES
    legacy_output_aliases = INTEGRATION_MESSAGE_ALIASES

    class Meta:
        model = IntegrationMessage
        fields = "__all__"
        read_only_fields = CORE_READ_ONLY_FIELDS


class IntegrationDocumentSerializer(LegacyAliasSerializerMixin, serializers.ModelSerializer):
    file = serializers.FileField(required=False, allow_empty_file=True)
    file_url = serializers.SerializerMethodField()

    legacy_input_aliases = INTEGRATION_DOCUMENT_ALIASES
    legacy_output_aliases = {
        **INTEGRATION_DOCUMENT_ALIASES,
        "url_ficheiro": "file_url",
        "url_arquivo": "file_url",
    }

    class Meta:
        model = IntegrationDocument
        fields = "__all__"
        read_only_fields = [*CORE_READ_ONLY_FIELDS, "file_url"]

    def get_file_url(self, obj) -> str:
        try:
            return obj.file.url if obj.file else ""
        except Exception:
            return ""


class IntegrationAnalyteMappingSerializer(LegacyAliasSerializerMixin, serializers.ModelSerializer):
    legacy_input_aliases = INTEGRATION_ANALYTE_MAPPING_ALIASES
    legacy_output_aliases = INTEGRATION_ANALYTE_MAPPING_ALIASES

    class Meta:
        model = IntegrationAnalyteMapping
        fields = "__all__"
        read_only_fields = CORE_READ_ONLY_FIELDS
        extra_kwargs = {
            "name": {"required": False, "allow_blank": True},
        }

    def validate(self, attrs):
        attrs = super().validate(attrs)
        if not attrs.get("name"):
            code = attrs.get("code") or getattr(getattr(self, "instance", None), "code", "")
            attrs["name"] = f"Mapeamento {code}".strip() if code else "Mapeamento de analito"
        return attrs


SERIALIZER_MAP = {
    "equipment": IntegrationEquipmentSerializer,
    "credential": IntegrationCredentialSerializer,
    "routing": IntegrationRoutingSerializer,
    "order": IntegrationOrderSerializer,
    "order_item": IntegrationOrderItemSerializer,
    "message": IntegrationMessageSerializer,
    "document": IntegrationDocumentSerializer,
    "analyte_mapping": IntegrationAnalyteMappingSerializer,
}
