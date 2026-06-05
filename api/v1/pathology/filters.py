from api.core.filters import SafeFilterSet
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

BASE_FIELDS = ["tenant", "custom_id", "deleted", "deleted_at", "created_at", "updated_at", "created_by", "updated_by"]


class PathologyRequestFilter(SafeFilterSet):
    class Meta:
        model = PathologyRequest
        fields = [
            *BASE_FIELDS,
            "patient",
            "lab_request",
            "requesting_doctor",
            "service",
            "request_type",
            "priority",
            "status",
            "requested_at",
            "icd_code",
        ]


class PathologySampleReceptionFilter(SafeFilterSet):
    class Meta:
        model = PathologySampleReception
        fields = [
            *BASE_FIELDS,
            "patient",
            "request",
            "lab_request",
            "surgery",
            "received_by",
            "accession_number",
            "source",
            "specimen_type",
            "priority",
            "status",
            "received_at",
        ]


class PathologyAccessionFilter(SafeFilterSet):
    class Meta:
        model = PathologyAccession
        fields = [
            *BASE_FIELDS,
            "sample",
            "accessioned_by",
            "accession_number",
            "sub_sample_code",
            "barcode_type",
            "status",
            "accessioned_at",
        ]


class PathologyGrossExaminationFilter(SafeFilterSet):
    class Meta:
        model = PathologyGrossExamination
        fields = [*BASE_FIELDS, "sample", "pathologist", "status", "performed_at"]


class PathologyProcessingFilter(SafeFilterSet):
    class Meta:
        model = PathologyProcessing
        fields = [*BASE_FIELDS, "sample", "processor", "batch_number", "status", "started_at", "completed_at"]


class PathologyEmbeddingFilter(SafeFilterSet):
    class Meta:
        model = PathologyEmbedding
        fields = [
            *BASE_FIELDS,
            "sample",
            "processing",
            "embedded_by",
            "block_number",
            "cassette_number",
            "status",
            "embedded_at",
        ]


class PathologyMicrotomyFilter(SafeFilterSet):
    class Meta:
        model = PathologyMicrotomy
        fields = [*BASE_FIELDS, "sample", "embedding", "cut_by", "microtome", "status", "cut_at"]


class PathologyHistologySlideFilter(SafeFilterSet):
    class Meta:
        model = PathologyHistologySlide
        fields = [
            *BASE_FIELDS,
            "sample",
            "processing",
            "microtomy",
            "prepared_by",
            "slide_number",
            "block_number",
            "stain",
            "status",
            "prepared_at",
        ]


class PathologyStainingFilter(SafeFilterSet):
    class Meta:
        model = PathologyStaining
        fields = [
            *BASE_FIELDS,
            "sample",
            "slide",
            "microtomy",
            "stained_by",
            "equipment",
            "stain_type",
            "status",
            "billable",
            "performed_at",
        ]


class PathologyCytologyCaseFilter(SafeFilterSet):
    class Meta:
        model = PathologyCytologyCase
        fields = [*BASE_FIELDS, "sample", "cytologist", "adequacy", "status", "screened_at"]


class PathologyImmunohistochemistryFilter(SafeFilterSet):
    class Meta:
        model = PathologyImmunohistochemistry
        fields = [
            *BASE_FIELDS,
            "sample",
            "slide",
            "interpreted_by",
            "equipment",
            "marker",
            "antibody_lot",
            "result",
            "control_status",
            "billable",
            "performed_at",
        ]


class PathologyMolecularTestFilter(SafeFilterSet):
    class Meta:
        model = PathologyMolecularTest
        fields = [
            *BASE_FIELDS,
            "sample",
            "slide",
            "requested_by",
            "performed_by",
            "equipment",
            "test_type",
            "target",
            "status",
            "billable",
            "performed_at",
        ]


class PathologyDiagnosisReviewFilter(SafeFilterSet):
    class Meta:
        model = PathologyDiagnosisReview
        fields = [
            *BASE_FIELDS,
            "sample",
            "report",
            "pathologist",
            "reviewer",
            "review_type",
            "status",
            "reviewed_at",
            "signed_at",
        ]


class PathologyReportFilter(SafeFilterSet):
    class Meta:
        model = PathologyReport
        fields = [
            *BASE_FIELDS,
            "sample",
            "pathologist",
            "report_number",
            "status",
            "icd_code",
            "signed_at",
            "delivered_at",
        ]


class PathologyBillingEventFilter(SafeFilterSet):
    class Meta:
        model = PathologyBillingEvent
        fields = [
            *BASE_FIELDS,
            "sample",
            "report",
            "slide",
            "staining",
            "immunohistochemistry",
            "molecular_test",
            "invoice",
            "event_type",
            "status",
            "billable",
            "billed_at",
        ]


class PathologyInventoryUsageFilter(SafeFilterSet):
    class Meta:
        model = PathologyInventoryUsage
        fields = [
            *BASE_FIELDS,
            "sample",
            "processing",
            "staining",
            "molecular_test",
            "product",
            "consumed_by",
            "lot_number",
            "consumed_at",
        ]


class PathologyQualityControlFilter(SafeFilterSet):
    class Meta:
        model = PathologyQualityControl
        fields = [
            *BASE_FIELDS,
            "sample",
            "slide",
            "staining",
            "report",
            "reviewed_by",
            "control_type",
            "status",
            "reviewed_at",
            "due_at",
        ]


class PathologyArchiveFilter(SafeFilterSet):
    class Meta:
        model = PathologyArchive
        fields = [
            *BASE_FIELDS,
            "sample",
            "report",
            "responsible",
            "archive_type",
            "status",
            "location",
            "box_number",
            "archived_at",
            "retention_until",
        ]


FILTER_MAP = {
    "pedidos": PathologyRequestFilter,
    "recepcao_amostras": PathologySampleReceptionFilter,
    "acessionamento": PathologyAccessionFilter,
    "macroscopia": PathologyGrossExaminationFilter,
    "processamento": PathologyProcessingFilter,
    "inclusao": PathologyEmbeddingFilter,
    "microtomia": PathologyMicrotomyFilter,
    "histologia": PathologyHistologySlideFilter,
    "coloracoes": PathologyStainingFilter,
    "citologia": PathologyCytologyCaseFilter,
    "imunohistoquimica": PathologyImmunohistochemistryFilter,
    "molecular": PathologyMolecularTestFilter,
    "diagnosticos": PathologyDiagnosisReviewFilter,
    "laudos": PathologyReportFilter,
    "faturacao": PathologyBillingEventFilter,
    "inventario": PathologyInventoryUsageFilter,
    "controlo_qualidade": PathologyQualityControlFilter,
    "arquivamento": PathologyArchiveFilter,
}
