"""Serializers DRF para cirurgias, bloco operatório e procedimentos cirúrgicos."""

from django.apps import apps
from rest_framework import serializers

from api.v1.compat import LegacyAliasSerializerMixin
from apps.surgery.models import (
    AnesthesiaRecord,
    LargeSurgery,
    OperatingRoom,
    OperativeReport,
    PreoperativeAssessment,
    RecoveryRecord,
    SmallSurgery,
    Surgery,
    SurgeryProcedureItem,
    SurgicalAuditEvent,
    SurgicalAuthorization,
    SurgicalBillingItem,
    SurgicalConsumption,
    SurgicalDocument,
    SurgicalMaterial,
    SurgicalProcedure,
    SurgicalRequest,
    SurgicalSafetyChecklist,
    SurgicalSchedule,
    SurgicalSpecimen,
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
    "pedido_cirurgico": "surgical_request",
    "indicacao_cirurgica": "surgical_request",
    "indicação_cirúrgica": "surgical_request",
    "especialidade": "specialty",
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
    "sala_operatoria": "operating_room",
    "sala_operatória": "operating_room",
    "sala": "operating_room",
    "diagnostico_pre_operatorio": "preoperative_diagnosis",
    "diagnóstico_pré_operatório": "preoperative_diagnosis",
    "diagnostico_pos_operatorio": "postoperative_diagnosis",
    "diagnóstico_pós_operatório": "postoperative_diagnosis",
    "porte": "surgery_size",
    "porte_cirurgia": "surgery_size",
    "tipo_cirurgia": "surgery_size",
    "tamanho": "surgery_size",
    "surgery_size": "surgery_size",
    "prioridade": "priority",
    "classificacao": "classification",
    "classificação": "classification",
    "iniciada_em": "started_at",
    "terminada_em": "ended_at",
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
    surgical_request_code = serializers.CharField(source="surgical_request.custom_id", read_only=True)
    specialty_name = serializers.CharField(source="specialty.name", read_only=True)
    surgeon_name = serializers.SerializerMethodField(method_name="get_surgeon_name")
    surgeon_names = serializers.SerializerMethodField(method_name="get_surgeon_names")
    # M2M — use global queryset so cross-tenant users (HR doctors) are accepted
    surgeons = serializers.PrimaryKeyRelatedField(
        many=True,
        queryset=apps.get_model("recursos_humanos", "Employee")._default_manager.all(),
        required=False,
    )
    operating_room_name = serializers.CharField(source="operating_room.name", read_only=True)
    ward_name = serializers.CharField(source="ward.name", read_only=True)
    preoperative_diagnosis = serializers.CharField(allow_blank=True, allow_null=True, required=False, default="")
    postoperative_diagnosis = serializers.CharField(allow_blank=True, allow_null=True, required=False, default="")
    procedure_names = serializers.SerializerMethodField(method_name="get_procedure_names")
    procedures_price_total = serializers.SerializerMethodField(method_name="get_procedures_price_total")
    procedures_vat_percentage = serializers.SerializerMethodField(method_name="get_procedures_vat_percentage")
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
            "surgical_request_code",
            "specialty_name",
            "surgeon_name",
            "surgeon_names",
            "operating_room_name",
            "ward_name",
            "procedure_names",
            "procedures_price_total",
            "procedures_vat_percentage",
            "invoice_id",
            "invoice_code",
            "invoice_status",
        )

    def validate(self, attrs):
        attrs = super().validate(attrs)
        # coerce null diag fields to empty string
        for f in ("preoperative_diagnosis", "postoperative_diagnosis"):
            if attrs.get(f) is None:
                attrs[f] = ""
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

    def get_surgeon_names(self, obj: Surgery) -> list[dict]:
        try:
            return [{"id": e.id, "name": e.name} for e in obj.surgeons.all()]
        except Exception:
            return []

    def get_procedure_names(self, obj: Surgery) -> list[str]:
        try:
            return list(obj.procedures.values_list("name", flat=True))
        except Exception:
            return []

    def get_procedures_price_total(self, obj: Surgery) -> str:
        try:
            from decimal import Decimal
            total = sum(
                (p.base_price or Decimal("0")) for p in obj.procedures.all()
            )
            return str(total)
        except Exception:
            return "0.00"

    def get_procedures_vat_percentage(self, obj: Surgery) -> str:
        try:
            procs = list(obj.procedures.values_list("vat_percentage", flat=True))
            if procs:
                # Use the most common VAT, falling back to first
                return str(procs[0])
            return "0.00"
        except Exception:
            return "0.00"

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


