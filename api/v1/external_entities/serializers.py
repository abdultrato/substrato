from rest_framework import serializers

from apps.external_entities.models.company import Company

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


class EmpresaSerializer(serializers.ModelSerializer):
    class Meta:
        model = Company
        fields = "__all__"
        read_only_fields = CORE_READ_ONLY_FIELDS
        extra_kwargs = {
            "name": {"required": True},
        }


SERIALIZER_MAP = {
    "empresa": EmpresaSerializer,
}
