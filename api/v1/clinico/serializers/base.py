from rest_framework.serializers import ModelSerializer as ms


class BaseSerializer(ms):
    """
    Serializer base.

    ✔ remove campos vazios
    ✔ normaliza strings
    ✔ padroniza saída
    """

    def to_representation(self, instance):
        data = super().to_representation(instance)
        return {k: v for k, v in data.items() if v not in ("", None)}

    def validate(self, attrs):
        for field, value in attrs.items():
            if isinstance(value, str):
                attrs[field] = value.strip()
        return attrs
