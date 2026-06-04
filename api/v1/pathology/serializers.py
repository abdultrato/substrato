from rest_framework import serializers

from api.v1.compat import LegacyAliasSerializerMixin
from apps.pathology.models import (
    PathologyArchive,
    PathologyCytologyCase,
    PathologyGrossExamination,
    PathologyHistologySlide,
    PathologyImmunohistochemistry,
    PathologyProcessing,
    PathologyReport,
    PathologySampleReception,
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
    "estado": "status",
    "situacao": "status",
    "situação": "status",
    "observacoes": "notes",
    "observações": "notes",
    "notas": "notes",
    "paciente": "patient",
    "amostra": "sample",
    "patologista": "pathologist",
    "tecnico": "processor",
    "técnico": "processor",
}


class PathologySampleReceptionSerializer(LegacyAliasSerializerMixin, serializers.ModelSerializer):
    patient_name = serializers.CharField(source="patient.name", read_only=True)
    lab_request_code = serializers.CharField(source="lab_request.custom_id", read_only=True)
    surgery_code = serializers.CharField(source="surgery.custom_id", read_only=True)
    received_by_name = serializers.CharField(source="received_by.name", read_only=True)
    legacy_input_aliases = {
        **BASE_ALIASES,
        "requisicao": "lab_request",
        "requisição": "lab_request",
        "cirurgia": "surgery",
        "recebido_por": "received_by",
        "numero_patologia": "accession_number",
        "número_patologia": "accession_number",
        "origem": "source",
        "tipo_amostra": "specimen_type",
        "sitio_anatomico": "anatomical_site",
        "sítio_anatómico": "anatomical_site",
        "recipientes": "container_count",
        "fixador": "fixation_type",
        "prioridade": "priority",
        "recebida_em": "received_at",
        "aceite_em": "accepted_at",
        "rejeitada_em": "rejected_at",
        "motivo_rejeicao": "rejection_reason",
        "historia_clinica": "clinical_history",
    }
    legacy_output_aliases = legacy_input_aliases

    class Meta:
        model = PathologySampleReception
        fields = "__all__"
        read_only_fields = (*CORE_READ_ONLY_FIELDS, "patient_name", "lab_request_code", "surgery_code", "received_by_name")


class PathologyGrossExaminationSerializer(LegacyAliasSerializerMixin, serializers.ModelSerializer):
    sample_label = serializers.CharField(source="sample.accession_number", read_only=True)
    pathologist_name = serializers.CharField(source="pathologist.name", read_only=True)
    legacy_input_aliases = {
        **BASE_ALIASES,
        "realizada_em": "performed_at",
        "peso_g": "specimen_weight_g",
        "dimensoes": "dimensions",
        "dimensões": "dimensions",
        "fragmentos": "fragment_count",
        "cassetes": "cassette_count",
        "descricao_macroscopica": "gross_description",
    }
    legacy_output_aliases = legacy_input_aliases

    class Meta:
        model = PathologyGrossExamination
        fields = "__all__"
        read_only_fields = (*CORE_READ_ONLY_FIELDS, "sample_label", "pathologist_name")


class PathologyProcessingSerializer(LegacyAliasSerializerMixin, serializers.ModelSerializer):
    sample_label = serializers.CharField(source="sample.accession_number", read_only=True)
    processor_name = serializers.CharField(source="processor.name", read_only=True)
    legacy_input_aliases = {
        **BASE_ALIASES,
        "lote": "batch_number",
        "protocolo": "protocol",
        "processador": "processor_machine",
        "cassetes": "cassette_count",
        "iniciado_em": "started_at",
        "concluido_em": "completed_at",
        "concluído_em": "completed_at",
        "reagentes": "reagents",
    }
    legacy_output_aliases = legacy_input_aliases

    class Meta:
        model = PathologyProcessing
        fields = "__all__"
        read_only_fields = (*CORE_READ_ONLY_FIELDS, "sample_label", "processor_name")


class PathologyHistologySlideSerializer(LegacyAliasSerializerMixin, serializers.ModelSerializer):
    sample_label = serializers.CharField(source="sample.accession_number", read_only=True)
    prepared_by_name = serializers.CharField(source="prepared_by.name", read_only=True)
    legacy_input_aliases = {
        **BASE_ALIASES,
        "processamento": "processing",
        "preparada_por": "prepared_by",
        "numero_lamina": "slide_number",
        "número_lâmina": "slide_number",
        "numero_bloco": "block_number",
        "coloracao": "stain",
        "coloração": "stain",
        "preparada_em": "prepared_at",
        "qualidade": "quality",
    }
    legacy_output_aliases = legacy_input_aliases

    class Meta:
        model = PathologyHistologySlide
        fields = "__all__"
        read_only_fields = (*CORE_READ_ONLY_FIELDS, "sample_label", "prepared_by_name")


