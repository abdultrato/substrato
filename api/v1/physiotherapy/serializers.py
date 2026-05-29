from rest_framework import serializers

from api.v1.compat import LegacyAliasSerializerMixin
from apps.physiotherapy.models import (
    FunctionalAssessment,
    PhysiotherapyDevice,
    RehabilitationDeviceUsage,
    RehabilitationProgressNote,
    RehabilitationSession,
    RehabilitationTreatmentPlan,
    TreatmentPlanIntervention,
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
    "nome": "name",
    "codigo": "code",
    "código": "code",
    "estado": "status",
    "situacao": "status",
    "situação": "status",
    "observacoes": "notes",
    "observações": "notes",
    "notas": "notes",
    "paciente": "patient",
    "fisioterapeuta": "therapist",
}


class PhysiotherapyDeviceSerializer(LegacyAliasSerializerMixin, serializers.ModelSerializer):
    legacy_input_aliases = {
        **BASE_ALIASES,
        "tipo_aparelho": "device_type",
        "fabricante": "manufacturer",
        "modelo": "model",
        "numero_serie": "serial_number",
        "número_série": "serial_number",
        "localizacao": "location",
        "localização": "location",
        "ultima_manutencao": "last_maintenance",
        "última_manutenção": "last_maintenance",
        "proxima_manutencao": "next_maintenance",
        "próxima_manutenção": "next_maintenance",
    }
    legacy_output_aliases = legacy_input_aliases

    class Meta:
        model = PhysiotherapyDevice
        fields = "__all__"
        read_only_fields = CORE_READ_ONLY_FIELDS


class FunctionalAssessmentSerializer(LegacyAliasSerializerMixin, serializers.ModelSerializer):
    patient_name = serializers.CharField(source="patient.name", read_only=True)
    therapist_name = serializers.CharField(source="therapist.name", read_only=True)
    record_label = serializers.CharField(source="medical_record.custom_id", read_only=True)
    legacy_input_aliases = {
        **BASE_ALIASES,
        "consulta": "consultation",
        "cardex": "medical_record",
        "prontuario": "medical_record",
        "prontuário": "medical_record",
        "avaliada_em": "assessed_at",
        "queixa_principal": "primary_complaint",
        "diagnostico_clinico": "clinical_diagnosis",
        "diagnóstico_clínico": "clinical_diagnosis",
        "diagnostico_funcional": "functional_diagnosis",
        "diagnóstico_funcional": "functional_diagnosis",
        "regiao": "body_region",
        "região": "body_region",
        "dor": "pain_score",
        "mobilidade": "mobility_score",
        "forca": "strength_score",
        "força": "strength_score",
        "equilibrio": "balance_score",
        "equilíbrio": "balance_score",
        "independencia_funcional": "functional_independence_score",
        "independência_funcional": "functional_independence_score",
        "amplitude_movimento": "range_of_motion",
        "limitacoes": "limitations",
        "limitações": "limitations",
        "objetivos": "goals",
        "precaucoes": "precautions",
        "precauções": "precautions",
    }
    legacy_output_aliases = legacy_input_aliases

    class Meta:
        model = FunctionalAssessment
        fields = "__all__"
        read_only_fields = (*CORE_READ_ONLY_FIELDS, "patient_name", "therapist_name", "record_label")


class RehabilitationTreatmentPlanSerializer(LegacyAliasSerializerMixin, serializers.ModelSerializer):
    patient_name = serializers.CharField(source="patient.name", read_only=True)
    therapist_name = serializers.CharField(source="therapist.name", read_only=True)
    assessment_label = serializers.CharField(source="assessment.custom_id", read_only=True)
    prescription_label = serializers.CharField(source="prescription_item.custom_id", read_only=True)
    session_count = serializers.IntegerField(source="sessions.count", read_only=True)
    legacy_input_aliases = {
        **BASE_ALIASES,
        "avaliacao": "assessment",
        "avaliação": "assessment",
        "cardex": "medical_record",
        "prontuario": "medical_record",
        "prontuário": "medical_record",
        "prescricao_item": "prescription_item",
        "prescrição_item": "prescription_item",
        "item_prescricao": "prescription_item",
        "item_prescrição": "prescription_item",
        "data_inicio": "start_date",
        "data_início": "start_date",
        "data_fim": "end_date",
        "regiao": "body_region",
        "região": "body_region",
        "frequencia_semana": "frequency_per_week",
        "frequência_semana": "frequency_per_week",
        "sessoes_planeadas": "planned_sessions",
        "sessões_planeadas": "planned_sessions",
        "sessoes_realizadas": "completed_sessions",
        "sessões_realizadas": "completed_sessions",
        "progresso": "progress_percent",
        "objetivos": "objectives",
        "protocolo": "protocol",
        "programa_domiciliar": "home_program",
        "precaucoes": "precautions",
        "precauções": "precautions",
    }
    legacy_output_aliases = legacy_input_aliases

    class Meta:
        model = RehabilitationTreatmentPlan
        fields = "__all__"
        read_only_fields = (*CORE_READ_ONLY_FIELDS, "patient_name", "therapist_name", "assessment_label", "prescription_label", "session_count")


