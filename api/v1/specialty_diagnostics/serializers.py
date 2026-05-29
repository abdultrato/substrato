from rest_framework import serializers

from api.v1.compat import LegacyAliasSerializerMixin
from apps.specialty_diagnostics.models import (
    SpecialtyDiagnosticEquipment,
    SpecialtyDiagnosticIntegrationEvent,
    SpecialtyDiagnosticMeasurement,
    SpecialtyDiagnosticOrder,
    SpecialtyDiagnosticProtocol,
    SpecialtyDiagnosticReport,
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
    "especialidade": "specialty",
    "modalidade": "modality",
}


class SpecialtyDiagnosticEquipmentSerializer(LegacyAliasSerializerMixin, serializers.ModelSerializer):
    legacy_input_aliases = {
        **BASE_ALIASES,
        "fabricante": "manufacturer",
        "modelo": "model",
        "numero_serie": "serial_number",
        "número_série": "serial_number",
        "estacao": "station_name",
        "estação": "station_name",
        "localizacao": "location",
        "localização": "location",
        "endpoint_integracao": "integration_endpoint",
        "endpoint_integração": "integration_endpoint",
        "ultimo_controlo_qualidade": "last_quality_control",
        "último_controlo_qualidade": "last_quality_control",
        "proximo_controlo_qualidade": "next_quality_control",
        "próximo_controlo_qualidade": "next_quality_control",
    }
    legacy_output_aliases = legacy_input_aliases

    class Meta:
        model = SpecialtyDiagnosticEquipment
        fields = "__all__"
        read_only_fields = CORE_READ_ONLY_FIELDS


class SpecialtyDiagnosticProtocolSerializer(LegacyAliasSerializerMixin, serializers.ModelSerializer):
    legacy_input_aliases = {
        **BASE_ALIASES,
        "duracao_tipica_minutos": "typical_duration_minutes",
        "duração_típica_minutos": "typical_duration_minutes",
        "preparacao": "preparation",
        "preparação": "preparation",
        "instrucoes_execucao": "acquisition_instructions",
        "instruções_execução": "acquisition_instructions",
        "medicoes_padrao": "default_measurements",
        "medições_padrão": "default_measurements",
        "modelo_laudo": "default_report_template",
        "modelo_relatorio": "default_report_template",
    }
    legacy_output_aliases = legacy_input_aliases

    class Meta:
        model = SpecialtyDiagnosticProtocol
        fields = "__all__"
        read_only_fields = CORE_READ_ONLY_FIELDS


class SpecialtyDiagnosticOrderSerializer(LegacyAliasSerializerMixin, serializers.ModelSerializer):
    patient_name = serializers.CharField(source="patient.name", read_only=True)
    protocol_name = serializers.CharField(source="protocol.name", read_only=True)
    equipment_name = serializers.CharField(source="equipment.name", read_only=True)
    specialist_name = serializers.CharField(source="specialist.name", read_only=True)
    record_label = serializers.CharField(source="medical_record.custom_id", read_only=True)
    measurement_count = serializers.IntegerField(source="measurements.count", read_only=True)
    report_count = serializers.IntegerField(source="reports.count", read_only=True)
    legacy_input_aliases = {
        **BASE_ALIASES,
        "medico_requisitante": "requesting_doctor",
        "médico_requisitante": "requesting_doctor",
        "especialista": "specialist",
        "consulta": "consultation",
        "cardex": "medical_record",
        "prontuario": "medical_record",
        "prontuário": "medical_record",
        "prescricao_item": "prescription_item",
        "prescrição_item": "prescription_item",
        "item_prescricao": "prescription_item",
        "item_prescrição": "prescription_item",
        "protocolo": "protocol",
        "equipamento": "equipment",
        "numero_exame": "order_number",
        "número_exame": "order_number",
        "id_externo": "external_order_id",
        "prioridade": "priority",
        "indicacao_clinica": "clinical_indication",
        "indicação_clínica": "clinical_indication",
        "solicitado_em": "requested_at",
        "agendado_para": "scheduled_at",
        "iniciado_em": "started_at",
        "realizado_em": "performed_at",
        "concluido_em": "completed_at",
        "concluído_em": "completed_at",
        "notas_preparacao": "preparation_notes",
        "notas_preparação": "preparation_notes",
        "notas_execucao": "acquisition_notes",
        "notas_execução": "acquisition_notes",
        "medicoes_completas": "measurements_complete",
        "medições_completas": "measurements_complete",
        "laudo_disponivel": "report_available",
        "laudo_disponível": "report_available",
    }
    legacy_output_aliases = legacy_input_aliases

    class Meta:
        model = SpecialtyDiagnosticOrder
        fields = "__all__"
        read_only_fields = (
            *CORE_READ_ONLY_FIELDS,
            "patient_name",
            "protocol_name",
            "equipment_name",
            "specialist_name",
            "record_label",
            "measurement_count",
            "report_count",
        )