class PathologyCytologyCaseSerializer(LegacyAliasSerializerMixin, serializers.ModelSerializer):
    sample_label = serializers.CharField(source="sample.accession_number", read_only=True)
    cytologist_name = serializers.CharField(source="cytologist.name", read_only=True)
    legacy_input_aliases = {
        **BASE_ALIASES,
        "citologista": "cytologist",
        "fonte_amostra": "specimen_source",
        "metodo_preparacao": "preparation_method",
        "método_preparação": "preparation_method",
        "adequabilidade": "adequacy",
        "triada_em": "screened_at",
        "descricao_microscopica": "microscopic_description",
        "interpretacao": "interpretation",
        "interpretação": "interpretation",
    }
    legacy_output_aliases = legacy_input_aliases

    class Meta:
        model = PathologyCytologyCase
        fields = "__all__"
        read_only_fields = (*CORE_READ_ONLY_FIELDS, "sample_label", "cytologist_name")


class PathologyImmunohistochemistrySerializer(LegacyAliasSerializerMixin, serializers.ModelSerializer):
    sample_label = serializers.CharField(source="sample.accession_number", read_only=True)
    slide_label = serializers.CharField(source="slide.slide_number", read_only=True)
    interpreted_by_name = serializers.CharField(source="interpreted_by.name", read_only=True)
    legacy_input_aliases = {
        **BASE_ALIASES,
        "lamina": "slide",
        "lâmina": "slide",
        "interpretado_por": "interpreted_by",
        "marcador": "marker",
        "clone": "clone",
        "resultado": "result",
        "intensidade": "intensity",
        "percentual_positivo": "percentage_positive",
        "controlo": "control_status",
        "controle": "control_status",
        "realizado_em": "performed_at",
    }
    legacy_output_aliases = legacy_input_aliases

    class Meta:
        model = PathologyImmunohistochemistry
        fields = "__all__"
        read_only_fields = (*CORE_READ_ONLY_FIELDS, "sample_label", "slide_label", "interpreted_by_name")


class PathologyReportSerializer(LegacyAliasSerializerMixin, serializers.ModelSerializer):
    sample_label = serializers.CharField(source="sample.accession_number", read_only=True)
    patient_name = serializers.CharField(source="sample.patient.name", read_only=True)
    pathologist_name = serializers.CharField(source="pathologist.name", read_only=True)
    legacy_input_aliases = {
        **BASE_ALIASES,
        "numero_laudo": "report_number",
        "número_laudo": "report_number",
        "diagnostico": "diagnosis",
        "diagnóstico": "diagnosis",
        "resumo_macroscopico": "gross_summary",
        "descricao_microscopica": "microscopic_description",
        "resumo_imunohistoquimica": "immunohistochemistry_summary",
        "conclusao": "conclusion",
        "conclusão": "conclusion",
        "cid": "icd_code",
        "assinado_em": "signed_at",
        "entregue_em": "delivered_at",
    }
    legacy_output_aliases = legacy_input_aliases

    class Meta:
        model = PathologyReport
        fields = "__all__"
        read_only_fields = (*CORE_READ_ONLY_FIELDS, "sample_label", "patient_name", "pathologist_name")


class PathologyArchiveSerializer(LegacyAliasSerializerMixin, serializers.ModelSerializer):
    sample_label = serializers.CharField(source="sample.accession_number", read_only=True)
    report_label = serializers.CharField(source="report.report_number", read_only=True)
    responsible_name = serializers.CharField(source="responsible.name", read_only=True)
    legacy_input_aliases = {
        **BASE_ALIASES,
        "laudo": "report",
        "responsavel": "responsible",
        "responsável": "responsible",
        "tipo_arquivo": "archive_type",
        "localizacao": "location",
        "localização": "location",
        "caixa": "box_number",
        "prateleira": "shelf",
        "arquivado_em": "archived_at",
        "reter_ate": "retention_until",
        "reter_até": "retention_until",
    }
    legacy_output_aliases = legacy_input_aliases

    class Meta:
        model = PathologyArchive
        fields = "__all__"
        read_only_fields = (*CORE_READ_ONLY_FIELDS, "sample_label", "report_label", "responsible_name")


SERIALIZER_MAP = {
    "recepcao_amostras": PathologySampleReceptionSerializer,
    "macroscopia": PathologyGrossExaminationSerializer,
    "processamento": PathologyProcessingSerializer,
    "histologia": PathologyHistologySlideSerializer,
    "citologia": PathologyCytologyCaseSerializer,
    "imunohistoquimica": PathologyImmunohistochemistrySerializer,
    "laudos": PathologyReportSerializer,
    "arquivamento": PathologyArchiveSerializer,
}
