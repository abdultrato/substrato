from rest_framework import serializers

from api.v1.compat import LegacyAliasSerializerMixin
from apps.dental.models import (
    DentalAppointment,
    DentalOdontogramEntry,
    DentalProcedure,
    DentalProsthesisLabOrder,
    DentalRecord,
    DentalTreatmentPlan,
    DentalTreatmentPlanItem,
)

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
    "codigo": "code",
    "código": "code",
    "nome": "name",
    "estado": "status",
    "situacao": "status",
    "situação": "status",
    "observacoes": "notes",
    "observações": "notes",
    "notas": "notes",
    "paciente": "patient",
    "dentista": "dentist",
    "consulta": "appointment",
}


class DentalProcedureSerializer(LegacyAliasSerializerMixin, serializers.ModelSerializer):
    legacy_input_aliases = {
        **BASE_ALIASES,
        "categoria": "category",
        "preco_base": "base_price",
        "preço_base": "base_price",
        "duracao_padrao_minutos": "default_duration_minutes",
        "duração_padrão_minutos": "default_duration_minutes",
        "requer_laboratorio_protese": "requires_prosthesis_lab",
        "ativo": "active",
    }
    legacy_output_aliases = legacy_input_aliases

    class Meta:
        model = DentalProcedure
        fields = "__all__"
        read_only_fields = CORE_READ_ONLY_FIELDS


class DentalAppointmentSerializer(LegacyAliasSerializerMixin, serializers.ModelSerializer):
    legacy_input_aliases = {
        **BASE_ALIASES,
        "inicio_agendado": "scheduled_start",
        "fim_agendado": "scheduled_end",
        "motivo": "reason",
        "cadeira": "chair",
    }
    legacy_output_aliases = legacy_input_aliases

    patient_name = serializers.CharField(source="patient.name", read_only=True)
    dentist_name = serializers.CharField(source="dentist.name", read_only=True)

    class Meta:
        model = DentalAppointment
        fields = "__all__"
        read_only_fields = (*CORE_READ_ONLY_FIELDS, "patient_name", "dentist_name")


class DentalRecordSerializer(LegacyAliasSerializerMixin, serializers.ModelSerializer):
    legacy_input_aliases = {
        **BASE_ALIASES,
        "prontuario": "record",
        "prontuário": "record",
        "aberto_em": "opened_at",
        "fechado_em": "closed_at",
        "queixa_principal": "chief_complaint",
        "historico_dentario": "dental_history",
        "histórico_dentário": "dental_history",
        "diagnostico": "diagnosis",
        "diagnóstico": "diagnosis",
        "resumo_tratamento": "treatment_summary",
    }
    legacy_output_aliases = legacy_input_aliases

    patient_name = serializers.CharField(source="patient.name", read_only=True)
    dentist_name = serializers.CharField(source="dentist.name", read_only=True)
    odontogram_count = serializers.IntegerField(source="odontogram_entries.count", read_only=True)

    class Meta:
        model = DentalRecord
        fields = "__all__"
        read_only_fields = (*CORE_READ_ONLY_FIELDS, "patient_name", "dentist_name", "odontogram_count")


class DentalOdontogramEntrySerializer(LegacyAliasSerializerMixin, serializers.ModelSerializer):
    legacy_input_aliases = {
        **BASE_ALIASES,
        "prontuario": "record",
        "prontuário": "record",
        "dente": "tooth_number",
        "face": "surface",
        "condicao": "condition",
        "condição": "condition",
        "procedimento": "procedure",
    }
    legacy_output_aliases = legacy_input_aliases

    patient_name = serializers.CharField(source="record.patient.name", read_only=True)
    procedure_name = serializers.CharField(source="procedure.name", read_only=True)

    class Meta:
        model = DentalOdontogramEntry
        fields = "__all__"
        read_only_fields = (*CORE_READ_ONLY_FIELDS, "patient_name", "procedure_name")


