from rest_framework.permissions import IsAuthenticated
from rest_framework.viewsets import ModelViewSet

from api.v1.viewset_mixins import TenantScopedQuerysetMixin, ValidatedSearchOrderingMixin
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

from .filters import (
    PathologyAccessionFilter,
    PathologyArchiveFilter,
    PathologyBillingEventFilter,
    PathologyCytologyCaseFilter,
    PathologyDiagnosisReviewFilter,
    PathologyEmbeddingFilter,
    PathologyGrossExaminationFilter,
    PathologyHistologySlideFilter,
    PathologyImmunohistochemistryFilter,
    PathologyInventoryUsageFilter,
    PathologyMicrotomyFilter,
    PathologyMolecularTestFilter,
    PathologyProcessingFilter,
    PathologyQualityControlFilter,
    PathologyReportFilter,
    PathologyRequestFilter,
    PathologySampleReceptionFilter,
    PathologyStainingFilter,
)
from .serializers import (
    PathologyAccessionSerializer,
    PathologyArchiveSerializer,
    PathologyBillingEventSerializer,
    PathologyCytologyCaseSerializer,
    PathologyDiagnosisReviewSerializer,
    PathologyEmbeddingSerializer,
    PathologyGrossExaminationSerializer,
    PathologyHistologySlideSerializer,
    PathologyImmunohistochemistrySerializer,
    PathologyInventoryUsageSerializer,
    PathologyMicrotomySerializer,
    PathologyMolecularTestSerializer,
    PathologyProcessingSerializer,
    PathologyQualityControlSerializer,
    PathologyReportSerializer,
    PathologyRequestSerializer,
    PathologySampleReceptionSerializer,
    PathologyStainingSerializer,
)


class PathologyModelViewSet(ValidatedSearchOrderingMixin, TenantScopedQuerysetMixin, ModelViewSet):
    permission_classes = [IsAuthenticated]
    ordering_fields = "__all__"
    ordering = ["-created_at"]


class PathologyRequestViewSet(PathologyModelViewSet):
    queryset = PathologyRequest.objects.select_related("patient", "lab_request", "requesting_doctor").all()
    serializer_class = PathologyRequestSerializer
    filterset_class = PathologyRequestFilter
    search_fields = [
        "custom_id",
        "patient__name",
        "requesting_doctor__name",
        "service",
        "clinical_diagnosis",
        "icd_code",
        "anatomical_site",
        "notes",
    ]
    ordering = ["-requested_at", "-created_at"]


class PathologySampleReceptionViewSet(PathologyModelViewSet):
    queryset = PathologySampleReception.objects.select_related(
        "patient", "request", "lab_request", "surgery", "received_by"
    ).all()
    serializer_class = PathologySampleReceptionSerializer
    filterset_class = PathologySampleReceptionFilter
    search_fields = ["custom_id", "accession_number", "patient__name", "anatomical_site", "clinical_history", "notes"]
    ordering = ["-received_at", "-created_at"]


class PathologyAccessionViewSet(PathologyModelViewSet):
    queryset = PathologyAccession.objects.select_related("sample", "sample__patient", "accessioned_by").all()
    serializer_class = PathologyAccessionSerializer
    filterset_class = PathologyAccessionFilter
    search_fields = [
        "custom_id",
        "sample__accession_number",
        "sample__patient__name",
        "accession_number",
        "sub_sample_code",
        "barcode_value",
        "notes",
    ]
    ordering = ["-accessioned_at", "accession_number", "sub_sample_code"]


class PathologyGrossExaminationViewSet(PathologyModelViewSet):
    queryset = PathologyGrossExamination.objects.select_related("sample", "sample__patient", "pathologist").all()
    serializer_class = PathologyGrossExaminationSerializer
    filterset_class = PathologyGrossExaminationFilter
    search_fields = [
        "custom_id",
        "sample__accession_number",
        "sample__patient__name",
        "pathologist__name",
        "gross_description",
        "notes",
    ]
    ordering = ["-performed_at", "-created_at"]


class PathologyProcessingViewSet(PathologyModelViewSet):
    queryset = PathologyProcessing.objects.select_related("sample", "sample__patient", "processor").all()
    serializer_class = PathologyProcessingSerializer
    filterset_class = PathologyProcessingFilter
    search_fields = [
        "custom_id",
        "sample__accession_number",
        "sample__patient__name",
        "batch_number",
        "processor_machine",
        "protocol",
        "notes",
    ]
    ordering = ["-started_at", "-created_at"]


