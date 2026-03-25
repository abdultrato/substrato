from rest_framework import serializers

from api.v1.compat import LegacyAliasSerializerMixin
from apps.surgery.models.surgery import Surgery
from apps.surgery.models.surgical_procedure import SurgicalProcedure

CORE_READ_ONLY_FIELDS = (
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
)


class SurgerySerializer(LegacyAliasSerializerMixin, serializers.ModelSerializer):
    patient_name = serializers.CharField(source="patient.name", read_only=True)
    surgeon_name = serializers.SerializerMethodField(method_name="get_surgeon_name")
    procedure_names = serializers.SerializerMethodField(method_name="get_procedure_names")
    invoice_id = serializers.SerializerMethodField(method_name="get_invoice_id")
    invoice_code = serializers.SerializerMethodField(method_name="get_invoice_code")
    invoice_status = serializers.SerializerMethodField(method_name="get_invoice_status")
    legacy_output_aliases = {
        "procedures_nomes": "procedure_names",
    }

    class Meta:
        model = Surgery
        fields = "__all__"
        read_only_fields = (
            *CORE_READ_ONLY_FIELDS,
            "patient_name",
            "surgeon_name",
            "procedure_names",
            "invoice_id",
            "invoice_code",
            "invoice_status",
        )

    def get_surgeon_name(self, obj: Surgery) -> str:
        u = getattr(obj, "surgeon", None)
        if not u:
            return ""
        try:
            return (u.get_full_name() or "").strip() or u.username
        except Exception:
            return getattr(u, "username", "")

    def get_procedure_names(self, obj: Surgery) -> list[str]:
        try:
            return list(obj.procedures.values_list("name", flat=True))
        except Exception:
            return []

    def _get_invoice(self, obj: Surgery):
        try:
            return getattr(obj, "invoice", None)
        except Exception:
            return None

    def get_invoice_id(self, obj: Surgery) -> int | None:
        f = self._get_invoice(obj)
        return getattr(f, "id", None) if f else None

    def get_invoice_code(self, obj: Surgery) -> str:
        f = self._get_invoice(obj)
        return getattr(f, "custom_id", "") if f else ""

    def get_invoice_status(self, obj: Surgery) -> str:
        f = self._get_invoice(obj)
        return getattr(f, "status", "") if f else ""


class SurgicalProcedureSerializer(serializers.ModelSerializer):
    class Meta:
        model = SurgicalProcedure
        fields = "__all__"
        read_only_fields = CORE_READ_ONLY_FIELDS


SERIALIZER_MAP = {
    "surgery": SurgerySerializer,
    "procedimentocirurgico": SurgicalProcedureSerializer,
}

