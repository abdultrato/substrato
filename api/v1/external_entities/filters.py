from api.core.filters import SafeFilterSet
from apps.external_entities.models.company import Company


class EmpresaFilter(SafeFilterSet):
    class Meta:
        model = Company
        fields = [
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
    "empresa": EmpresaFilter,
}