class PathologyEmbeddingViewSet(PathologyModelViewSet):
    queryset = PathologyEmbedding.objects.select_related("sample", "sample__patient", "processing", "embedded_by").all()
    serializer_class = PathologyEmbeddingSerializer
    filterset_class = PathologyEmbeddingFilter
    search_fields = [
        "custom_id",
        "sample__accession_number",
        "sample__patient__name",
        "block_number",
        "cassette_number",
        "paraffin_type",
        "embedding_station",
        "notes",
    ]
    ordering = ["-embedded_at", "block_number"]


class PathologyMicrotomyViewSet(PathologyModelViewSet):
    queryset = PathologyMicrotomy.objects.select_related(
        "sample", "sample__patient", "embedding", "cut_by", "microtome"
    ).all()
    serializer_class = PathologyMicrotomySerializer
    filterset_class = PathologyMicrotomyFilter
    search_fields = [
        "custom_id",
        "sample__accession_number",
        "sample__patient__name",
        "embedding__block_number",
        "microtome__name",
        "notes",
    ]
    ordering = ["-cut_at", "-created_at"]


class PathologyHistologySlideViewSet(PathologyModelViewSet):
    queryset = PathologyHistologySlide.objects.select_related(
        "sample", "sample__patient", "processing", "microtomy", "prepared_by"
    ).all()
    serializer_class = PathologyHistologySlideSerializer
    filterset_class = PathologyHistologySlideFilter
    search_fields = [
        "custom_id",
        "sample__accession_number",
        "sample__patient__name",
        "slide_number",
        "block_number",
        "stain",
        "current_location",
        "quality",
        "notes",
    ]
    ordering = ["-prepared_at", "slide_number"]


class PathologyStainingViewSet(PathologyModelViewSet):
    queryset = PathologyStaining.objects.select_related(
        "sample", "sample__patient", "slide", "microtomy", "stained_by", "equipment"
    ).all()
    serializer_class = PathologyStainingSerializer
    filterset_class = PathologyStainingFilter
    search_fields = [
        "custom_id",
        "sample__accession_number",
        "sample__patient__name",
        "slide__slide_number",
        "stain_name",
        "protocol",
        "reagent_lot",
        "notes",
    ]
    ordering = ["-performed_at", "stain_name"]


class PathologyCytologyCaseViewSet(PathologyModelViewSet):
    queryset = PathologyCytologyCase.objects.select_related("sample", "sample__patient", "cytologist").all()
    serializer_class = PathologyCytologyCaseSerializer
    filterset_class = PathologyCytologyCaseFilter
    search_fields = [
        "custom_id",
        "sample__accession_number",
        "sample__patient__name",
        "specimen_source",
        "interpretation",
        "notes",
    ]
    ordering = ["-created_at"]


class PathologyImmunohistochemistryViewSet(PathologyModelViewSet):
    queryset = PathologyImmunohistochemistry.objects.select_related(
        "sample", "sample__patient", "slide", "interpreted_by", "equipment"
    ).all()
    serializer_class = PathologyImmunohistochemistrySerializer
    filterset_class = PathologyImmunohistochemistryFilter
    search_fields = [
        "custom_id",
        "sample__accession_number",
        "sample__patient__name",
        "marker",
        "clone",
        "antibody_lot",
        "intensity",
        "notes",
    ]
    ordering = ["-performed_at", "marker"]


class PathologyMolecularTestViewSet(PathologyModelViewSet):
    queryset = PathologyMolecularTest.objects.select_related(
        "sample", "sample__patient", "slide", "requested_by", "performed_by", "equipment"
    ).all()
    serializer_class = PathologyMolecularTestSerializer
    filterset_class = PathologyMolecularTestFilter
    search_fields = [
        "custom_id",
        "sample__accession_number",
        "sample__patient__name",
        "target",
        "gene_panel",
        "reagent_lot",
        "result",
        "interpretation",
        "notes",
    ]
    ordering = ["-performed_at", "-created_at"]


