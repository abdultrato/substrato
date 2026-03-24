from api.core.filters import SafeFilterSet
from apps.external_entities.models.company import Company


class EmpresaFilter(SafeFilterSet):
    class Meta:
        model = Company
        fields = [
            "inquilino",
            "id_custom",
            "nome",
            "nuit",
            "endereco_sede",
            "contactos",
            "email",
            "telefone1",
            "telefone2",
            "nib",
            "ativo",
            "deletado",
            "criado_em",
            "atualizado_em",
        ]


FILTER_MAP = {
    "empresa": EmpresaFilter,
}
