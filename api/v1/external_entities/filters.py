from api.core.filters import SafeFilterSet  # Base com saneamento de entradas
from apps.external_entities.models.company import Company  # Modelo alvo


class EmpresaFilter(SafeFilterSet):
    class Meta:
        model = Company  # Dataset filtrado
        fields = [  # Campos expostos para filtros GET
            "tenant",
            "custom_id",
            "name",
            "nuit",
            "headquarters_address",
            "contacts",
            "email",
            "phone1",
            "phone2",
            "nib",
            "active",
            "deleted",
            "created_at",
            "updated_at",
        ]


FILTER_MAP = {
    "empresa": EmpresaFilter,  # Mapeia alias -> filtro
}