class PathologyDiagnosisReviewViewSet(PathologyModelViewSet):
    queryset = PathologyDiagnosisReview.objects.select_related(
        "sample", "sample__patient", "report", "pathologist", "reviewer"
    ).all()
    serializer_class = PathologyDiagnosisReviewSerializer
    filterset_class = PathologyDiagnosisReviewFilter
    search_fields = [
        "custom_id",
        "sample__accession_number",
        "sample__patient__name",
        "report__report_number",
        "diagnosis",
        "staging",
        "margins",
        "histologic_grade",
        "comments",
    ]
    ordering = ["-reviewed_at", "-created_at"]


class PathologyReportViewSet(PathologyModelViewSet):
    queryset = PathologyReport.objects.select_related("sample", "sample__patient", "pathologist").all()
    serializer_class = PathologyReportSerializer
    filterset_class = PathologyReportFilter
    search_fields = [
        "custom_id",
        "report_number",
        "sample__accession_number",
        "sample__patient__name",
        "diagnosis",
        "conclusion",
        "icd_code",
    ]
    ordering = ["-signed_at", "-created_at"]


class PathologyBillingEventViewSet(PathologyModelViewSet):
    queryset = PathologyBillingEvent.objects.select_related(
        "sample", "sample__patient", "report", "slide", "staining", "immunohistochemistry", "molecular_test", "invoice"
    ).all()
    serializer_class = PathologyBillingEventSerializer
    filterset_class = PathologyBillingEventFilter
    search_fields = [
        "custom_id",
        "sample__accession_number",
        "sample__patient__name",
        "description",
        "invoice__custom_id",
        "notes",
    ]
    ordering = ["-created_at"]


class PathologyInventoryUsageViewSet(PathologyModelViewSet):
    queryset = PathologyInventoryUsage.objects.select_related(
        "sample", "sample__patient", "processing", "staining", "molecular_test", "product", "consumed_by"
    ).all()
    serializer_class = PathologyInventoryUsageSerializer
    filterset_class = PathologyInventoryUsageFilter
    search_fields = [
        "custom_id",
        "sample__accession_number",
        "sample__patient__name",
        "product__name",
        "lot_number",
        "notes",
    ]
    ordering = ["-consumed_at", "-created_at"]


class PathologyQualityControlViewSet(PathologyModelViewSet):
    queryset = PathologyQualityControl.objects.select_related(
        "sample", "sample__patient", "slide", "staining", "report", "reviewed_by"
    ).all()
    serializer_class = PathologyQualityControlSerializer
    filterset_class = PathologyQualityControlFilter
    search_fields = [
        "custom_id",
        "sample__accession_number",
        "sample__patient__name",
        "finding",
        "corrective_action",
        "notes",
    ]
    ordering = ["-reviewed_at", "-created_at"]


class PathologyArchiveViewSet(PathologyModelViewSet):
    queryset = PathologyArchive.objects.select_related("sample", "sample__patient", "report", "responsible").all()
    serializer_class = PathologyArchiveSerializer
    filterset_class = PathologyArchiveFilter
    search_fields = [
        "custom_id",
        "sample__accession_number",
        "sample__patient__name",
        "location",
        "box_number",
        "shelf",
        "notes",
    ]
    ordering = ["-archived_at", "location"]


VIEWSET_MAP = {
    "pedidos": PathologyRequestViewSet,
    "recepcao_amostras": PathologySampleReceptionViewSet,
    "acessionamento": PathologyAccessionViewSet,
    "macroscopia": PathologyGrossExaminationViewSet,
    "processamento": PathologyProcessingViewSet,
    "inclusao": PathologyEmbeddingViewSet,
    "microtomia": PathologyMicrotomyViewSet,
    "histologia": PathologyHistologySlideViewSet,
    "coloracoes": PathologyStainingViewSet,
    "citologia": PathologyCytologyCaseViewSet,
    "imunohistoquimica": PathologyImmunohistochemistryViewSet,
    "molecular": PathologyMolecularTestViewSet,
    "diagnosticos": PathologyDiagnosisReviewViewSet,
    "laudos": PathologyReportViewSet,
    "faturacao": PathologyBillingEventViewSet,
    "inventario": PathologyInventoryUsageViewSet,
    "controlo_qualidade": PathologyQualityControlViewSet,
    "arquivamento": PathologyArchiveViewSet,
}
