"""Serializers DRF para cirurgias e procedimentos cirúrgicos."""

from rest_framework import serializers

from api.v1.compat import LegacyAliasSerializerMixin
from apps.surgery.models.surgery import LargeSurgery, SmallSurgery, Surgery
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


BASE_ALIASES = {
    "id_custom": "custom_id",
    "codigo": "custom_id",
    "código": "custom_id",
    "nome": "name",
    "descricao": "description",
    "descrição": "description",
    "estado": "status",
    "situacao": "status",
    "situação": "status",
    "ativo": "active",
    "activa": "active",
    "ativa": "active",
    "preco": "base_price",
    "preço": "base_price",
    "preco_base": "base_price",
    "preço_base": "base_price",
    "iva": "vat_percentage",
    "percentagem_iva": "vat_percentage",
    "aplica_iva": "applies_vat_by_default",
    "aplicar_iva": "applies_vat_by_default",
    "aplica_iva_por_padrao": "applies_vat_by_default",
    "aplica_iva_por_padrão": "applies_vat_by_default",
}

SURGICAL_PROCEDURE_ALIASES = {
    **BASE_ALIASES,
    "procedimento": "name",
    "procedimento_cirurgico": "name",
    "procedimento_cirúrgico": "name",
    "surgical_procedure": "name",
    "procedure": "name",
}

SURGERY_ALIASES = {
    **BASE_ALIASES,
    "paciente": "patient",
    "utente": "patient",
    "doente": "patient",
    "patient": "patient",
    "cirurgiao": "surgeon",
    "cirurgião": "surgeon",
    "medico": "surgeon",
    "médico": "surgeon",
    "doutor": "surgeon",
    "surgeon": "surgeon",
    "procedimento": "procedure",
    "procedimento_livre": "procedure",
    "procedimento_texto": "procedure",
    "procedimento_texto_livre": "procedure",
    "procedures": "procedures",
    "procedimentos": "procedures",
    "procedimentos_cirurgicos": "procedures",
    "procedimentos_cirúrgicos": "procedures",
    "catalogo_procedimentos": "procedures",
    "catálogo_procedimentos": "procedures",
    "preco": "estimated_price",
    "preço": "estimated_price",
    "preco_estimado": "estimated_price",
    "preço_estimado": "estimated_price",
    "valor": "estimated_price",
    "valor_estimado": "estimated_price",
    "custo_estimado": "estimated_price",
    "estimated_price": "estimated_price",
    "data_cirurgia": "scheduled_for",
    "agendada_para": "scheduled_for",
    "marcada_para": "scheduled_for",
    "scheduled_for": "scheduled_for",
    "porte": "surgery_size",
    "porte_cirurgia": "surgery_size",
    "tipo_cirurgia": "surgery_size",
    "tamanho": "surgery_size",
    "surgery_size": "surgery_size",
    "concluida_em": "completed_at",
    "concluída_em": "completed_at",
    "completed_at": "completed_at",
    "cancelada_em": "canceled_at",
    "cancelado_em": "canceled_at",
    "canceled_at": "canceled_at",
}


class BaseSurgerySerializer(LegacyAliasSerializerMixin, serializers.ModelSerializer):
    legacy_input_aliases = SURGERY_ALIASES
    patient_name = serializers.CharField(source="patient.name", read_only=True)
    surgeon_name = serializers.SerializerMethodField(method_name="get_surgeon_name")
    procedure_names = serializers.SerializerMethodField(method_name="get_procedure_names")
    invoice_id = serializers.SerializerMethodField(method_name="get_invoice_id")
    invoice_code = serializers.SerializerMethodField(method_name="get_invoice_code")
    invoice_status = serializers.SerializerMethodField(method_name="get_invoice_status")
    legacy_output_aliases = {
        **SURGERY_ALIASES,
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

    def validate(self, attrs):
        attrs = super().validate(attrs)
        procedures = attrs.get("procedures") or []
        procedure_text = str(attrs.get("procedure") or "").strip()

        if procedures and not procedure_text:
            names = [str(getattr(item, "name", "") or item).strip() for item in procedures]
            attrs["procedure"] = ", ".join(name for name in names if name)[:160]

        if self.instance is None and not str(attrs.get("procedure") or "").strip() and not procedures:
            raise serializers.ValidationError(
                {"procedure": "Informe o procedimento em texto livre ou seleccione um procedimento do catálogo."}
            )
        return attrs

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


class SurgicalProcedureSerializer(LegacyAliasSerializerMixin, serializers.ModelSerializer):
    legacy_input_aliases = SURGICAL_PROCEDURE_ALIASES
    legacy_output_aliases = SURGICAL_PROCEDURE_ALIASES

    class Meta:
        model = SurgicalProcedure
        fields = "__all__"
        read_only_fields = CORE_READ_ONLY_FIELDS


class SurgerySerializer(BaseSurgerySerializer):
    class Meta(BaseSurgerySerializer.Meta):
        model = Surgery


class SmallSurgerySerializer(BaseSurgerySerializer):
    class Meta(BaseSurgerySerializer.Meta):
        model = SmallSurgery


class LargeSurgerySerializer(BaseSurgerySerializer):
    class Meta(BaseSurgerySerializer.Meta):
        model = LargeSurgery


SERIALIZER_MAP = {
    "surgery": SurgerySerializer,
    "small_surgery": SmallSurgerySerializer,
    "large_surgery": LargeSurgerySerializer,
    "surgical_procedure": SurgicalProcedureSerializer,
}

