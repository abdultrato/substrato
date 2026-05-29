from rest_framework import serializers

from api.v1.compat import LegacyAliasSerializerMixin
from apps.radiology.models import (
    ImagingEquipment,
    ImagingFile,
    ImagingProtocol,
    ImagingReport,
    ImagingSeries,
    ImagingStudy,
    PacsIntegrationEvent,
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
    "modalidade": "modality",
    "regiao": "body_region",
    "região": "body_region",
}


class ImagingEquipmentSerializer(LegacyAliasSerializerMixin, serializers.ModelSerializer):
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
        "endpoint_pacs": "pacs_endpoint",
        "ultimo_controlo_qualidade": "last_quality_control",
        "último_controlo_qualidade": "last_quality_control",
        "proximo_controlo_qualidade": "next_quality_control",
        "próximo_controlo_qualidade": "next_quality_control",
    }
    legacy_output_aliases = legacy_input_aliases

    class Meta:
        model = ImagingEquipment
        fields = "__all__"
        read_only_fields = CORE_READ_ONLY_FIELDS


class ImagingProtocolSerializer(LegacyAliasSerializerMixin, serializers.ModelSerializer):
    legacy_input_aliases = {
        **BASE_ALIASES,
        "requer_contraste": "contrast_required",
        "duracao_tipica_minutos": "typical_duration_minutes",
        "duração_típica_minutos": "typical_duration_minutes",
        "preparacao": "preparation",
        "preparação": "preparation",
        "instrucoes_aquisicao": "acquisition_instructions",
        "instruções_aquisição": "acquisition_instructions",
        "modelo_laudo": "default_report_template",
        "modelo_relatorio": "default_report_template",
    }
    legacy_output_aliases = legacy_input_aliases

    class Meta:
        model = ImagingProtocol
        fields = "__all__"
        read_only_fields = CORE_READ_ONLY_FIELDS


class ImagingStudySerializer(LegacyAliasSerializerMixin, serializers.ModelSerializer):
    patient_name = serializers.CharField(source="patient.name", read_only=True)
    protocol_name = serializers.CharField(source="protocol.name", read_only=True)
    equipment_name = serializers.CharField(source="equipment.name", read_only=True)
    radiologist_name = serializers.CharField(source="radiologist.name", read_only=True)
    record_label = serializers.CharField(source="medical_record.custom_id", read_only=True)
    report_count = serializers.IntegerField(source="reports.count", read_only=True)
    series_count = serializers.IntegerField(source="series.count", read_only=True)
    legacy_input_aliases = {
        **BASE_ALIASES,
        "medico_requisitante": "requesting_doctor",
        "médico_requisitante": "requesting_doctor",
        "radiologista": "radiologist",
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
        "numero_acesso": "accession_number",
        "número_acesso": "accession_number",
        "uid_estudo": "study_instance_uid",
        "prioridade": "priority",
        "indicacao_clinica": "clinical_indication",
        "indicação_clínica": "clinical_indication",
        "solicitado_em": "requested_at",
        "agendado_para": "scheduled_at",
        "iniciado_em": "started_at",
        "adquirido_em": "acquired_at",
        "concluido_em": "completed_at",
        "concluído_em": "completed_at",
        "contraste_usado": "contrast_used",
        "detalhes_contraste": "contrast_details",
        "imagens_disponiveis": "images_available",
        "imagens_disponíveis": "images_available",
        "numero_imagens": "image_count",
        "número_imagens": "image_count",
        "armazenamento": "storage_uri",
    }
    legacy_output_aliases = legacy_input_aliases

    class Meta:
        model = ImagingStudy
        fields = "__all__"
        read_only_fields = (
            *CORE_READ_ONLY_FIELDS,
            "patient_name",
            "protocol_name",
            "equipment_name",
            "radiologist_name",
            "record_label",
            "report_count",
            "series_count",
        )


