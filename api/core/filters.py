import django_filters

from api.v1.compat import normalize_legacy_input


class SafeFilterSet(django_filters.FilterSet):
    """
    FilterSet que ignora campos inexistentes definidos em _meta.fields.
    """

    legacy_filter_aliases: dict[str, str] = {}

    def __init__(self, data=None, *args, **kwargs):
        normalized_data = normalize_legacy_input(data, self.legacy_filter_aliases)
        super().__init__(normalized_data, *args, **kwargs)

    @classmethod
    def get_filters(cls):
        # Se for a classe base (sem model definido)
        if not hasattr(cls, "_meta") or not getattr(cls._meta, "model", None):
            return super().get_filters()

        model = cls._meta.model
        declared_fields = cls._meta.fields

        # Se usar "__all__", delega ao comportamento padrão
        if declared_fields == "__all__":
            return super().get_filters()

        # Campos reais do model
        model_fields = {f.name for f in model._meta.get_fields()}

        # Filtra campos válidos
        valid_fields = [field for field in declared_fields if field in model_fields]

        # NÃO modificar _meta.fields permanentemente
        original_fields = cls._meta.fields
        cls._meta.fields = valid_fields

        filters = super().get_filters()

        # Restaurar status original
        cls._meta.fields = original_fields

        return filters
