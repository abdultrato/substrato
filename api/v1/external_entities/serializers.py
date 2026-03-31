from rest_framework import serializers  # Ferramentas DRF

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


class EmpresaSerializer(serializers.ModelSerializer):
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
