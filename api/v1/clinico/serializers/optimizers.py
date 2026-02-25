from rest_framework.serializers import ListSerializer as ls, ModelSerializer as ms


class DynamicFieldsModelSerializer(ms):
    """
    Permite selecionar campos dinamicamente:

    /api/pacientes/?fields=id,nome
    """

    def __init__(self, *args, **kwargs):
        fields = kwargs.pop("fields", None)
        super().__init__(*args, **kwargs)

        if fields:
            allowed = set(fields)
            existing = set(self.fields)

            for field_name in existing - allowed:
                self.fields.pop(field_name)


class OptimizedListSerializer(ls):
    """
    Serializer otimizado para grandes listas.
    """

    def to_representation(self, data):
        iterable = data.all() if hasattr(data, "all") else data
        return [self.child.to_representation(item) for item in iterable]
