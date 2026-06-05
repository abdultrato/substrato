from rest_framework import serializers

from api.v1.compat import LegacyAliasSerializerMixin
from apps.pathology.models import (
    PathologyAccession,
    PathologyArchive,
    PathologyBillingEvent,
    PathologyCytologyCase,
    PathologyDiagnosisReview,
    PathologyEmbedding,
    PathologyGrossExamination,
    PathologyHistologySlide,
    PathologyImmunohistochemistry,
    PathologyInventoryUsage,
    PathologyMicrotomy,
    PathologyMolecularTest,
    PathologyProcessing,
    PathologyQualityControl,
    PathologyReport,
    PathologyRequest,
    PathologySampleReception,
    PathologyStaining,
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


class PathologyRequestSerializer(LegacyAliasSerializerMixin, serializers.ModelSerializer):
    patient_name = serializers.CharField(source="patient.name", read_only=True)
    lab_request_code = serializers.CharField(source="lab_request.custom_id", read_only=True)
    requesting_doctor_name = serializers.CharField(source="requesting_doctor.name", read_only=True)
    legacy_input_aliases = {
        **BASE_ALIASES,
        "requisicao": "lab_request",
        "requisição": "lab_request",
        "medico_solicitante": "requesting_doctor",
        "médico_solicitante": "requesting_doctor",
        "servico": "service",
        "serviço": "service",
        "tipo_pedido": "request_type",
        "prioridade": "priority",
        "solicitado_em": "requested_at",
        "diagnostico_clinico": "clinical_diagnosis",
        "diagnóstico_clínico": "clinical_diagnosis",
        "cid": "icd_code",
        "procedencia_anatomica": "anatomical_site",
        "procedência_anatómica": "anatomical_site",
    }
    legacy_output_aliases = legacy_input_aliases

    class Meta:
        model = PathologyRequest
        fields = "__all__"
        read_only_fields = (*CORE_READ_ONLY_FIELDS, "patient_name", "lab_request_code", "requesting_doctor_name")


class PathologySampleReceptionSerializer(LegacyAliasSerializerMixin, serializers.ModelSerializer):
    patient_name = serializers.CharField(source="patient.name", read_only=True)
    request_code = serializers.CharField(source="request.custom_id", read_only=True)
    lab_request_code = serializers.CharField(source="lab_request.custom_id", read_only=True)
    surgery_code = serializers.CharField(source="surgery.custom_id", read_only=True)
    received_by_name = serializers.CharField(source="received_by.name", read_only=True)
    legacy_input_aliases = {
        **BASE_ALIASES,
        "pedido": "request",
        "pedido_patologia": "request",
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
        read_only_fields = (
            *CORE_READ_ONLY_FIELDS,
            "patient_name",
            "request_code",
            "lab_request_code",
            "surgery_code",
            "received_by_name",
        )


class PathologyAccessionSerializer(LegacyAliasSerializerMixin, serializers.ModelSerializer):
    sample_label = serializers.CharField(source="sample.accession_number", read_only=True)
    accessioned_by_name = serializers.CharField(source="accessioned_by.name", read_only=True)
    full_code = serializers.CharField(read_only=True)
    legacy_input_aliases = {
        **BASE_ALIASES,
        "acessionado_por": "accessioned_by",
        "numero_unico": "accession_number",
        "número_único": "accession_number",
        "numero_patologia": "accession_number",
        "sub_amostra": "sub_sample_code",
        "tipo_codigo": "barcode_type",
        "tipo_código": "barcode_type",
        "valor_codigo": "barcode_value",
        "valor_código": "barcode_value",
        "acessionado_em": "accessioned_at",
    }
    legacy_output_aliases = legacy_input_aliases

    class Meta:
        model = PathologyAccession
        fields = "__all__"
        read_only_fields = (*CORE_READ_ONLY_FIELDS, "sample_label", "accessioned_by_name", "full_code")


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


class PathologyEmbeddingSerializer(LegacyAliasSerializerMixin, serializers.ModelSerializer):
    sample_label = serializers.CharField(source="sample.accession_number", read_only=True)
    processing_code = serializers.CharField(source="processing.custom_id", read_only=True)
    embedded_by_name = serializers.CharField(source="embedded_by.name", read_only=True)
    legacy_input_aliases = {
        **BASE_ALIASES,
        "processamento": "processing",
        "incluido_por": "embedded_by",
        "incluído_por": "embedded_by",
        "numero_bloco": "block_number",
        "número_bloco": "block_number",
        "cassete": "cassette_number",
        "tipo_parafina": "paraffin_type",
        "estacao_inclusao": "embedding_station",
        "estação_inclusão": "embedding_station",
        "incluido_em": "embedded_at",
        "incluído_em": "embedded_at",
    }
    legacy_output_aliases = legacy_input_aliases

    class Meta:
        model = PathologyEmbedding
        fields = "__all__"
        read_only_fields = (*CORE_READ_ONLY_FIELDS, "sample_label", "processing_code", "embedded_by_name")


class PathologyMicrotomySerializer(LegacyAliasSerializerMixin, serializers.ModelSerializer):
    sample_label = serializers.CharField(source="sample.accession_number", read_only=True)
    block_number = serializers.CharField(source="embedding.block_number", read_only=True)
    cut_by_name = serializers.CharField(source="cut_by.name", read_only=True)
    microtome_name = serializers.CharField(source="microtome.name", read_only=True)
    legacy_input_aliases = {
        **BASE_ALIASES,
        "bloco": "embedding",
        "cortado_por": "cut_by",
        "microtomo": "microtome",
        "micrótomo": "microtome",
        "espessura_corte": "section_thickness_microns",
        "seccoes": "section_count",
        "secções": "section_count",
        "laminas_produzidas": "slide_count",
        "lâminas_produzidas": "slide_count",
        "cortado_em": "cut_at",
    }
    legacy_output_aliases = legacy_input_aliases

    class Meta:
        model = PathologyMicrotomy
        fields = "__all__"
        read_only_fields = (*CORE_READ_ONLY_FIELDS, "sample_label", "block_number", "cut_by_name", "microtome_name")


class PathologyHistologySlideSerializer(LegacyAliasSerializerMixin, serializers.ModelSerializer):
    sample_label = serializers.CharField(source="sample.accession_number", read_only=True)
    microtomy_code = serializers.CharField(source="microtomy.custom_id", read_only=True)
    prepared_by_name = serializers.CharField(source="prepared_by.name", read_only=True)
    legacy_input_aliases = {
        **BASE_ALIASES,
        "processamento": "processing",
        "microtomia": "microtomy",
        "preparada_por": "prepared_by",
        "numero_lamina": "slide_number",
        "número_lâmina": "slide_number",
        "numero_bloco": "block_number",
        "coloracao": "stain",
        "coloração": "stain",
        "preparada_em": "prepared_at",
        "localizacao_actual": "current_location",
        "localização_actual": "current_location",
        "qualidade": "quality",
    }
    legacy_output_aliases = legacy_input_aliases

    class Meta:
        model = PathologyHistologySlide
        fields = "__all__"
        read_only_fields = (*CORE_READ_ONLY_FIELDS, "sample_label", "microtomy_code", "prepared_by_name")


class PathologyStainingSerializer(LegacyAliasSerializerMixin, serializers.ModelSerializer):
    sample_label = serializers.CharField(source="sample.accession_number", read_only=True)
    slide_label = serializers.CharField(source="slide.slide_number", read_only=True)
    stained_by_name = serializers.CharField(source="stained_by.name", read_only=True)
    equipment_name = serializers.CharField(source="equipment.name", read_only=True)
    legacy_input_aliases = {
        **BASE_ALIASES,
        "lamina": "slide",
        "lâmina": "slide",
        "microtomia": "microtomy",
        "corada_por": "stained_by",
        "equipamento": "equipment",
        "tipo_coloracao": "stain_type",
        "tipo_coloração": "stain_type",
        "nome_coloracao": "stain_name",
        "nome_coloração": "stain_name",
        "protocolo": "protocol",
        "lote_reagente": "reagent_lot",
        "realizada_em": "performed_at",
        "faturavel": "billable",
        "faturável": "billable",
        "preco_unitario": "unit_price",
        "preço_unitário": "unit_price",
    }
    legacy_output_aliases = legacy_input_aliases

    class Meta:
        model = PathologyStaining
        fields = "__all__"
        read_only_fields = (*CORE_READ_ONLY_FIELDS, "sample_label", "slide_label", "stained_by_name", "equipment_name")


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
    equipment_name = serializers.CharField(source="equipment.name", read_only=True)
    legacy_input_aliases = {
        **BASE_ALIASES,
        "lamina": "slide",
        "lâmina": "slide",
        "interpretado_por": "interpreted_by",
        "equipamento": "equipment",
        "marcador": "marker",
        "clone": "clone",
        "lote_anticorpo": "antibody_lot",
        "resultado": "result",
        "intensidade": "intensity",
        "percentual_positivo": "percentage_positive",
        "controlo": "control_status",
        "controle": "control_status",
        "realizado_em": "performed_at",
        "faturavel": "billable",
        "faturável": "billable",
        "preco_unitario": "unit_price",
        "preço_unitário": "unit_price",
    }
    legacy_output_aliases = legacy_input_aliases

    class Meta:
        model = PathologyImmunohistochemistry
        fields = "__all__"
        read_only_fields = (
            *CORE_READ_ONLY_FIELDS,
            "sample_label",
            "slide_label",
            "interpreted_by_name",
            "equipment_name",
        )


class PathologyMolecularTestSerializer(LegacyAliasSerializerMixin, serializers.ModelSerializer):
    sample_label = serializers.CharField(source="sample.accession_number", read_only=True)
    slide_label = serializers.CharField(source="slide.slide_number", read_only=True)
    requested_by_name = serializers.CharField(source="requested_by.name", read_only=True)
    performed_by_name = serializers.CharField(source="performed_by.name", read_only=True)
    equipment_name = serializers.CharField(source="equipment.name", read_only=True)
    legacy_input_aliases = {
        **BASE_ALIASES,
        "lamina": "slide",
        "lâmina": "slide",
        "solicitado_por": "requested_by",
        "executado_por": "performed_by",
        "equipamento": "equipment",
        "tipo_teste": "test_type",
        "alvo": "target",
        "painel_genetico": "gene_panel",
        "painel_genético": "gene_panel",
        "qualidade_amostra": "specimen_quality",
        "lote_reagente": "reagent_lot",
        "resultado": "result",
        "interpretacao": "interpretation",
        "interpretação": "interpretation",
        "realizado_em": "performed_at",
        "faturavel": "billable",
        "faturável": "billable",
        "preco_unitario": "unit_price",
        "preço_unitário": "unit_price",
    }
    legacy_output_aliases = legacy_input_aliases

    class Meta:
        model = PathologyMolecularTest
        fields = "__all__"
        read_only_fields = (
            *CORE_READ_ONLY_FIELDS,
            "sample_label",
            "slide_label",
            "requested_by_name",
            "performed_by_name",
            "equipment_name",
        )


class PathologyDiagnosisReviewSerializer(LegacyAliasSerializerMixin, serializers.ModelSerializer):
    sample_label = serializers.CharField(source="sample.accession_number", read_only=True)
    report_label = serializers.CharField(source="report.report_number", read_only=True)
    pathologist_name = serializers.CharField(source="pathologist.name", read_only=True)
    reviewer_name = serializers.CharField(source="reviewer.name", read_only=True)
    legacy_input_aliases = {
        **BASE_ALIASES,
        "laudo": "report",
        "revisor": "reviewer",
        "tipo_revisao": "review_type",
        "tipo_revisão": "review_type",
        "visualizador_digital": "digital_viewer_url",
        "diagnostico": "diagnosis",
        "diagnóstico": "diagnosis",
        "estadiamento": "staging",
        "margens": "margins",
        "grau_histologico": "histologic_grade",
        "grau_histológico": "histologic_grade",
        "comentarios": "comments",
        "comentários": "comments",
        "revisto_em": "reviewed_at",
        "assinado_em": "signed_at",
    }
    legacy_output_aliases = legacy_input_aliases

    class Meta:
        model = PathologyDiagnosisReview
        fields = "__all__"
        read_only_fields = (*CORE_READ_ONLY_FIELDS, "sample_label", "report_label", "pathologist_name", "reviewer_name")


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


class PathologyBillingEventSerializer(LegacyAliasSerializerMixin, serializers.ModelSerializer):
    sample_label = serializers.CharField(source="sample.accession_number", read_only=True)
    patient_name = serializers.CharField(source="sample.patient.name", read_only=True)
    report_label = serializers.CharField(source="report.report_number", read_only=True)
    slide_label = serializers.CharField(source="slide.slide_number", read_only=True)
    invoice_code = serializers.CharField(source="invoice.custom_id", read_only=True)
    legacy_input_aliases = {
        **BASE_ALIASES,
        "laudo": "report",
        "lamina": "slide",
        "lâmina": "slide",
        "coloracao": "staining",
        "coloração": "staining",
        "imunohistoquimica": "immunohistochemistry",
        "imunohistoquímica": "immunohistochemistry",
        "teste_molecular": "molecular_test",
        "fatura": "invoice",
        "tipo_evento": "event_type",
        "evento": "event_type",
        "descricao": "description",
        "descrição": "description",
        "quantidade": "quantity",
        "preco_unitario": "unit_price",
        "preço_unitário": "unit_price",
        "iva_percentual": "vat_percentage",
        "total_sem_iva": "line_total",
        "total_com_iva": "total_with_vat",
        "faturavel": "billable",
        "faturável": "billable",
        "faturado_em": "billed_at",
    }
    legacy_output_aliases = legacy_input_aliases

    class Meta:
        model = PathologyBillingEvent
        fields = "__all__"
        read_only_fields = (
            *CORE_READ_ONLY_FIELDS,
            "sample_label",
            "patient_name",
            "report_label",
            "slide_label",
            "invoice_code",
            "line_total",
            "total_with_vat",
        )


class PathologyInventoryUsageSerializer(LegacyAliasSerializerMixin, serializers.ModelSerializer):
    sample_label = serializers.CharField(source="sample.accession_number", read_only=True)
    product_name = serializers.CharField(source="product.name", read_only=True)
    consumed_by_name = serializers.CharField(source="consumed_by.name", read_only=True)
    legacy_input_aliases = {
        **BASE_ALIASES,
        "processamento": "processing",
        "coloracao": "staining",
        "coloração": "staining",
        "teste_molecular": "molecular_test",
        "produto": "product",
        "reagente": "product",
        "consumido_por": "consumed_by",
        "quantidade": "quantity",
        "unidade": "unit",
        "custo_unitario": "unit_cost",
        "custo_unitário": "unit_cost",
        "custo_total": "line_total",
        "lote": "lot_number",
        "consumido_em": "consumed_at",
    }
    legacy_output_aliases = legacy_input_aliases

    class Meta:
        model = PathologyInventoryUsage
        fields = "__all__"
        read_only_fields = (*CORE_READ_ONLY_FIELDS, "sample_label", "product_name", "consumed_by_name", "line_total")


class PathologyQualityControlSerializer(LegacyAliasSerializerMixin, serializers.ModelSerializer):
    sample_label = serializers.CharField(source="sample.accession_number", read_only=True)
    slide_label = serializers.CharField(source="slide.slide_number", read_only=True)
    report_label = serializers.CharField(source="report.report_number", read_only=True)
    reviewed_by_name = serializers.CharField(source="reviewed_by.name", read_only=True)
    legacy_input_aliases = {
        **BASE_ALIASES,
        "lamina": "slide",
        "lâmina": "slide",
        "coloracao": "staining",
        "coloração": "staining",
        "laudo": "report",
        "revisto_por": "reviewed_by",
        "tipo_controlo": "control_type",
        "tipo_controle": "control_type",
        "turnaround_horas": "turnaround_hours",
        "valor_indicador": "metric_value",
        "unidade_indicador": "metric_unit",
        "achado": "finding",
        "accao_correctiva": "corrective_action",
        "ação_corretiva": "corrective_action",
        "revisto_em": "reviewed_at",
        "prazo": "due_at",
    }
    legacy_output_aliases = legacy_input_aliases

    class Meta:
        model = PathologyQualityControl
        fields = "__all__"
        read_only_fields = (*CORE_READ_ONLY_FIELDS, "sample_label", "slide_label", "report_label", "reviewed_by_name")


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
    "pedidos": PathologyRequestSerializer,
    "recepcao_amostras": PathologySampleReceptionSerializer,
    "acessionamento": PathologyAccessionSerializer,
    "macroscopia": PathologyGrossExaminationSerializer,
    "processamento": PathologyProcessingSerializer,
    "inclusao": PathologyEmbeddingSerializer,
    "microtomia": PathologyMicrotomySerializer,
    "histologia": PathologyHistologySlideSerializer,
    "coloracoes": PathologyStainingSerializer,
    "citologia": PathologyCytologyCaseSerializer,
    "imunohistoquimica": PathologyImmunohistochemistrySerializer,
    "molecular": PathologyMolecularTestSerializer,
    "diagnosticos": PathologyDiagnosisReviewSerializer,
    "laudos": PathologyReportSerializer,
    "faturacao": PathologyBillingEventSerializer,
    "inventario": PathologyInventoryUsageSerializer,
    "controlo_qualidade": PathologyQualityControlSerializer,
    "arquivamento": PathologyArchiveSerializer,
}
