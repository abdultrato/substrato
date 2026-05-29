from rest_framework import serializers

from api.v1.compat import LegacyAliasSerializerMixin
from apps.telemedicine.models import (
    ChronicMonitoringProgram,
    RemoteClinicalAlert,
    RemoteMonitoringDevice,
    RemoteVitalReading,
    StoreAndForwardCase,
    TelemedicineWaitingRoomEntry,
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
    "estado": "status",
    "situacao": "status",
    "situação": "status",
    "observacoes": "notes",
    "observações": "notes",
    "notas": "notes",
    "paciente": "patient",
    "consulta": "consultation",
    "dispositivo": "device",
    "programa": "program",
    "leitura": "reading",
}


class TelemedicineWaitingRoomEntrySerializer(LegacyAliasSerializerMixin, serializers.ModelSerializer):
    patient_name = serializers.CharField(source="patient.name", read_only=True)
    clinician_name = serializers.CharField(source="clinician.name", read_only=True)
    consultation_label = serializers.CharField(source="consultation.custom_id", read_only=True)
    legacy_input_aliases = {
        **BASE_ALIASES,
        "clinico": "clinician",
        "clínico": "clinician",
        "prioridade": "priority",
        "posicao_fila": "queue_position",
        "posição_fila": "queue_position",
        "entrada_em": "check_in_at",
        "triagem_iniciada_em": "triage_started_at",
        "triagem_concluida_em": "triage_completed_at",
        "triagem_concluída_em": "triage_completed_at",
        "previsao_inicio": "estimated_start_at",
        "previsão_início": "estimated_start_at",
        "chamada_iniciada_em": "call_started_at",
        "concluida_em": "completed_at",
        "concluída_em": "completed_at",
        "queixa_principal": "chief_complaint",
        "sintomas_preliminares": "preliminary_symptoms",
        "notas_triagem": "triage_notes",
        "teste_dispositivo_aprovado": "device_check_passed",
        "consentimento_confirmado": "consent_confirmed",
        "sala_virtual": "video_room_url",
        "token_acesso": "access_token",
    }
    legacy_output_aliases = legacy_input_aliases

    class Meta:
        model = TelemedicineWaitingRoomEntry
        fields = "__all__"
        read_only_fields = (*CORE_READ_ONLY_FIELDS, "patient_name", "clinician_name", "consultation_label")
        extra_kwargs = {"patient": {"required": False}}


class RemoteMonitoringDeviceSerializer(LegacyAliasSerializerMixin, serializers.ModelSerializer):
    patient_name = serializers.CharField(source="patient.name", read_only=True)
    reading_count = serializers.IntegerField(source="readings.count", read_only=True)
    legacy_input_aliases = {
        **BASE_ALIASES,
        "tipo_dispositivo": "device_type",
        "fabricante": "manufacturer",
        "modelo": "model_name",
        "numero_serie": "serial_number",
        "número_série": "serial_number",
        "id_externo": "external_device_id",
        "pareado_em": "paired_at",
        "ultima_sincronizacao": "last_sync_at",
        "última_sincronização": "last_sync_at",
        "bateria": "battery_percent",
    }
    legacy_output_aliases = legacy_input_aliases

    class Meta:
        model = RemoteMonitoringDevice
        fields = "__all__"
        read_only_fields = (*CORE_READ_ONLY_FIELDS, "patient_name", "reading_count")


class RemoteVitalReadingSerializer(LegacyAliasSerializerMixin, serializers.ModelSerializer):
    patient_name = serializers.CharField(source="patient.name", read_only=True)
    device_label = serializers.CharField(source="device.serial_number", read_only=True)
    has_critical_value = serializers.BooleanField(read_only=True)
    legacy_input_aliases = {
        **BASE_ALIASES,
        "medido_em": "measured_at",
        "recebido_em": "received_at",
        "fonte": "source",
        "pressao_sistolica": "systolic_bp",
        "pressão_sistólica": "systolic_bp",
        "pressao_diastolica": "diastolic_bp",
        "pressão_diastólica": "diastolic_bp",
        "glicemia": "glucose_mg_dl",
        "spo2": "spo2_percent",
        "frequencia_cardiaca": "heart_rate_bpm",
        "frequência_cardíaca": "heart_rate_bpm",
        "frequencia_respiratoria": "respiratory_rate",
        "frequência_respiratória": "respiratory_rate",
        "temperatura": "temperature_c",
        "peso": "weight_kg",
        "pico_fluxo": "peak_flow_l_min",
        "payload_bruto": "raw_payload",
    }
    legacy_output_aliases = legacy_input_aliases

    class Meta:
        model = RemoteVitalReading
        fields = "__all__"
        read_only_fields = (*CORE_READ_ONLY_FIELDS, "patient_name", "device_label", "has_critical_value")
        extra_kwargs = {"patient": {"required": False}}