class ImagingSeriesSerializer(LegacyAliasSerializerMixin, serializers.ModelSerializer):
    study_label = serializers.CharField(source="study.accession_number", read_only=True)
    patient_name = serializers.CharField(source="study.patient.name", read_only=True)
    legacy_input_aliases = {
        **BASE_ALIASES,
        "estudo": "study",
        "uid_serie": "series_instance_uid",
        "uid_série": "series_instance_uid",
        "numero_serie": "series_number",
        "número_série": "series_number",
        "descricao": "description",
        "descrição": "description",
        "numero_imagens": "image_count",
        "número_imagens": "image_count",
        "armazenamento": "storage_uri",
        "aquisicao_iniciada_em": "acquisition_started_at",
        "aquisição_iniciada_em": "acquisition_started_at",
        "aquisicao_concluida_em": "acquisition_completed_at",
        "aquisição_concluída_em": "acquisition_completed_at",
    }
    legacy_output_aliases = legacy_input_aliases

    class Meta:
        model = ImagingSeries
        fields = "__all__"
        read_only_fields = (*CORE_READ_ONLY_FIELDS, "study_label", "patient_name")


class ImagingFileSerializer(LegacyAliasSerializerMixin, serializers.ModelSerializer):
    study_label = serializers.CharField(source="study.accession_number", read_only=True)
    series_label = serializers.CharField(source="series.series_instance_uid", read_only=True)
    legacy_input_aliases = {
        **BASE_ALIASES,
        "estudo": "study",
        "serie": "series",
        "série": "series",
        "tipo_ficheiro": "file_type",
        "tipo_arquivo": "file_type",
        "ficheiro": "file",
        "arquivo": "file",
        "uri_pacs": "pacs_object_uri",
        "uid_sop": "sop_instance_uid",
        "tipo_conteudo": "content_type",
        "tipo_conteúdo": "content_type",
        "tamanho_ficheiro": "file_size",
        "tamanho_arquivo": "file_size",
        "numero_imagem": "image_number",
        "número_imagem": "image_number",
    }
    legacy_output_aliases = legacy_input_aliases

    class Meta:
        model = ImagingFile
        fields = "__all__"
        read_only_fields = (*CORE_READ_ONLY_FIELDS, "study_label", "series_label")


class ImagingReportSerializer(LegacyAliasSerializerMixin, serializers.ModelSerializer):
    study_label = serializers.CharField(source="study.accession_number", read_only=True)
    patient_name = serializers.CharField(source="study.patient.name", read_only=True)
    radiologist_name = serializers.CharField(source="radiologist.name", read_only=True)
    legacy_input_aliases = {
        **BASE_ALIASES,
        "estudo": "study",
        "radiologista": "radiologist",
        "versao": "version_number",
        "versão": "version_number",
        "laudado_em": "reported_at",
        "assinado_em": "signed_at",
        "modelo_usado": "template_used",
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
        model = ImagingReport
        fields = "__all__"
        read_only_fields = (*CORE_READ_ONLY_FIELDS, "study_label", "patient_name", "radiologist_name")


class PacsIntegrationEventSerializer(LegacyAliasSerializerMixin, serializers.ModelSerializer):
    study_label = serializers.CharField(source="study.accession_number", read_only=True)
    equipment_name = serializers.CharField(source="equipment.name", read_only=True)
    legacy_input_aliases = {
        **BASE_ALIASES,
        "estudo": "study",
        "equipamento": "equipment",
        "tipo_evento": "event_type",
        "direcao": "direction",
        "direção": "direction",
        "sistema_externo": "external_system",
        "numero_acesso": "accession_number",
        "número_acesso": "accession_number",
        "uid_estudo": "study_instance_uid",
        "id_mensagem": "message_control_id",
        "evento_em": "event_at",
        "resposta": "response",
        "mensagem_erro": "error_message",
        "tentativas": "retry_count",
    }
    legacy_output_aliases = legacy_input_aliases

    class Meta:
        model = PacsIntegrationEvent
        fields = "__all__"
        read_only_fields = (*CORE_READ_ONLY_FIELDS, "study_label", "equipment_name")


SERIALIZER_MAP = {
    "equipment": ImagingEquipmentSerializer,
    "protocol": ImagingProtocolSerializer,
    "study": ImagingStudySerializer,
    "series": ImagingSeriesSerializer,
    "file": ImagingFileSerializer,
    "report": ImagingReportSerializer,
    "pacs_event": PacsIntegrationEventSerializer,
}