class SurgicalRequestSerializer(LegacyAliasSerializerMixin, serializers.ModelSerializer):
    patient_name = serializers.CharField(source="patient.name", read_only=True)
    requesting_doctor_name = serializers.CharField(source="requesting_doctor.name", read_only=True)
    specialty_name = serializers.CharField(source="specialty.name", read_only=True)
    legacy_input_aliases = {
        **BASE_ALIASES,
        "paciente": "patient",
        "medico_solicitante": "requesting_doctor",
        "médico_solicitante": "requesting_doctor",
        "especialidade": "specialty",
        "diagnostico_clinico": "clinical_diagnosis",
        "diagnóstico_clínico": "clinical_diagnosis",
        "cid": "icd_code",
        "icd": "icd_code",
        "tipo_cirurgia_solicitada": "requested_surgery_type",
        "procedimento_solicitado": "requested_procedure",
        "prioridade": "priority",
        "justificacao": "justification",
        "justificação": "justification",
        "revisto_em": "reviewed_at",
        "convertido_em": "converted_at",
    }
    legacy_output_aliases = legacy_input_aliases

    class Meta:
        model = SurgicalRequest
        fields = "__all__"
        read_only_fields = (*CORE_READ_ONLY_FIELDS, "patient_name", "requesting_doctor_name", "specialty_name")


class PreoperativeAssessmentSerializer(LegacyAliasSerializerMixin, serializers.ModelSerializer):
    patient_name = serializers.CharField(source="patient.name", read_only=True)
    surgical_request_code = serializers.CharField(source="surgical_request.custom_id", read_only=True)
    proposed_surgery_code = serializers.CharField(source="proposed_surgery.custom_id", read_only=True)
    evaluator_name = serializers.CharField(source="evaluator.name", read_only=True)
    legacy_input_aliases = {
        **BASE_ALIASES,
        "paciente": "patient",
        "pedido_cirurgico": "surgical_request",
        "pedido_cirúrgico": "surgical_request",
        "cirurgia_proposta": "proposed_surgery",
        "avaliador": "evaluator",
        "avaliacao_medica": "medical_evaluation",
        "avaliação_médica": "medical_evaluation",
        "avaliacao_anestesica": "anesthetic_evaluation",
        "avaliação_anestésica": "anesthetic_evaluation",
        "classe_asa": "asa_class",
        "risco_cirurgico": "surgical_risk",
        "risco_cirúrgico": "surgical_risk",
        "exames_necessarios": "required_exams",
        "exames_necessários": "required_exams",
        "exames_revistos": "exam_results_reviewed",
        "apto_para_cirurgia": "fit_for_surgery",
        "consentimento_assinado": "consent_signed",
        "avaliado_em": "assessed_at",
        "observacoes": "observations",
        "observações": "observations",
    }
    legacy_output_aliases = legacy_input_aliases

    class Meta:
        model = PreoperativeAssessment
        fields = "__all__"
        read_only_fields = (
            *CORE_READ_ONLY_FIELDS,
            "patient_name",
            "surgical_request_code",
            "proposed_surgery_code",
            "evaluator_name",
        )