class StoreAndForwardCaseSerializer(LegacyAliasSerializerMixin, serializers.ModelSerializer):
    patient_name = serializers.CharField(source="patient.name", read_only=True)
    consultation_label = serializers.CharField(source="consultation.custom_id", read_only=True)
    reviewer_name = serializers.CharField(source="reviewer.name", read_only=True)
    legacy_input_aliases = {
        **BASE_ALIASES,
        "solicitado_por": "requested_by",
        "revisor": "reviewer",
        "area": "specialty_area",
        "área": "specialty_area",
        "submetido_em": "submitted_at",
        "revisto_em": "reviewed_at",
        "titulo": "title",
        "título": "title",
        "pergunta_clinica": "clinical_question",
        "pergunta_clínica": "clinical_question",
        "resumo_clinico": "clinical_summary",
        "resumo_clínico": "clinical_summary",
        "ficheiros": "media_manifest",
        "arquivos": "media_manifest",
        "achados": "findings",
        "recomendacao": "recommendation",
        "recomendação": "recommendation",
    }
    legacy_output_aliases = legacy_input_aliases

    class Meta:
        model = StoreAndForwardCase
        fields = "__all__"
        read_only_fields = (*CORE_READ_ONLY_FIELDS, "patient_name", "consultation_label", "reviewer_name")
        extra_kwargs = {"patient": {"required": False}}


class ChronicMonitoringProgramSerializer(LegacyAliasSerializerMixin, serializers.ModelSerializer):
    patient_name = serializers.CharField(source="patient.name", read_only=True)
    care_manager_name = serializers.CharField(source="care_manager.name", read_only=True)
    alert_count = serializers.IntegerField(source="alerts.count", read_only=True)
    legacy_input_aliases = {
        **BASE_ALIASES,
        "gestor_clinico": "care_manager",
        "gestor_clínico": "care_manager",
        "condicao": "condition",
        "condição": "condition",
        "inicio": "start_date",
        "início": "start_date",
        "fim": "end_date",
        "frequencia_revisao_dias": "review_frequency_days",
        "frequência_revisão_dias": "review_frequency_days",
        "proxima_revisao": "next_review_date",
        "próxima_revisão": "next_review_date",
        "pa_sistolica_maxima": "target_systolic_max",
        "pa_sistólica_máxima": "target_systolic_max",
        "pa_diastolica_maxima": "target_diastolic_max",
        "pa_diastólica_máxima": "target_diastolic_max",
        "glicemia_minima": "target_glucose_min",
        "glicemia_mínima": "target_glucose_min",
        "glicemia_maxima": "target_glucose_max",
        "glicemia_máxima": "target_glucose_max",
        "spo2_minima": "target_spo2_min",
        "spo2_mínima": "target_spo2_min",
        "plano_cuidado": "care_plan",
        "protocolo_escalonamento": "escalation_protocol",
    }
    legacy_output_aliases = legacy_input_aliases

    class Meta:
        model = ChronicMonitoringProgram
        fields = "__all__"
        read_only_fields = (*CORE_READ_ONLY_FIELDS, "patient_name", "care_manager_name", "alert_count")


class RemoteClinicalAlertSerializer(LegacyAliasSerializerMixin, serializers.ModelSerializer):
    patient_name = serializers.CharField(source="patient.name", read_only=True)
    device_label = serializers.CharField(source="device.serial_number", read_only=True)
    program_label = serializers.CharField(source="program.custom_id", read_only=True)
    acknowledged_by_name = serializers.CharField(source="acknowledged_by.name", read_only=True)
    resolved_by_name = serializers.CharField(source="resolved_by.name", read_only=True)
    legacy_input_aliases = {
        **BASE_ALIASES,
        "tipo_alerta": "alert_type",
        "severidade": "severity",
        "disparado_em": "triggered_at",
        "reconhecido_em": "acknowledged_at",
        "resolvido_em": "resolved_at",
        "reconhecido_por": "acknowledged_by",
        "resolvido_por": "resolved_by",
        "mensagem": "message",
        "acao_recomendada": "recommended_action",
        "ação_recomendada": "recommended_action",
        "conduta": "action_taken",
    }
    legacy_output_aliases = legacy_input_aliases

    class Meta:
        model = RemoteClinicalAlert
        fields = "__all__"
        read_only_fields = (
            *CORE_READ_ONLY_FIELDS,
            "patient_name",
            "device_label",
            "program_label",
            "acknowledged_by_name",
            "resolved_by_name",
        )
        extra_kwargs = {"patient": {"required": False}}


SERIALIZER_MAP = {
    "waiting_room": TelemedicineWaitingRoomEntrySerializer,
    "device": RemoteMonitoringDeviceSerializer,
    "vital_reading": RemoteVitalReadingSerializer,
    "async_case": StoreAndForwardCaseSerializer,
    "program": ChronicMonitoringProgramSerializer,
    "alert": RemoteClinicalAlertSerializer,
}
