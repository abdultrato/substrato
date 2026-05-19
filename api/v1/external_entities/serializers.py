from rest_framework import serializers  # Ferramentas DRF

from api.v1.compat import LegacyAliasSerializerMixin
from apps.external_entities.models.company import Company  # Modelo alvo

CORE_READ_ONLY_FIELDS = [  # Campos protegidos contra escrita via API
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


COMPANY_LEGACY_ALIASES = {
    "id_custom": "custom_id",
    "nome": "name",
    "endereco_sede": "headquarters_address",
    "contactos": "contacts",
    "telefone1": "phone1",
    "telefone2": "phone2",
    "observacoes": "notes",
    "ativo": "active",
    # English variants expected by some typed clients.
    "phone_1": "phone1",
    "phone_2": "phone2",
    "tax_id": "nuit",
    "bank_account": "nib",
}


class EmpresaSerializer(LegacyAliasSerializerMixin, serializers.ModelSerializer):
    legacy_input_aliases = COMPANY_LEGACY_ALIASES
    legacy_output_aliases = COMPANY_LEGACY_ALIASES

    class Meta:
        model = Company  # Modelo de origem
        fields = "__all__"  # Expõe todos os campos
        read_only_fields = CORE_READ_ONLY_FIELDS  # Protege campos de auditoria
        extra_kwargs = {
            "name": {"required": True},  # Nome é obrigatório na criação
        }


SERIALIZER_MAP = {
    "empresa": EmpresaSerializer,  # Alias usado no roteamento dinâmico
}