class OperatingRoomSerializer(LegacyAliasSerializerMixin, serializers.ModelSerializer):
    legacy_input_aliases = {
        **BASE_ALIASES,
        "tipo_sala": "room_type",
        "localizacao": "location",
        "localização": "location",
        "capacidade": "capacity",
        "esterilizada": "sterile",
        "equipamentos": "equipment_notes",
        "horario_funcionamento": "working_hours",
        "horário_funcionamento": "working_hours",
        "classe_limpeza": "cleaning_class",
        "motivo_bloqueio": "blocked_reason",
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
    primary_surgeon_name = serializers.CharField(source="primary_surgeon.name", read_only=True)
    anesthetist_name = serializers.CharField(source="anesthetist.name", read_only=True)
    legacy_input_aliases = {
        **BASE_ALIASES,
        "cirurgia": "surgery",
        "centro_cirurgico": "operating_room",
        "centro_cirúrgico": "operating_room",
        "sala": "operating_room",
        "cirurgiao_principal": "primary_surgeon",
        "cirurgião_principal": "primary_surgeon",
        "anestesista": "anesthetist",
        "inicio_previsto": "scheduled_start",
        "início_previsto": "scheduled_start",
        "fim_previsto": "scheduled_end",
        "prioridade": "priority",
        "autorizacao_verificada": "authorization_verified",
        "autorização_verificada": "authorization_verified",
        "checkin_paciente_em": "patient_checked_in_at",
        "motivo_cancelamento": "cancellation_reason",
    }
    legacy_output_aliases = legacy_input_aliases

    class Meta:
        model = SurgicalSchedule
        fields = "__all__"
        read_only_fields = (
            *CORE_READ_ONLY_FIELDS,
            "surgery_code",
            "patient_name",
            "operating_room_name",
            "primary_surgeon_name",
            "anesthetist_name",
        )


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
        "entrada_em": "entry_at",
        "saida_em": "exit_at",
        "saída_em": "exit_at",
        "responsabilidade": "responsibility",
        "assinado_em": "signed_at",
        "referencia_assinatura": "signature_reference",
        "referência_assinatura": "signature_reference",
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
        "inducao_em": "induction_at",
        "indução_em": "induction_at",
        "iniciada_em": "started_at",
        "terminada_em": "ended_at",
        "via_aerea": "airway_management",
        "via_aérea": "airway_management",
        "farmacos": "medications",
        "fármacos": "medications",
        "fluidos": "fluids",
        "sinais_vitais": "vital_signs",
        "eventos_adversos": "adverse_events",
        "passagem_recuperacao": "recovery_handoff",
        "passagem_recuperação": "recovery_handoff",
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
        "estado": "status",
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
        "motivo_sobrescrita": "override_reason",
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
        "codigo_interno": "internal_code",
        "código_interno": "internal_code",
        "preco_custo": "cost_price",
        "preço_custo": "cost_price",
        "preco_venda": "sale_price",
        "preço_venda": "sale_price",
        "lote": "batch_number",
        "validade": "expiry_date",
        "implantavel": "implantable",
        "implantável": "implantable",
        "esterilizavel": "sterilizable",
        "esterilizável": "sterilizable",
        "controla_lote": "tracks_lot",
        "controla_validade": "tracks_expiry",
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
    line_total = serializers.DecimalField(max_digits=14, decimal_places=2, read_only=True)
    legacy_input_aliases = {
        **BASE_ALIASES,
        "cirurgia": "surgery",
        "material": "material",
        "produto": "product",
        "consumido_por": "consumed_by",
        "quantidade": "quantity",
        "custo_unitario": "unit_cost",
        "custo_unitário": "unit_cost",
        "preco_cobrado": "charged_price",
        "preço_cobrado": "charged_price",
        "consumido_em": "consumed_at",
        "lote": "batch_number",
        "validade": "expiry_date",
        "estado_material": "material_status",
        "estado_faturacao": "billing_status",
        "estado_faturação": "billing_status",
        "stock_baixado": "inventory_deducted",
        "quantidade_devolvida": "returned_quantity",
    }
    legacy_output_aliases = legacy_input_aliases

    class Meta:
        model = SurgicalConsumption
        fields = "__all__"
        read_only_fields = (
            *CORE_READ_ONLY_FIELDS,
            "surgery_code",
            "material_name",
            "product_name",
            "consumed_by_name",
            "total_cost",
            "line_total",
        )


class RecoveryRecordSerializer(LegacyAliasSerializerMixin, serializers.ModelSerializer):
    surgery_code = serializers.CharField(source="surgery.custom_id", read_only=True)
    nurse_name = serializers.CharField(source="nurse.name", read_only=True)
    legacy_input_aliases = {
        **BASE_ALIASES,
        "cirurgia": "surgery",
        "enfermeiro": "nurse",
        "admitido_em": "admitted_at",
        "alta_em": "discharged_at",
        "nivel_consciencia": "consciousness_level",
        "nível_consciência": "consciousness_level",
        "dor": "pain_score",
        "aldrete": "aldrete_score",
        "sinais_vitais": "vital_signs",
        "nauseas_vomitos": "nausea_vomiting",
        "náuseas_vómitos": "nausea_vomiting",
        "sangramento": "bleeding",
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
        "amostras": "specimens",
        "drenos": "drains",
        "implantes": "implants",
        "condicao_final_paciente": "final_patient_condition",
        "condição_final_paciente": "final_patient_condition",
        "plano_pos_operatorio": "postoperative_plan",
        "plano_pós_operatório": "postoperative_plan",
        "amostra_patologia": "specimen_sent_to_pathology",
        "numero_patologia": "pathology_accession_number",
        "iniciada_em": "started_at",
        "terminada_em": "ended_at",
        "assinado_em": "signed_at",
        "assinado_digitalmente": "digitally_signed",
        "referencia_assinatura_digital": "digital_signature_reference",
        "referência_assinatura_digital": "digital_signature_reference",
    }
    legacy_output_aliases = legacy_input_aliases

    class Meta:
        model = OperativeReport
        fields = "__all__"
        read_only_fields = (*CORE_READ_ONLY_FIELDS, "surgery_code", "patient_name", "primary_surgeon_name")


class SurgeryProcedureItemSerializer(LegacyAliasSerializerMixin, serializers.ModelSerializer):
    surgery_code = serializers.CharField(source="surgery.custom_id", read_only=True)
    patient_name = serializers.CharField(source="surgery.patient.name", read_only=True)
    procedure_name = serializers.CharField(source="procedure.name", read_only=True)
    responsible_surgeon_name = serializers.CharField(source="responsible_surgeon.name", read_only=True)
    line_total = serializers.DecimalField(max_digits=14, decimal_places=2, read_only=True)
    total_with_vat = serializers.DecimalField(max_digits=14, decimal_places=2, read_only=True)
    legacy_input_aliases = {
        **BASE_ALIASES,
        "cirurgia": "surgery",
        "procedimento": "procedure",
        "regiao_anatomica": "anatomical_region",
        "região_anatómica": "anatomical_region",
        "lateralidade": "laterality",
        "ordem": "sequence",
        "cirurgiao_responsavel": "responsible_surgeon",
        "cirurgião_responsável": "responsible_surgeon",
        "quantidade": "quantity",
        "preco_unitario": "unit_price",
        "preço_unitário": "unit_price",
        "iva": "vat_percentage",
        "aplica_iva": "applies_vat",
        "iniciado_em": "started_at",
        "concluido_em": "ended_at",
        "concluído_em": "ended_at",
    }
    legacy_output_aliases = legacy_input_aliases

    class Meta:
        model = SurgeryProcedureItem
        fields = "__all__"
        read_only_fields = (
            *CORE_READ_ONLY_FIELDS,
            "surgery_code",
            "patient_name",
            "procedure_name",
            "responsible_surgeon_name",
            "line_total",
            "total_with_vat",
        )


class SurgicalAuthorizationSerializer(LegacyAliasSerializerMixin, serializers.ModelSerializer):
    patient_name = serializers.CharField(source="patient.name", read_only=True)
    surgery_code = serializers.CharField(source="surgery.custom_id", read_only=True)
    surgical_request_code = serializers.CharField(source="surgical_request.custom_id", read_only=True)
    preoperative_assessment_code = serializers.CharField(source="preoperative_assessment.custom_id", read_only=True)
    legacy_input_aliases = {
        **BASE_ALIASES,
        "paciente": "patient",
        "cirurgia": "surgery",
        "pedido_cirurgico": "surgical_request",
        "pedido_cirúrgico": "surgical_request",
        "avaliacao_pre_operatoria": "preoperative_assessment",
        "avaliação_pré_operatória": "preoperative_assessment",
        "valor_orcamentado": "quotation_amount",
        "valor_orçamentado": "quotation_amount",
        "valor_aprovado": "approved_amount",
        "pagamento_inicial": "initial_payment_amount",
        "orcamento_aprovado": "budget_approved",
        "orçamento_aprovado": "budget_approved",
        "pagamento_inicial_recebido": "initial_payment_received",
        "seguro_autorizou": "insurance_authorized",
        "materiais_especiais_aprovados": "special_materials_approved",
        "sala_disponivel": "room_available",
        "sala_disponível": "room_available",
        "equipa_disponivel": "team_available",
        "equipa_disponível": "team_available",
        "avaliacao_pre_operatoria_concluida": "preoperative_assessment_completed",
        "avaliação_pré_operatória_concluída": "preoperative_assessment_completed",
        "consentimento_assinado": "consent_signed",
        "valida_ate": "valid_until",
        "válida_até": "valid_until",
        "aprovada_em": "approved_at",
        "motivo_rejeicao": "rejected_reason",
        "motivo_rejeição": "rejected_reason",
    }
    legacy_output_aliases = legacy_input_aliases

    class Meta:
        model = SurgicalAuthorization
        fields = "__all__"
        read_only_fields = (
            *CORE_READ_ONLY_FIELDS,
            "patient_name",
            "surgery_code",
            "surgical_request_code",
            "preoperative_assessment_code",
        )


class SurgicalBillingItemSerializer(LegacyAliasSerializerMixin, serializers.ModelSerializer):
    surgery_code = serializers.CharField(source="surgery.custom_id", read_only=True)
    patient_name = serializers.CharField(source="surgery.patient.name", read_only=True)
    authorization_code = serializers.CharField(source="authorization.custom_id", read_only=True)
    procedure_item_code = serializers.CharField(source="procedure_item.custom_id", read_only=True)
    consumption_code = serializers.CharField(source="consumption.custom_id", read_only=True)
    invoice_code = serializers.CharField(source="invoice.custom_id", read_only=True)
    line_total = serializers.DecimalField(max_digits=14, decimal_places=2, read_only=True)
    total_with_vat = serializers.DecimalField(max_digits=14, decimal_places=2, read_only=True)
    legacy_input_aliases = {
        **BASE_ALIASES,
        "cirurgia": "surgery",
        "autorizacao": "authorization",
        "autorização": "authorization",
        "procedimento_realizado": "procedure_item",
        "consumo": "consumption",
        "fatura": "invoice",
        "evento_faturavel": "event_type",
        "evento_faturável": "event_type",
        "modo_cobranca": "billing_mode",
        "modo_cobrança": "billing_mode",
        "quantidade": "quantity",
        "preco_unitario": "unit_price",
        "preço_unitário": "unit_price",
        "iva": "vat_percentage",
        "aplica_iva": "applies_vat",
        "faturavel": "billable",
        "faturável": "billable",
        "faturado_em": "billed_at",
    }
    legacy_output_aliases = legacy_input_aliases

    class Meta:
        model = SurgicalBillingItem
        fields = "__all__"
        read_only_fields = (
            *CORE_READ_ONLY_FIELDS,
            "surgery_code",
            "patient_name",
            "authorization_code",
            "procedure_item_code",
            "consumption_code",
            "invoice_code",
            "line_total",
            "total_with_vat",
        )


class SurgicalDocumentSerializer(LegacyAliasSerializerMixin, serializers.ModelSerializer):
    surgery_code = serializers.CharField(source="surgery.custom_id", read_only=True)
    surgical_request_code = serializers.CharField(source="surgical_request.custom_id", read_only=True)
    preoperative_assessment_code = serializers.CharField(source="preoperative_assessment.custom_id", read_only=True)
    authorization_code = serializers.CharField(source="authorization.custom_id", read_only=True)
    uploaded_by_name = serializers.CharField(source="uploaded_by.name", read_only=True)
    legacy_input_aliases = {
        **BASE_ALIASES,
        "cirurgia": "surgery",
        "pedido_cirurgico": "surgical_request",
        "pedido_cirúrgico": "surgical_request",
        "avaliacao_pre_operatoria": "preoperative_assessment",
        "avaliação_pré_operatória": "preoperative_assessment",
        "autorizacao": "authorization",
        "autorização": "authorization",
        "carregado_por": "uploaded_by",
        "titulo": "title",
        "título": "title",
        "tipo_documento": "document_type",
        "ficheiro": "file",
        "arquivo": "file",
        "referencia_externa": "external_reference",
        "referência_externa": "external_reference",
        "assinado_em": "signed_at",
        "expira_em": "expires_at",
    }
    legacy_output_aliases = legacy_input_aliases

    class Meta:
        model = SurgicalDocument
        fields = "__all__"
        read_only_fields = (
            *CORE_READ_ONLY_FIELDS,
            "surgery_code",
            "surgical_request_code",
            "preoperative_assessment_code",
            "authorization_code",
            "uploaded_by_name",
        )


class SurgicalAuditEventSerializer(LegacyAliasSerializerMixin, serializers.ModelSerializer):
    surgery_code = serializers.CharField(source="surgery.custom_id", read_only=True)
    surgical_request_code = serializers.CharField(source="surgical_request.custom_id", read_only=True)
    actor_name = serializers.CharField(source="actor.name", read_only=True)
    legacy_input_aliases = {
        **BASE_ALIASES,
        "cirurgia": "surgery",
        "pedido_cirurgico": "surgical_request",
        "pedido_cirúrgico": "surgical_request",
        "responsavel": "actor",
        "responsável": "actor",
        "tipo_evento": "event_type",
        "acao": "action",
        "ação": "action",
        "estado_anterior": "previous_state",
        "novo_estado": "new_state",
        "metadados": "metadata",
        "ocorrido_em": "occurred_at",
    }
    legacy_output_aliases = legacy_input_aliases

    class Meta:
        model = SurgicalAuditEvent
        fields = "__all__"
        read_only_fields = (*CORE_READ_ONLY_FIELDS, "surgery_code", "surgical_request_code", "actor_name")


class SurgicalSpecimenSerializer(LegacyAliasSerializerMixin, serializers.ModelSerializer):
    surgery_code = serializers.CharField(source="surgery.custom_id", read_only=True)
    patient_name = serializers.CharField(source="patient.name", read_only=True)
    responsible_name = serializers.CharField(source="responsible.name", read_only=True)
    pathology_request_code = serializers.CharField(source="pathology_request.custom_id", read_only=True)
    legacy_input_aliases = {
        **BASE_ALIASES,
        "cirurgia": "surgery",
        "paciente": "patient",
        "tipo_amostra": "specimen_type",
        "local_anatomico": "anatomical_site",
        "local_anatómico": "anatomical_site",
        "colhida_em": "collected_at",
        "fixador": "fixative",
        "fixador_usado": "fixative",
        "responsavel": "responsible",
        "responsável": "responsible",
        "pedido_patologia": "pathology_request",
    }
    legacy_output_aliases = legacy_input_aliases

    class Meta:
        model = SurgicalSpecimen
        fields = "__all__"
        read_only_fields = (
            *CORE_READ_ONLY_FIELDS,
            "surgery_code",
            "patient_name",
            "responsible_name",
            "pathology_request_code",
        )


SERIALIZER_MAP = {
    "pedido_cirurgico": SurgicalRequestSerializer,
    "avaliacao_pre_operatoria": PreoperativeAssessmentSerializer,
    "surgery": SurgerySerializer,
    "small_surgery": SmallSurgerySerializer,
    "large_surgery": LargeSurgerySerializer,
    "surgical_procedure": SurgicalProcedureSerializer,
    "procedimentos_realizados": SurgeryProcedureItemSerializer,
    "agenda_cirurgica": SurgicalScheduleSerializer,
    "centro_cirurgico": OperatingRoomSerializer,
    "equipa_cirurgica": SurgicalTeamMemberSerializer,
    "anestesia": AnesthesiaRecordSerializer,
    "checklist_seguranca": SurgicalSafetyChecklistSerializer,
    "materiais": SurgicalMaterialSerializer,
    "consumos": SurgicalConsumptionSerializer,
    "recuperacao": RecoveryRecordSerializer,
    "relatorio_operatorio": OperativeReportSerializer,
    "autorizacoes": SurgicalAuthorizationSerializer,
    "faturacao": SurgicalBillingItemSerializer,
    "documentos": SurgicalDocumentSerializer,
    "auditoria": SurgicalAuditEventSerializer,
    "amostras": SurgicalSpecimenSerializer,
}
