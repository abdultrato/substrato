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
    "empresa": "name",
    "entidade": "name",
    "endereco_sede": "headquarters_address",
    "endereço_sede": "headquarters_address",
    "morada_sede": "headquarters_address",
    "sede": "headquarters_address",
    "morada": "headquarters_address",
    "endereco": "headquarters_address",
    "endereço": "headquarters_address",
    "contactos": "contacts",
    "contatos": "contacts",
    "contacto": "contacts",
    "contato": "contacts",
    "pessoa_contacto": "contacts",
    "pessoa_contato": "contacts",
    "responsavel": "contacts",
    "responsável": "contacts",
    "telefone": "phone1",
    "telefone1": "phone1",
    "telefone_1": "phone1",
    "telefone_principal": "phone1",
    "telefone principal": "phone1",
    "phone": "phone1",
    "telefone2": "phone2",
    "telefone_2": "phone2",
    "telefone_alternativo": "phone2",
    "telefone alternativo": "phone2",
    "observacoes": "notes",
    "observações": "notes",
    "notas": "notes",
    "ativo": "active",
    "activa": "active",
    "estado": "active",
    # English variants expected by some typed clients.
    "phone_1": "phone1",
    "phone_2": "phone2",
    "tax_id": "nuit",
    "numero_fiscal": "nuit",
    "número_fiscal": "nuit",
    "identificacao_fiscal": "nuit",
    "identificação_fiscal": "nuit",
    "conta_bancaria": "nib",
    "conta_bancária": "nib",
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
