"""Serializers DRF para cirurgias, bloco operatório e procedimentos cirúrgicos."""

from rest_framework import serializers

from api.v1.compat import LegacyAliasSerializerMixin
from apps.surgery.models import (
    AnesthesiaRecord,
    LargeSurgery,
    OperatingRoom,
    OperativeReport,
    RecoveryRecord,
    SmallSurgery,
    Surgery,
    SurgicalConsumption,
    SurgicalMaterial,
    SurgicalProcedure,
    SurgicalSafetyChecklist,
    SurgicalSchedule,
    SurgicalTeamMember,
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
    "observacoes": "notes",
    "observações": "notes",
    "notas": "notes",
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


class OperatingRoomSerializer(LegacyAliasSerializerMixin, serializers.ModelSerializer):
    legacy_input_aliases = {
        **BASE_ALIASES,
        "tipo_sala": "room_type",
        "localizacao": "location",
        "localização": "location",
        "capacidade": "capacity",
        "esterilizada": "sterile",
        "equipamentos": "equipment_notes",
    }
    legacy_output_aliases = legacy_input_aliases

    class Meta:
        model = OperatingRoom
        fields = "__all__"
        read_only_fields = CORE_READ_ONLY_FIELDS


class SurgicalScheduleSerializer(LegacyAliasSerializerMixin, serializers.ModelSerializer):
    surgery_code = serializers.CharField(source="surgery.custom_id", read_only=True)
    patient_name = serializers.CharField(source="surgery.patient.name", read_only=True)
    operating_room_name = serializers.CharField(source="operating_room.name", read_only=True)
    legacy_input_aliases = {
        **BASE_ALIASES,
        "cirurgia": "surgery",
        "centro_cirurgico": "operating_room",
        "centro_cirúrgico": "operating_room",
        "sala": "operating_room",
        "inicio_previsto": "scheduled_start",
        "início_previsto": "scheduled_start",
        "fim_previsto": "scheduled_end",
        "prioridade": "priority",
        "motivo_cancelamento": "cancellation_reason",
    }
    legacy_output_aliases = legacy_input_aliases

    class Meta:
        model = SurgicalSchedule
        fields = "__all__"
        read_only_fields = (*CORE_READ_ONLY_FIELDS, "surgery_code", "patient_name", "operating_room_name")


class SurgicalTeamMemberSerializer(LegacyAliasSerializerMixin, serializers.ModelSerializer):
    surgery_code = serializers.CharField(source="surgery.custom_id", read_only=True)
    employee_name = serializers.CharField(source="employee.name", read_only=True)
    legacy_input_aliases = {
        **BASE_ALIASES,
        "cirurgia": "surgery",
        "funcionario": "employee",
        "funcionário": "employee",
        "profissional": "employee",
        "funcao": "role",
        "função": "role",
        "principal": "lead",
        "presente": "present",
    }
    legacy_output_aliases = legacy_input_aliases

    class Meta:
        model = SurgicalTeamMember
        fields = "__all__"
        read_only_fields = (*CORE_READ_ONLY_FIELDS, "surgery_code", "employee_name")


class AnesthesiaRecordSerializer(LegacyAliasSerializerMixin, serializers.ModelSerializer):
    surgery_code = serializers.CharField(source="surgery.custom_id", read_only=True)
    anesthetist_name = serializers.CharField(source="anesthetist.name", read_only=True)
    legacy_input_aliases = {
        **BASE_ALIASES,
        "cirurgia": "surgery",
        "anestesista": "anesthetist",
        "tipo_anestesia": "anesthesia_type",
        "classe_asa": "asa_class",
        "iniciada_em": "started_at",
        "terminada_em": "ended_at",
        "via_aerea": "airway_management",
        "via_aérea": "airway_management",
        "farmacos": "medications",
        "fármacos": "medications",
        "fluidos": "fluids",
        "complicacoes": "complications",
        "complicações": "complications",
    }
    legacy_output_aliases = legacy_input_aliases

    class Meta:
        model = AnesthesiaRecord
        fields = "__all__"
        read_only_fields = (*CORE_READ_ONLY_FIELDS, "surgery_code", "anesthetist_name")


class SurgicalSafetyChecklistSerializer(LegacyAliasSerializerMixin, serializers.ModelSerializer):
    surgery_code = serializers.CharField(source="surgery.custom_id", read_only=True)
    completed_by_name = serializers.CharField(source="completed_by.name", read_only=True)
    is_complete = serializers.BooleanField(read_only=True)
    legacy_input_aliases = {
        **BASE_ALIASES,
        "cirurgia": "surgery",
        "preenchido_por": "completed_by",
        "fase": "phase",
        "identidade_confirmada": "patient_identity_confirmed",
        "procedimento_confirmado": "procedure_confirmed",
        "local_marcado": "site_marked",
        "consentimento_confirmado": "consent_confirmed",
        "seguranca_anestesica": "anesthesia_safety_checked",
        "segurança_anestésica": "anesthesia_safety_checked",
        "profilaxia_antibiotica": "antibiotic_prophylaxis",
        "contagem_instrumentos": "instrument_count_confirmed",
        "amostras_identificadas": "specimens_labeled",
        "concluido_em": "completed_at",
        "concluído_em": "completed_at",
    }
    legacy_output_aliases = legacy_input_aliases

    class Meta:
        model = SurgicalSafetyChecklist
        fields = "__all__"
        read_only_fields = (*CORE_READ_ONLY_FIELDS, "surgery_code", "completed_by_name", "is_complete")


class SurgicalMaterialSerializer(LegacyAliasSerializerMixin, serializers.ModelSerializer):
    product_name = serializers.CharField(source="product.name", read_only=True)
    legacy_input_aliases = {
        **BASE_ALIASES,
        "produto": "product",
        "tipo_material": "material_type",
        "unidade": "unit",
        "reutilizavel": "reusable",
        "reutilizável": "reusable",
        "esteril": "sterile",
        "estéril": "sterile",
    }
    legacy_output_aliases = legacy_input_aliases

    class Meta:
        model = SurgicalMaterial
        fields = "__all__"
        read_only_fields = (*CORE_READ_ONLY_FIELDS, "product_name")


class SurgicalConsumptionSerializer(LegacyAliasSerializerMixin, serializers.ModelSerializer):
    surgery_code = serializers.CharField(source="surgery.custom_id", read_only=True)
    material_name = serializers.CharField(source="material.name", read_only=True)
    product_name = serializers.CharField(source="product.name", read_only=True)
    consumed_by_name = serializers.CharField(source="consumed_by.name", read_only=True)
    total_cost = serializers.DecimalField(max_digits=14, decimal_places=2, read_only=True)
    legacy_input_aliases = {
        **BASE_ALIASES,
        "cirurgia": "surgery",
        "material": "material",
        "produto": "product",
        "consumido_por": "consumed_by",
        "quantidade": "quantity",
        "custo_unitario": "unit_cost",
        "custo_unitário": "unit_cost",
        "consumido_em": "consumed_at",
        "lote": "batch_number",
    }
    legacy_output_aliases = legacy_input_aliases

    class Meta:
        model = SurgicalConsumption
        fields = "__all__"
        read_only_fields = (*CORE_READ_ONLY_FIELDS, "surgery_code", "material_name", "product_name", "consumed_by_name", "total_cost")


class RecoveryRecordSerializer(LegacyAliasSerializerMixin, serializers.ModelSerializer):
    surgery_code = serializers.CharField(source="surgery.custom_id", read_only=True)
    nurse_name = serializers.CharField(source="nurse.name", read_only=True)
    legacy_input_aliases = {
        **BASE_ALIASES,
        "cirurgia": "surgery",
        "enfermeiro": "nurse",
        "admitido_em": "admitted_at",
        "alta_em": "discharged_at",
        "dor": "pain_score",
        "aldrete": "aldrete_score",
        "sinais_vitais": "vital_signs",
        "complicacoes": "complications",
        "complicações": "complications",
        "destino": "destination",
    }
    legacy_output_aliases = legacy_input_aliases

    class Meta:
        model = RecoveryRecord
        fields = "__all__"
        read_only_fields = (*CORE_READ_ONLY_FIELDS, "surgery_code", "nurse_name")


class OperativeReportSerializer(LegacyAliasSerializerMixin, serializers.ModelSerializer):
    surgery_code = serializers.CharField(source="surgery.custom_id", read_only=True)
    patient_name = serializers.CharField(source="surgery.patient.name", read_only=True)
    primary_surgeon_name = serializers.CharField(source="primary_surgeon.name", read_only=True)
    legacy_input_aliases = {
        **BASE_ALIASES,
        "cirurgia": "surgery",
        "cirurgiao_principal": "primary_surgeon",
        "cirurgião_principal": "primary_surgeon",
        "diagnostico_pre_operatorio": "preoperative_diagnosis",
        "diagnóstico_pré_operatório": "preoperative_diagnosis",
        "diagnostico_pos_operatorio": "postoperative_diagnosis",
        "diagnóstico_pós_operatório": "postoperative_diagnosis",
        "procedimento_realizado": "procedure_performed",
        "achados": "findings",
        "tecnica": "technique",
        "técnica": "technique",
        "complicacoes": "complications",
        "complicações": "complications",
        "perda_sanguinea_ml": "estimated_blood_loss_ml",
        "amostra_patologia": "specimen_sent_to_pathology",
        "numero_patologia": "pathology_accession_number",
        "iniciada_em": "started_at",
        "terminada_em": "ended_at",
        "assinado_em": "signed_at",
    }
    legacy_output_aliases = legacy_input_aliases

    class Meta:
        model = OperativeReport
        fields = "__all__"
        read_only_fields = (*CORE_READ_ONLY_FIELDS, "surgery_code", "patient_name", "primary_surgeon_name")


SERIALIZER_MAP = {
    "surgery": SurgerySerializer,
    "small_surgery": SmallSurgerySerializer,
    "large_surgery": LargeSurgerySerializer,
    "surgical_procedure": SurgicalProcedureSerializer,
    "agenda_cirurgica": SurgicalScheduleSerializer,
    "centro_cirurgico": OperatingRoomSerializer,
    "equipa_cirurgica": SurgicalTeamMemberSerializer,
    "anestesia": AnesthesiaRecordSerializer,
    "checklist_seguranca": SurgicalSafetyChecklistSerializer,
    "materiais": SurgicalMaterialSerializer,
    "consumos": SurgicalConsumptionSerializer,
    "recuperacao": RecoveryRecordSerializer,
    "relatorio_operatorio": OperativeReportSerializer,
}