class TreatmentPlanInterventionSerializer(LegacyAliasSerializerMixin, serializers.ModelSerializer):
    plan_name = serializers.CharField(source="plan.name", read_only=True)
    device_name = serializers.CharField(source="device.name", read_only=True)
    legacy_input_aliases = {
        **BASE_ALIASES,
        "plano": "plan",
        "aparelho": "device",
        "tipo_intervencao": "intervention_type",
        "tipo_intervenção": "intervention_type",
        "regiao": "body_region",
        "região": "body_region",
        "descricao": "description",
        "descrição": "description",
        "dosagem": "dosage",
        "duracao_minutos": "duration_minutes",
        "duração_minutos": "duration_minutes",
        "repeticoes": "repetitions",
        "repetições": "repetitions",
        "series": "sets",
        "séries": "sets",
        "intensidade": "intensity",
        "instrucoes": "instructions",
        "instruções": "instructions",
        "posicao": "position",
        "posição": "position",
    }
    legacy_output_aliases = legacy_input_aliases

    class Meta:
        model = TreatmentPlanIntervention
        fields = "__all__"
        read_only_fields = (*CORE_READ_ONLY_FIELDS, "plan_name", "device_name")


class RehabilitationSessionSerializer(LegacyAliasSerializerMixin, serializers.ModelSerializer):
    plan_name = serializers.CharField(source="plan.name", read_only=True)
    patient_name = serializers.CharField(source="patient.name", read_only=True)
    therapist_name = serializers.CharField(source="therapist.name", read_only=True)
    legacy_input_aliases = {
        **BASE_ALIASES,
        "plano": "plan",
        "agendada_para": "scheduled_at",
        "iniciada_em": "started_at",
        "terminada_em": "ended_at",
        "duracao_minutos": "duration_minutes",
        "duração_minutos": "duration_minutes",
        "dor_antes": "pain_before",
        "dor_depois": "pain_after",
        "mobilidade": "mobility_score",
        "forca": "strength_score",
        "força": "strength_score",
        "equilibrio": "balance_score",
        "equilíbrio": "balance_score",
        "intervencoes_realizadas": "interventions_performed",
        "intervenções_realizadas": "interventions_performed",
        "resposta_paciente": "patient_response",
        "proximos_passos": "next_steps",
        "próximos_passos": "next_steps",
    }
    legacy_output_aliases = legacy_input_aliases

    class Meta:
        model = RehabilitationSession
        fields = "__all__"
        read_only_fields = (*CORE_READ_ONLY_FIELDS, "plan_name", "patient_name", "therapist_name")
        extra_kwargs = {
            "patient": {"required": False},
            "therapist": {"required": False},
        }


class RehabilitationProgressNoteSerializer(LegacyAliasSerializerMixin, serializers.ModelSerializer):
    plan_name = serializers.CharField(source="plan.name", read_only=True)
    session_label = serializers.CharField(source="session.custom_id", read_only=True)
    legacy_input_aliases = {
        **BASE_ALIASES,
        "plano": "plan",
        "sessao": "session",
        "sessão": "session",
        "registada_em": "recorded_at",
        "tendencia": "trend",
        "tendência": "trend",
        "pontuacao_funcional": "functional_score",
        "pontuação_funcional": "functional_score",
        "dor": "pain_score",
        "progresso": "progress_percent",
        "resumo": "summary",
        "recomendacoes": "recommendations",
        "recomendações": "recommendations",
    }
    legacy_output_aliases = legacy_input_aliases

    class Meta:
        model = RehabilitationProgressNote
        fields = "__all__"
        read_only_fields = (*CORE_READ_ONLY_FIELDS, "plan_name", "session_label")


class RehabilitationDeviceUsageSerializer(LegacyAliasSerializerMixin, serializers.ModelSerializer):
    session_label = serializers.CharField(source="session.custom_id", read_only=True)
    device_name = serializers.CharField(source="device.name", read_only=True)
    legacy_input_aliases = {
        **BASE_ALIASES,
        "sessao": "session",
        "sessão": "session",
        "aparelho": "device",
        "iniciado_em": "started_at",
        "terminado_em": "ended_at",
        "duracao_minutos": "duration_minutes",
        "duração_minutos": "duration_minutes",
        "configuracao": "settings",
        "configuração": "settings",
        "resultado": "outcome",
    }
    legacy_output_aliases = legacy_input_aliases

    class Meta:
        model = RehabilitationDeviceUsage
        fields = "__all__"
        read_only_fields = (*CORE_READ_ONLY_FIELDS, "session_label", "device_name")


SERIALIZER_MAP = {
    "device": PhysiotherapyDeviceSerializer,
    "assessment": FunctionalAssessmentSerializer,
    "treatment_plan": RehabilitationTreatmentPlanSerializer,
    "intervention": TreatmentPlanInterventionSerializer,
    "session": RehabilitationSessionSerializer,
    "progress_note": RehabilitationProgressNoteSerializer,
    "device_usage": RehabilitationDeviceUsageSerializer,
}
