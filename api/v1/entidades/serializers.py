from rest_framework import serializers

from aplicativos.entidades.modelos.empresa import Empresa

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
        model = Empresa
        fields = "__all__"
        read_only_fields = CORE_READ_ONLY_FIELDS
        extra_kwargs = {
            "nome": {"required": True},
        }


SERIALIZER_MAP = {
    "empresa": EmpresaSerializer,
}