class SpecialtyDiagnosticMeasurementSerializer(LegacyAliasSerializerMixin, serializers.ModelSerializer):
    order_label = serializers.CharField(source="order.order_number", read_only=True)
    patient_name = serializers.CharField(source="order.patient.name", read_only=True)
    specialty = serializers.CharField(source="order.specialty", read_only=True)
    modality = serializers.CharField(source="order.modality", read_only=True)
    legacy_input_aliases = {
        **BASE_ALIASES,
        "exame": "order",
        "pedido": "order",
        "tipo_valor": "value_type",
        "valor_numerico": "numeric_value",
        "valor_numérico": "numeric_value",
        "valor_textual": "text_value",
        "unidade": "unit",
        "intervalo_referencia": "reference_range",
        "intervalo_referência": "reference_range",
        "interpretacao": "interpretation",
        "interpretação": "interpretation",
        "alterado": "abnormal",
        "critico": "critical",
        "crítico": "critical",
        "medido_em": "measured_at",
    }
    legacy_output_aliases = legacy_input_aliases

    class Meta:
        model = SpecialtyDiagnosticMeasurement
        fields = "__all__"
        read_only_fields = (*CORE_READ_ONLY_FIELDS, "order_label", "patient_name", "specialty", "modality")


class SpecialtyDiagnosticReportSerializer(LegacyAliasSerializerMixin, serializers.ModelSerializer):
    order_label = serializers.CharField(source="order.order_number", read_only=True)
    patient_name = serializers.CharField(source="order.patient.name", read_only=True)
    specialty = serializers.CharField(source="order.specialty", read_only=True)
    modality = serializers.CharField(source="order.modality", read_only=True)
    specialist_name = serializers.CharField(source="specialist.name", read_only=True)
    legacy_input_aliases = {
        **BASE_ALIASES,
        "exame": "order",
        "pedido": "order",
        "especialista": "specialist",
        "versao": "version_number",
        "versão": "version_number",
        "laudado_em": "reported_at",
        "assinado_em": "signed_at",
        "tecnica": "technique",
        "técnica": "technique",
        "achados": "findings",
        "conclusao": "impression",
        "conclusão": "impression",
        "impressao": "impression",
        "impressão": "impression",
        "recomendacoes": "recommendations",
        "recomendações": "recommendations",
        "resultado_critico": "critical_result",
        "resultado_crítico": "critical_result",
        "critico_notificado_em": "critical_notified_at",
        "crítico_notificado_em": "critical_notified_at",
        "ficheiro_laudo": "report_file",
        "arquivo_laudo": "report_file",
    }
    legacy_output_aliases = legacy_input_aliases

    class Meta:
        model = SpecialtyDiagnosticReport
        fields = "__all__"
        read_only_fields = (*CORE_READ_ONLY_FIELDS, "order_label", "patient_name", "specialty", "modality", "specialist_name")


class SpecialtyDiagnosticIntegrationEventSerializer(LegacyAliasSerializerMixin, serializers.ModelSerializer):
    order_label = serializers.CharField(source="order.order_number", read_only=True)
    equipment_name = serializers.CharField(source="equipment.name", read_only=True)
    legacy_input_aliases = {
        **BASE_ALIASES,
        "exame": "order",
        "pedido": "order",
        "equipamento": "equipment",
        "tipo_evento": "event_type",
        "direcao": "direction",
        "direção": "direction",
        "sistema_externo": "external_system",
        "numero_exame": "order_number",
        "número_exame": "order_number",
        "id_externo": "external_order_id",
        "id_mensagem": "message_control_id",
        "evento_em": "event_at",
        "resposta": "response",
        "mensagem_erro": "error_message",
        "tentativas": "retry_count",
    }
    legacy_output_aliases = legacy_input_aliases

    class Meta:
        model = SpecialtyDiagnosticIntegrationEvent
        fields = "__all__"
        read_only_fields = (*CORE_READ_ONLY_FIELDS, "order_label", "equipment_name")


SERIALIZER_MAP = {
    "equipment": SpecialtyDiagnosticEquipmentSerializer,
    "protocol": SpecialtyDiagnosticProtocolSerializer,
    "order": SpecialtyDiagnosticOrderSerializer,
    "measurement": SpecialtyDiagnosticMeasurementSerializer,
    "report": SpecialtyDiagnosticReportSerializer,
    "integration_event": SpecialtyDiagnosticIntegrationEventSerializer,
}
