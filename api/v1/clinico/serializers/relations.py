from rest_framework import serializers as s


class RelatedNameField(s.Field):
    """
    Retorna o nome legível de uma relação.
    """

    def to_representation(self, value):
        if value is None:
            return None

        if hasattr(value, "nome"):
            return value.nome

        if hasattr(value, "name"):
            return value.name

        return str(value)