class DentalTreatmentPlanSerializer(LegacyAliasSerializerMixin, serializers.ModelSerializer):
    legacy_input_aliases = {
        **BASE_ALIASES,
        "prontuario": "record",
        "prontuário": "record",
        "titulo": "title",
        "título": "title",
        "objetivos": "objectives",
        "inicio_previsto": "planned_start",
        "início_previsto": "planned_start",
        "fim_previsto": "planned_end",
        "aprovado_em": "approved_at",
        "total_estimado": "estimated_total",
    }
    legacy_output_aliases = legacy_input_aliases

    patient_name = serializers.CharField(source="patient.name", read_only=True)
    dentist_name = serializers.CharField(source="dentist.name", read_only=True)
    item_count = serializers.IntegerField(source="items.count", read_only=True)

    class Meta:
        model = DentalTreatmentPlan
        fields = "__all__"
        read_only_fields = (*CORE_READ_ONLY_FIELDS, "patient_name", "dentist_name", "item_count")


class DentalTreatmentPlanItemSerializer(LegacyAliasSerializerMixin, serializers.ModelSerializer):
    legacy_input_aliases = {
        **BASE_ALIASES,
        "plano_tratamento": "treatment_plan",
        "procedimento": "procedure",
        "consulta": "appointment",
        "dente": "tooth_number",
        "face": "surface",
        "data_prevista": "scheduled_date",
        "concluido_em": "completed_at",
        "concluído_em": "completed_at",
        "quantidade": "quantity",
        "preco_unitario": "unit_price",
        "preço_unitário": "unit_price",
        "requer_laboratorio": "lab_required",
        "notas_clinicas": "clinical_notes",
        "posição": "position",
        "posicao": "position",
    }
    legacy_output_aliases = legacy_input_aliases

    procedure_name = serializers.CharField(source="procedure.name", read_only=True)
    patient_name = serializers.CharField(source="treatment_plan.patient.name", read_only=True)
    total_price = serializers.DecimalField(max_digits=12, decimal_places=2, read_only=True)

    class Meta:
        model = DentalTreatmentPlanItem
        fields = "__all__"
        read_only_fields = (*CORE_READ_ONLY_FIELDS, "procedure_name", "patient_name", "total_price")


class DentalProsthesisLabOrderSerializer(LegacyAliasSerializerMixin, serializers.ModelSerializer):
    legacy_input_aliases = {
        **BASE_ALIASES,
        "item_tratamento": "treatment_item",
        "laboratorio": "lab_company",
        "laboratório": "lab_company",
        "numero_ordem": "order_number",
        "número_ordem": "order_number",
        "tipo_protese": "prosthesis_type",
        "tipo_prótese": "prosthesis_type",
        "dentes": "tooth_numbers",
        "cor": "shade",
        "material": "material",
        "data_moldagem": "impression_date",
        "enviado_em": "sent_at",
        "previsao_entrega": "due_date",
        "previsão_entrega": "due_date",
        "recebido_em": "received_at",
        "entregue_em": "delivered_at",
        "notas_laboratorio": "lab_notes",
        "custo": "cost",
    }
    legacy_output_aliases = legacy_input_aliases

    patient_name = serializers.CharField(source="patient.name", read_only=True)
    dentist_name = serializers.CharField(source="dentist.name", read_only=True)
    lab_company_name = serializers.CharField(source="lab_company.name", read_only=True)

    class Meta:
        model = DentalProsthesisLabOrder
        fields = "__all__"
        read_only_fields = (*CORE_READ_ONLY_FIELDS, "patient_name", "dentist_name", "lab_company_name")


SERIALIZER_MAP = {
    "procedure": DentalProcedureSerializer,
    "appointment": DentalAppointmentSerializer,
    "record": DentalRecordSerializer,
    "odontogram": DentalOdontogramEntrySerializer,
    "treatment_plan": DentalTreatmentPlanSerializer,
    "treatment_item": DentalTreatmentPlanItemSerializer,
    "prosthesis_lab_order": DentalProsthesisLabOrderSerializer,
}
