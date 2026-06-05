from rest_framework import serializers

from api.v1.compat import LegacyAliasSerializerMixin
from apps.dental.models import (
    DentalAppointment,
    DentalApproval,
    DentalAuditEvent,
    DentalBillingItem,
    DentalClinicalEvolution,
    DentalConsultation,
    DentalDiagnosis,
    DentalDocument,
    DentalFollowUp,
    DentalImagingOrder,
    DentalMaterialConsumption,
    DentalOdontogram,
    DentalOdontogramEntry,
    DentalPatientTreatmentPlan,
    DentalPayment,
    DentalPrescription,
    DentalProcedure,
    DentalProcedureExecution,
    DentalProsthesisLabOrder,
    DentalQuotation,
    DentalRecord,
    DentalTreatmentPhase,
    DentalTreatmentPlan,
    DentalTreatmentPlanItem,
    PatientDentalPlanSummary,
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
        read_only_fields = (*CORE_READ_ONLY_FIELDS, "code")


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


class DentalConsultationSerializer(LegacyAliasSerializerMixin, serializers.ModelSerializer):
    legacy_input_aliases = {
        **BASE_ALIASES,
        "marcacao": "appointment",
        "marcação": "appointment",
        "prontuario": "record",
        "prontuário": "record",
        "inicio": "started_at",
        "fim": "ended_at",
        "queixa_principal": "chief_complaint",
        "historia_doenca_atual": "present_illness_history",
        "história_doença_atual": "present_illness_history",
        "antecedentes_medicos": "medical_history",
        "antecedentes_médicos": "medical_history",
        "alergias": "allergies",
        "medicacao_em_uso": "current_medication",
        "medicação_em_uso": "current_medication",
        "habitos_higiene_oral": "oral_hygiene_habits",
        "hábitos_higiene_oral": "oral_hygiene_habits",
        "exame_intraoral": "intraoral_exam",
        "exame_extraoral": "extraoral_exam",
        "observacoes_clinicas": "clinical_observations",
        "observações_clínicas": "clinical_observations",
        "anexos": "attachment_notes",
    }
    legacy_output_aliases = legacy_input_aliases

    patient_name = serializers.CharField(source="patient.name", read_only=True)
    dentist_name = serializers.CharField(source="dentist.name", read_only=True)

    class Meta:
        model = DentalConsultation
        fields = "__all__"
        read_only_fields = (*CORE_READ_ONLY_FIELDS, "patient_name", "dentist_name")


class DentalOdontogramSerializer(LegacyAliasSerializerMixin, serializers.ModelSerializer):
    legacy_input_aliases = {
        **BASE_ALIASES,
        "prontuario": "record",
        "prontuário": "record",
        "atendimento": "consultation",
        "tipo_denticao": "dentition_type",
        "tipo_dentição": "dentition_type",
        "dentista_criador": "created_by_dentist",
        "data_odontograma": "charted_at",
    }
    legacy_output_aliases = legacy_input_aliases

    patient_name = serializers.CharField(source="patient.name", read_only=True)
    dentist_name = serializers.CharField(source="created_by_dentist.name", read_only=True)
    entry_count = serializers.IntegerField(source="entries.count", read_only=True)

    class Meta:
        model = DentalOdontogram
        fields = "__all__"
        read_only_fields = (*CORE_READ_ONLY_FIELDS, "patient_name", "dentist_name", "entry_count")


class DentalOdontogramEntrySerializer(LegacyAliasSerializerMixin, serializers.ModelSerializer):
    legacy_input_aliases = {
        **BASE_ALIASES,
        "mapa_odontologico": "odontogram",
        "mapa_odontológico": "odontogram",
        "prontuario": "record",
        "prontuário": "record",
        "dente": "tooth_number",
        "face": "surface",
        "condicao": "condition",
        "condição": "condition",
        "diagnostico": "diagnosis",
        "diagnóstico": "diagnosis",
        "gravidade": "severity",
        "codigo_cor": "color_code",
        "código_cor": "color_code",
        "procedimento_sugerido": "procedure_suggested",
        "procedimento": "procedure",
    }
    legacy_output_aliases = legacy_input_aliases

    patient_name = serializers.CharField(source="record.patient.name", read_only=True)
    procedure_name = serializers.CharField(source="procedure.name", read_only=True)

    class Meta:
        model = DentalOdontogramEntry
        fields = "__all__"
        read_only_fields = (*CORE_READ_ONLY_FIELDS, "patient_name", "procedure_name")


class DentalDiagnosisSerializer(LegacyAliasSerializerMixin, serializers.ModelSerializer):
    legacy_input_aliases = {
        **BASE_ALIASES,
        "atendimento": "consultation",
        "prontuario": "record",
        "prontuário": "record",
        "entrada_odontograma": "odontogram_entry",
        "dente": "tooth_number",
        "codigo": "code",
        "código": "code",
        "diagnostico": "diagnosis",
        "diagnóstico": "diagnosis",
        "gravidade": "severity",
        "responsavel": "responsible_dentist",
        "responsável": "responsible_dentist",
        "diagnosticado_em": "diagnosed_at",
    }
    legacy_output_aliases = legacy_input_aliases

    patient_name = serializers.CharField(source="patient.name", read_only=True)
    dentist_name = serializers.CharField(source="responsible_dentist.name", read_only=True)

    class Meta:
        model = DentalDiagnosis
        fields = "__all__"
        read_only_fields = (*CORE_READ_ONLY_FIELDS, "patient_name", "dentist_name")


class DentalTreatmentPlanSerializer(LegacyAliasSerializerMixin, serializers.ModelSerializer):
    legacy_input_aliases = {
        **BASE_ALIASES,
        "prontuario": "record",
        "prontuário": "record",
        "titulo": "title",
        "título": "title",
        "prioridade": "priority",
        "objetivos": "objectives",
        "inicio_previsto": "planned_start",
        "início_previsto": "planned_start",
        "fim_previsto": "planned_end",
        "aprovado_em": "approved_at",
        "total_estimado": "estimated_total",
        "desconto": "discount_amount",
        "valor_aprovado": "approved_amount",
        "exige_sinal_inicial": "requires_initial_payment",
        "valor_sinal_inicial": "initial_payment_amount",
    }
    legacy_output_aliases = legacy_input_aliases

    patient_name = serializers.CharField(source="patient.name", read_only=True)
    dentist_name = serializers.CharField(source="dentist.name", read_only=True)
    item_count = serializers.IntegerField(source="items.count", read_only=True)
    patient_assignment_count = serializers.IntegerField(source="patient_assignments.count", read_only=True)

    class Meta:
        model = DentalTreatmentPlan
        fields = "__all__"
        read_only_fields = (
            *CORE_READ_ONLY_FIELDS,
            "patient_name",
            "dentist_name",
            "item_count",
            "patient_assignment_count",
        )


class DentalTreatmentPhaseSerializer(LegacyAliasSerializerMixin, serializers.ModelSerializer):
    legacy_input_aliases = {
        **BASE_ALIASES,
        "plano_tratamento": "treatment_plan",
        "titulo": "title",
        "título": "title",
        "tipo_fase": "phase_type",
        "inicio_previsto": "planned_start",
        "início_previsto": "planned_start",
        "fim_previsto": "planned_end",
        "valor_estimado": "estimated_amount",
        "valor_aprovado": "approved_amount",
        "posição": "position",
        "posicao": "position",
    }
    legacy_output_aliases = legacy_input_aliases

    treatment_plan_title = serializers.CharField(source="treatment_plan.title", read_only=True)

    class Meta:
        model = DentalTreatmentPhase
        fields = "__all__"
        read_only_fields = (*CORE_READ_ONLY_FIELDS, "treatment_plan_title")


class DentalTreatmentPlanItemSerializer(LegacyAliasSerializerMixin, serializers.ModelSerializer):
    legacy_input_aliases = {
        **BASE_ALIASES,
        "plano_tratamento": "treatment_plan",
        "fase": "phase",
        "procedimento": "procedure",
        "consulta": "appointment",
        "dente": "tooth_number",
        "face": "surface",
        "estado_financeiro": "financial_status",
        "data_prevista": "scheduled_date",
        "concluido_em": "completed_at",
        "concluído_em": "completed_at",
        "quantidade": "quantity",
        "preco_unitario": "unit_price",
        "preço_unitário": "unit_price",
        "desconto": "discount_amount",
        "requer_laboratorio": "lab_required",
        "aprovado_em": "approved_at",
        "notas_clinicas": "clinical_notes",
        "posição": "position",
        "posicao": "position",
    }
    legacy_output_aliases = legacy_input_aliases

    procedure_name = serializers.CharField(source="procedure.name", read_only=True)
    treatment_plan_title = serializers.CharField(source="treatment_plan.title", read_only=True)
    total_price = serializers.DecimalField(max_digits=12, decimal_places=2, read_only=True)
    final_price = serializers.DecimalField(max_digits=12, decimal_places=2, read_only=True)

    class Meta:
        model = DentalTreatmentPlanItem
        fields = "__all__"
        read_only_fields = (
            *CORE_READ_ONLY_FIELDS,
            "procedure_name",
            "treatment_plan_title",
            "total_price",
            "final_price",
        )


class DentalPatientTreatmentPlanSerializer(LegacyAliasSerializerMixin, serializers.ModelSerializer):
    legacy_input_aliases = {
        **BASE_ALIASES,
        "plano_tratamento": "treatment_plan",
        "plano_dentario": "treatment_plan",
        "plano_dentário": "treatment_plan",
        "prontuario": "record",
        "prontuário": "record",
        "atribuido_em": "assigned_at",
        "atribuído_em": "assigned_at",
        "inicio_vigencia": "valid_from",
        "início_vigência": "valid_from",
        "fim_vigencia": "valid_until",
        "fim_vigência": "valid_until",
    }
    legacy_output_aliases = legacy_input_aliases

    patient_name = serializers.CharField(source="patient.name", read_only=True)
    treatment_plan_title = serializers.CharField(source="treatment_plan.title", read_only=True)
    dentist_name = serializers.CharField(source="dentist.name", read_only=True)
    item_count = serializers.IntegerField(source="treatment_plan.items.count", read_only=True)
    is_valid = serializers.BooleanField(read_only=True)
    is_expired = serializers.BooleanField(read_only=True)
    validity_status = serializers.CharField(read_only=True)

    class Meta:
        model = DentalPatientTreatmentPlan
        fields = "__all__"
        read_only_fields = (
            *CORE_READ_ONLY_FIELDS,
            "patient_name",
            "treatment_plan_title",
            "dentist_name",
            "item_count",
            "is_valid",
            "is_expired",
            "validity_status",
        )


class DentalQuotationSerializer(LegacyAliasSerializerMixin, serializers.ModelSerializer):
    legacy_input_aliases = {
        **BASE_ALIASES,
        "plano_tratamento": "treatment_plan",
        "emitido_por": "issued_by",
        "emitido_em": "issued_at",
        "valido_ate": "valid_until",
        "válido_até": "valid_until",
        "subtotal": "subtotal",
        "desconto": "discount_amount",
        "iva_taxas": "tax_amount",
        "valor_total": "total_amount",
        "condicoes_pagamento": "payment_terms",
        "condições_pagamento": "payment_terms",
    }
    legacy_output_aliases = legacy_input_aliases

    patient_name = serializers.CharField(source="patient.name", read_only=True)
    treatment_plan_title = serializers.CharField(source="treatment_plan.title", read_only=True)
    issued_by_name = serializers.CharField(source="issued_by.name", read_only=True)

    class Meta:
        model = DentalQuotation
        fields = "__all__"
        read_only_fields = (*CORE_READ_ONLY_FIELDS, "patient_name", "treatment_plan_title", "issued_by_name")


class DentalApprovalSerializer(LegacyAliasSerializerMixin, serializers.ModelSerializer):
    legacy_input_aliases = {
        **BASE_ALIASES,
        "plano_tratamento": "treatment_plan",
        "orcamento": "quotation",
        "orçamento": "quotation",
        "aprovado_por": "approved_by_name",
        "aprovado_em": "approved_at",
        "escopo_aprovado": "approval_scope",
        "valor_aprovado": "approved_amount",
        "termos_aceites": "accepted_terms",
        "consentimento_assinado": "consent_signed",
        "referencia_consentimento": "consent_document_reference",
        "referência_consentimento": "consent_document_reference",
    }
    legacy_output_aliases = legacy_input_aliases

    patient_name = serializers.CharField(source="patient.name", read_only=True)
    treatment_plan_title = serializers.CharField(source="treatment_plan.title", read_only=True)

    class Meta:
        model = DentalApproval
        fields = "__all__"
        read_only_fields = (*CORE_READ_ONLY_FIELDS, "patient_name", "treatment_plan_title")


class DentalPaymentSerializer(LegacyAliasSerializerMixin, serializers.ModelSerializer):
    legacy_input_aliases = {
        **BASE_ALIASES,
        "plano_tratamento": "treatment_plan",
        "item_tratamento": "treatment_item",
        "orcamento": "quotation",
        "orçamento": "quotation",
        "pagamento": "payment",
        "tipo_pagamento": "payment_kind",
        "vencimento": "due_date",
        "pago_em": "paid_at",
        "valor_devido": "amount_due",
        "valor_pago": "amount_paid",
        "metodo": "method",
        "método": "method",
        "referencia_externa": "external_reference",
        "referência_externa": "external_reference",
    }
    legacy_output_aliases = legacy_input_aliases

    patient_name = serializers.CharField(source="patient.name", read_only=True)
    treatment_plan_title = serializers.CharField(source="treatment_plan.title", read_only=True)
    balance = serializers.DecimalField(max_digits=12, decimal_places=2, read_only=True)

    class Meta:
        model = DentalPayment
        fields = "__all__"
        read_only_fields = (*CORE_READ_ONLY_FIELDS, "patient_name", "treatment_plan_title", "balance")


class DentalProcedureExecutionSerializer(LegacyAliasSerializerMixin, serializers.ModelSerializer):
    legacy_input_aliases = {
        **BASE_ALIASES,
        "atendimento": "consultation",
        "plano_tratamento": "treatment_plan",
        "item_tratamento": "treatment_item",
        "marcacao": "appointment",
        "marcação": "appointment",
        "procedimento": "procedure",
        "executado_por": "performed_by",
        "dente": "tooth_number",
        "face": "surface",
        "agendado_para": "scheduled_at",
        "iniciado_em": "started_at",
        "executado_em": "performed_at",
        "materiais_usados": "materials_used",
        "anestesia_usada": "anesthesia_used",
        "notas_clinicas": "clinical_notes",
    }
    legacy_output_aliases = legacy_input_aliases

    patient_name = serializers.CharField(source="patient.name", read_only=True)
    procedure_name = serializers.CharField(source="procedure.name", read_only=True)
    performed_by_name = serializers.CharField(source="performed_by.name", read_only=True)

    class Meta:
        model = DentalProcedureExecution
        fields = "__all__"
        read_only_fields = (*CORE_READ_ONLY_FIELDS, "patient_name", "procedure_name", "performed_by_name")


class DentalProsthesisLabOrderSerializer(LegacyAliasSerializerMixin, serializers.ModelSerializer):
    legacy_input_aliases = {
        **BASE_ALIASES,
        "item_tratamento": "treatment_item",
        "procedimento_executado": "procedure_execution",
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
        "recebido_laboratorio_em": "received_by_lab_at",
        "recebido_laboratório_em": "received_by_lab_at",
        "previsao_entrega": "due_date",
        "previsão_entrega": "due_date",
        "prova_em": "trial_at",
        "recebido_em": "received_at",
        "ajustado_em": "adjusted_at",
        "entregue_em": "delivered_at",
        "instalado_em": "installed_at",
        "notas_laboratorio": "lab_notes",
        "custo": "cost",
        "preco_paciente": "patient_price",
        "preço_paciente": "patient_price",
    }
    legacy_output_aliases = legacy_input_aliases

    patient_name = serializers.CharField(source="patient.name", read_only=True)
    dentist_name = serializers.CharField(source="dentist.name", read_only=True)
    lab_company_name = serializers.CharField(source="lab_company.name", read_only=True)

    class Meta:
        model = DentalProsthesisLabOrder
        fields = "__all__"
        read_only_fields = (*CORE_READ_ONLY_FIELDS, "patient_name", "dentist_name", "lab_company_name")


class DentalImagingOrderSerializer(LegacyAliasSerializerMixin, serializers.ModelSerializer):
    legacy_input_aliases = {
        **BASE_ALIASES,
        "atendimento": "consultation",
        "prontuario": "record",
        "prontuário": "record",
        "item_tratamento": "treatment_item",
        "procedimento_executado": "procedure_execution",
        "tipo_imagem": "imaging_type",
        "solicitado_em": "requested_at",
        "agendado_para": "scheduled_at",
        "adquirido_em": "acquired_at",
        "revisto_em": "reviewed_at",
        "indicacao_clinica": "clinical_indication",
        "indicação_clínica": "clinical_indication",
        "resumo_resultado": "result_summary",
        "referencia_imagem": "image_reference",
        "referência_imagem": "image_reference",
    }
    legacy_output_aliases = legacy_input_aliases

    patient_name = serializers.CharField(source="patient.name", read_only=True)
    dentist_name = serializers.CharField(source="dentist.name", read_only=True)

    class Meta:
        model = DentalImagingOrder
        fields = "__all__"
        read_only_fields = (*CORE_READ_ONLY_FIELDS, "patient_name", "dentist_name")


class DentalPrescriptionSerializer(LegacyAliasSerializerMixin, serializers.ModelSerializer):
    legacy_input_aliases = {
        **BASE_ALIASES,
        "atendimento": "consultation",
        "prontuario": "record",
        "prontuário": "record",
        "procedimento_executado": "procedure_execution",
        "produto_medicamento": "medication_product",
        "medicamento": "medication",
        "dose": "dose",
        "frequencia": "frequency",
        "frequência": "frequency",
        "duracao": "duration",
        "duração": "duration",
        "instrucoes": "instructions",
        "instruções": "instructions",
        "prescrito_em": "prescribed_at",
    }
    legacy_output_aliases = legacy_input_aliases

    patient_name = serializers.CharField(source="patient.name", read_only=True)
    dentist_name = serializers.CharField(source="dentist.name", read_only=True)

    class Meta:
        model = DentalPrescription
        fields = "__all__"
        read_only_fields = (*CORE_READ_ONLY_FIELDS, "patient_name", "dentist_name")


class DentalFollowUpSerializer(LegacyAliasSerializerMixin, serializers.ModelSerializer):
    legacy_input_aliases = {
        **BASE_ALIASES,
        "procedimento_executado": "procedure_execution",
        "marcacao": "appointment",
        "marcação": "appointment",
        "plano_tratamento": "treatment_plan",
        "motivo_retorno": "followup_reason",
        "data_prevista": "due_date",
        "concluido_em": "completed_at",
        "concluído_em": "completed_at",
        "achados": "findings",
    }
    legacy_output_aliases = legacy_input_aliases

    patient_name = serializers.CharField(source="patient.name", read_only=True)

    class Meta:
        model = DentalFollowUp
        fields = "__all__"
        read_only_fields = (*CORE_READ_ONLY_FIELDS, "patient_name")


class DentalMaterialConsumptionSerializer(LegacyAliasSerializerMixin, serializers.ModelSerializer):
    legacy_input_aliases = {
        **BASE_ALIASES,
        "procedimento_executado": "procedure_execution",
        "produto": "product",
        "item_armazem": "warehouse_item",
        "item_armazém": "warehouse_item",
        "movimento_stock": "inventory_movement",
        "material": "material_name",
        "quantidade": "quantity",
        "custo_unitario": "unit_cost",
        "custo_unitário": "unit_cost",
        "consumido_em": "consumed_at",
    }
    legacy_output_aliases = legacy_input_aliases

    procedure_execution_label = serializers.CharField(source="procedure_execution.custom_id", read_only=True)
    total_cost = serializers.DecimalField(max_digits=12, decimal_places=2, read_only=True)

    class Meta:
        model = DentalMaterialConsumption
        fields = "__all__"
        read_only_fields = (*CORE_READ_ONLY_FIELDS, "procedure_execution_label", "total_cost")


class DentalClinicalEvolutionSerializer(LegacyAliasSerializerMixin, serializers.ModelSerializer):
    legacy_input_aliases = {
        **BASE_ALIASES,
        "prontuario": "record",
        "prontuário": "record",
        "atendimento": "consultation",
        "procedimento_executado": "procedure_execution",
        "plano_tratamento": "treatment_plan",
        "evolucao_em": "evolved_at",
        "evolução_em": "evolved_at",
        "resumo": "summary",
        "proximos_passos": "next_steps",
        "próximos_passos": "next_steps",
    }
    legacy_output_aliases = legacy_input_aliases

    patient_name = serializers.CharField(source="patient.name", read_only=True)
    dentist_name = serializers.CharField(source="dentist.name", read_only=True)

    class Meta:
        model = DentalClinicalEvolution
        fields = "__all__"
        read_only_fields = (*CORE_READ_ONLY_FIELDS, "patient_name", "dentist_name")


class DentalDocumentSerializer(LegacyAliasSerializerMixin, serializers.ModelSerializer):
    legacy_input_aliases = {
        **BASE_ALIASES,
        "atendimento": "consultation",
        "prontuario": "record",
        "prontuário": "record",
        "plano_tratamento": "treatment_plan",
        "tipo_documento": "document_type",
        "titulo": "title",
        "título": "title",
        "referencia_ficheiro": "file_reference",
        "referência_ficheiro": "file_reference",
        "assinado": "signed",
        "assinado_em": "signed_at",
    }
    legacy_output_aliases = legacy_input_aliases

    patient_name = serializers.CharField(source="patient.name", read_only=True)

    class Meta:
        model = DentalDocument
        fields = "__all__"
        read_only_fields = (*CORE_READ_ONLY_FIELDS, "patient_name")


class DentalAuditEventSerializer(LegacyAliasSerializerMixin, serializers.ModelSerializer):
    legacy_input_aliases = {
        **BASE_ALIASES,
        "plano_tratamento": "treatment_plan",
        "tipo_evento": "event_type",
        "responsavel": "actor_name",
        "responsável": "actor_name",
        "evento_em": "event_at",
        "resumo": "summary",
        "metadados": "metadata",
    }
    legacy_output_aliases = legacy_input_aliases

    patient_name = serializers.CharField(source="patient.name", read_only=True)
    treatment_plan_title = serializers.CharField(source="treatment_plan.title", read_only=True)

    class Meta:
        model = DentalAuditEvent
        fields = "__all__"
        read_only_fields = (*CORE_READ_ONLY_FIELDS, "patient_name", "treatment_plan_title")


class DentalBillingItemSerializer(LegacyAliasSerializerMixin, serializers.ModelSerializer):
    legacy_input_aliases = {
        **BASE_ALIASES,
        "plano_tratamento": "treatment_plan",
        "item_tratamento": "treatment_item",
        "procedimento_executado": "procedure_execution",
        "orcamento": "quotation",
        "orçamento": "quotation",
        "fatura": "invoice",
        "item_fatura": "invoice_item",
        "descricao": "description",
        "descrição": "description",
        "quantidade": "quantity",
        "preco_unitario": "unit_price",
        "preço_unitário": "unit_price",
        "desconto": "discount_amount",
        "iva_taxas": "tax_amount",
        "faturavel_em": "billable_at",
        "faturável_em": "billable_at",
        "faturado_em": "billed_at",
    }
    legacy_output_aliases = legacy_input_aliases

    patient_name = serializers.CharField(source="patient.name", read_only=True)
    total_amount = serializers.DecimalField(max_digits=12, decimal_places=2, read_only=True)

    class Meta:
        model = DentalBillingItem
        fields = "__all__"
        read_only_fields = (*CORE_READ_ONLY_FIELDS, "patient_name", "total_amount")


class PatientDentalPlanSummarySerializer(LegacyAliasSerializerMixin, serializers.ModelSerializer):
    legacy_input_aliases = {
        **BASE_ALIASES,
        "plano_ativo": "active_plan",
        "proxima_consulta": "next_appointment",
        "próxima_consulta": "next_appointment",
        "estado_plano": "plan_status",
        "total_planeado": "total_planned_amount",
        "total_pago": "total_paid",
        "saldo": "balance_amount",
        "itens_concluidos": "completed_items",
        "itens_concluídos": "completed_items",
        "itens_pendentes": "pending_items",
        "gerado_em": "generated_at",
    }
    legacy_output_aliases = legacy_input_aliases

    patient_name = serializers.CharField(source="patient.name", read_only=True)
    active_plan_title = serializers.CharField(source="active_plan.title", read_only=True)

    class Meta:
        model = PatientDentalPlanSummary
        fields = "__all__"
        read_only_fields = (*CORE_READ_ONLY_FIELDS, "patient_name", "active_plan_title")


SERIALIZER_MAP = {
    "procedure": DentalProcedureSerializer,
    "appointment": DentalAppointmentSerializer,
    "consultation": DentalConsultationSerializer,
    "record": DentalRecordSerializer,
    "odontogram_chart": DentalOdontogramSerializer,
    "odontogram": DentalOdontogramEntrySerializer,
    "diagnosis": DentalDiagnosisSerializer,
    "treatment_plan": DentalTreatmentPlanSerializer,
    "treatment_phase": DentalTreatmentPhaseSerializer,
    "treatment_item": DentalTreatmentPlanItemSerializer,
    "patient_treatment_plan": DentalPatientTreatmentPlanSerializer,
    "quotation": DentalQuotationSerializer,
    "approval": DentalApprovalSerializer,
    "payment": DentalPaymentSerializer,
    "procedure_execution": DentalProcedureExecutionSerializer,
    "prosthesis_lab_order": DentalProsthesisLabOrderSerializer,
    "imaging_order": DentalImagingOrderSerializer,
    "prescription": DentalPrescriptionSerializer,
    "followup": DentalFollowUpSerializer,
    "material_consumption": DentalMaterialConsumptionSerializer,
    "clinical_evolution": DentalClinicalEvolutionSerializer,
    "document": DentalDocumentSerializer,
    "audit_event": DentalAuditEventSerializer,
    "billing_item": DentalBillingItemSerializer,
    "patient_plan_summary": PatientDentalPlanSummarySerializer,
}
