from rest_framework import serializers

from api.v1.compat import LegacyAliasSerializerMixin
from apps.therapy.models import (
    TherapeuticResource,
    TherapyEvaluation,
    TherapyPlanGoal,
    TherapyPrescriptionLink,
    TherapyProgressNote,
    TherapySession,
    TherapyTreatmentPlan,
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
    "terapeuta": "therapist",
    "disciplina": "discipline",
}


class TherapeuticResourceSerializer(LegacyAliasSerializerMixin, serializers.ModelSerializer):
    legacy_input_aliases = {
        **BASE_ALIASES,
        "tipo_recurso": "resource_type",
        "fabricante": "manufacturer",
        "modelo": "model",
        "numero_serie": "serial_number",
        "número_série": "serial_number",
        "localizacao": "location",
        "localização": "location",
        "proxima_revisao": "next_review",
        "próxima_revisão": "next_review",
    }
    legacy_output_aliases = legacy_input_aliases

    class Meta:
        model = TherapeuticResource
        fields = "__all__"
        read_only_fields = CORE_READ_ONLY_FIELDS


class TherapyEvaluationSerializer(LegacyAliasSerializerMixin, serializers.ModelSerializer):
    patient_name = serializers.CharField(source="patient.name", read_only=True)
    therapist_name = serializers.CharField(source="therapist.name", read_only=True)
    record_label = serializers.CharField(source="medical_record.custom_id", read_only=True)
    prescription_label = serializers.CharField(source="prescription_item.custom_id", read_only=True)
    legacy_input_aliases = {
        **BASE_ALIASES,
        "consulta": "consultation",
        "cardex": "medical_record",
        "prontuario": "medical_record",
        "prontuário": "medical_record",
        "prescricao_item": "prescription_item",
        "prescrição_item": "prescription_item",
        "item_prescricao": "prescription_item",
        "item_prescrição": "prescription_item",
        "avaliada_em": "evaluated_at",
        "motivo_encaminhamento": "referral_reason",
        "diagnostico_clinico": "clinical_diagnosis",
        "diagnóstico_clínico": "clinical_diagnosis",
        "diagnostico_funcional": "functional_diagnosis",
        "diagnóstico_funcional": "functional_diagnosis",
        "instrumento_avaliacao": "outcome_measure",
        "instrumento_avaliação": "outcome_measure",
        "motricidade": "motor_score",
        "coordenacao": "coordination_score",
        "coordenação": "coordination_score",
        "sensorial": "sensory_score",
        "cognicao": "cognition_score",
        "cognição": "cognition_score",
        "comunicacao": "communication_score",
        "comunicação": "communication_score",
        "avd": "activities_daily_living_score",
        "atividades_vida_diaria": "activities_daily_living_score",
        "limitações": "limitations",
        "limitacoes": "limitations",
        "objetivos": "goals",
        "recomendacoes": "recommendations",
        "recomendações": "recommendations",
        "precaucoes": "precautions",
        "precauções": "precautions",
    }
    legacy_output_aliases = legacy_input_aliases

    class Meta:
        model = TherapyEvaluation
        fields = "__all__"
        read_only_fields = (*CORE_READ_ONLY_FIELDS, "patient_name", "therapist_name", "record_label", "prescription_label")


class TherapyTreatmentPlanSerializer(LegacyAliasSerializerMixin, serializers.ModelSerializer):
    patient_name = serializers.CharField(source="patient.name", read_only=True)
    therapist_name = serializers.CharField(source="therapist.name", read_only=True)
    evaluation_label = serializers.CharField(source="evaluation.custom_id", read_only=True)
    prescription_label = serializers.CharField(source="prescription_item.custom_id", read_only=True)
    session_count = serializers.IntegerField(source="sessions.count", read_only=True)
    legacy_input_aliases = {
        **BASE_ALIASES,
        "avaliacao": "evaluation",
        "avaliação": "evaluation",
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
        "frequencia_semana": "frequency_per_week",
        "frequência_semana": "frequency_per_week",
        "sessoes_planeadas": "planned_sessions",
        "sessões_planeadas": "planned_sessions",
        "sessoes_realizadas": "completed_sessions",
        "sessões_realizadas": "completed_sessions",
        "progresso": "progress_percent",
        "objetivos": "objectives",
        "estrategia_intervencao": "intervention_strategy",
        "estratégia_intervenção": "intervention_strategy",
        "programa_domiciliar": "home_program",
        "tecnologia_assistiva": "assistive_technology",
        "notas_prescricao": "prescription_notes",
        "notas_prescrição": "prescription_notes",
        "precaucoes": "precautions",
        "precauções": "precautions",
    }
    legacy_output_aliases = legacy_input_aliases

    class Meta:
        model = TherapyTreatmentPlan
        fields = "__all__"
        read_only_fields = (
            *CORE_READ_ONLY_FIELDS,
            "patient_name",
            "therapist_name",
            "evaluation_label",
            "prescription_label",
            "session_count",
        )


