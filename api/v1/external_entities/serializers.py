from rest_framework import serializers

from apps.external_entities.models.company import Company

CORE_READ_ONLY_FIELDS = [
    "id",
    "id_custom",
    "inquilino",
    "criado_por",
    "atualizado_por",
    "criado_em",
    "atualizado_em",
    "deletado",
    "deletado_em",
    "deletado_por",
    "versao",
]


class EmpresaSerializer(serializers.ModelSerializer):
    class Meta:
        model = Company
        fields = "__all__"
        read_only_fields = CORE_READ_ONLY_FIELDS
        extra_kwargs = {
            "nome": {"required": True},
        }


SERIALIZER_MAP = {
    "empresa": EmpresaSerializer,
}