class TherapyPlanGoalSerializer(LegacyAliasSerializerMixin, serializers.ModelSerializer):
    plan_name = serializers.CharField(source="plan.name", read_only=True)
    legacy_input_aliases = {
        **BASE_ALIASES,
        "plano": "plan",
        "dominio": "domain",
        "domínio": "domain",
        "descricao": "description",
        "descrição": "description",
        "meta": "target",
        "pontuacao_inicial": "baseline_score",
        "pontuação_inicial": "baseline_score",
        "pontuacao_alvo": "target_score",
        "pontuação_alvo": "target_score",
        "pontuacao_atual": "current_score",
        "pontuação_atual": "current_score",
        "posicao": "position",
        "posição": "position",
    }
    legacy_output_aliases = legacy_input_aliases

    class Meta:
        model = TherapyPlanGoal
        fields = "__all__"
        read_only_fields = (*CORE_READ_ONLY_FIELDS, "plan_name")


class TherapySessionSerializer(LegacyAliasSerializerMixin, serializers.ModelSerializer):
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
        "motricidade": "motor_score",
        "funcao": "functional_score",
        "função": "functional_score",
        "comunicacao": "communication_score",
        "comunicação": "communication_score",
        "intervencoes_realizadas": "interventions_performed",
        "intervenções_realizadas": "interventions_performed",
        "resposta_paciente": "patient_response",
        "orientacao_domiciliar": "home_guidance",
        "orientação_domiciliar": "home_guidance",
        "proximos_passos": "next_steps",
        "próximos_passos": "next_steps",
    }
    legacy_output_aliases = legacy_input_aliases

    class Meta:
        model = TherapySession
        fields = "__all__"
        read_only_fields = (*CORE_READ_ONLY_FIELDS, "plan_name", "patient_name", "therapist_name")
        extra_kwargs = {
            "patient": {"required": False},
            "therapist": {"required": False},
        }


class TherapyProgressNoteSerializer(LegacyAliasSerializerMixin, serializers.ModelSerializer):
    plan_name = serializers.CharField(source="plan.name", read_only=True)
    session_label = serializers.CharField(source="session.custom_id", read_only=True)
    legacy_input_aliases = {
        **BASE_ALIASES,
        "plano": "plan",
        "sessao": "session",
        "sessão": "session",
        "registada_em": "recorded_at",
        "dominio": "domain",
        "domínio": "domain",
        "tendencia": "trend",
        "tendência": "trend",
        "funcao": "functional_score",
        "função": "functional_score",
        "motricidade": "motor_score",
        "comunicacao": "communication_score",
        "comunicação": "communication_score",
        "progresso": "progress_percent",
        "resumo": "summary",
        "recomendacoes": "recommendations",
        "recomendações": "recommendations",
    }
    legacy_output_aliases = legacy_input_aliases

    class Meta:
        model = TherapyProgressNote
        fields = "__all__"
        read_only_fields = (*CORE_READ_ONLY_FIELDS, "plan_name", "session_label")


class TherapyPrescriptionLinkSerializer(LegacyAliasSerializerMixin, serializers.ModelSerializer):
    patient_name = serializers.CharField(source="patient.name", read_only=True)
    plan_name = serializers.CharField(source="plan.name", read_only=True)
    prescription_label = serializers.CharField(source="prescription_item.custom_id", read_only=True)
    legacy_input_aliases = {
        **BASE_ALIASES,
        "prescricao_item": "prescription_item",
        "prescrição_item": "prescription_item",
        "item_prescricao": "prescription_item",
        "item_prescrição": "prescription_item",
        "plano": "plan",
        "prioridade": "priority",
        "servico_prescrito": "requested_service",
        "serviço_prescrito": "requested_service",
        "sessoes_solicitadas": "requested_sessions",
        "sessões_solicitadas": "requested_sessions",
        "solicitada_em": "requested_at",
    }
    legacy_output_aliases = legacy_input_aliases

    class Meta:
        model = TherapyPrescriptionLink
        fields = "__all__"
        read_only_fields = (*CORE_READ_ONLY_FIELDS, "patient_name", "plan_name", "prescription_label")


SERIALIZER_MAP = {
    "resource": TherapeuticResourceSerializer,
    "evaluation": TherapyEvaluationSerializer,
    "treatment_plan": TherapyTreatmentPlanSerializer,
    "goal": TherapyPlanGoalSerializer,
    "session": TherapySessionSerializer,
    "progress_note": TherapyProgressNoteSerializer,
    "prescription_link": TherapyPrescriptionLinkSerializer,
}
