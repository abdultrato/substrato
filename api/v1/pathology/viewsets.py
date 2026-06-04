from rest_framework.permissions import IsAuthenticated
from rest_framework.viewsets import ModelViewSet

from api.v1.viewset_mixins import TenantScopedQuerysetMixin, ValidatedSearchOrderingMixin
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

from .filters import (
    PathologyArchiveFilter,
    PathologyCytologyCaseFilter,
    PathologyGrossExaminationFilter,
    PathologyHistologySlideFilter,
    PathologyImmunohistochemistryFilter,
    PathologyProcessingFilter,
    PathologyReportFilter,
    PathologySampleReceptionFilter,
)
from .serializers import (
    PathologyArchiveSerializer,
    PathologyCytologyCaseSerializer,
    PathologyGrossExaminationSerializer,
    PathologyHistologySlideSerializer,
    PathologyImmunohistochemistrySerializer,
    PathologyProcessingSerializer,
    PathologyReportSerializer,
    PathologySampleReceptionSerializer,
)


class PathologyModelViewSet(ValidatedSearchOrderingMixin, TenantScopedQuerysetMixin, ModelViewSet):
    permission_classes = [IsAuthenticated]
    ordering_fields = "__all__"
    ordering = ["-created_at"]


class PathologySampleReceptionViewSet(PathologyModelViewSet):
    queryset = PathologySampleReception.objects.select_related("patient", "lab_request", "surgery", "received_by").all()
    serializer_class = PathologySampleReceptionSerializer
    filterset_class = PathologySampleReceptionFilter
    search_fields = ["custom_id", "accession_number", "patient__name", "anatomical_site", "clinical_history", "notes"]
    ordering = ["-received_at", "-created_at"]


class PathologyGrossExaminationViewSet(PathologyModelViewSet):
    queryset = PathologyGrossExamination.objects.select_related("sample", "sample__patient", "pathologist").all()
    serializer_class = PathologyGrossExaminationSerializer
    filterset_class = PathologyGrossExaminationFilter
    search_fields = ["custom_id", "sample__accession_number", "sample__patient__name", "pathologist__name", "gross_description", "notes"]
    ordering = ["-performed_at", "-created_at"]


class PathologyProcessingViewSet(PathologyModelViewSet):
    queryset = PathologyProcessing.objects.select_related("sample", "sample__patient", "processor").all()
    serializer_class = PathologyProcessingSerializer
    filterset_class = PathologyProcessingFilter
    search_fields = ["custom_id", "sample__accession_number", "sample__patient__name", "batch_number", "processor_machine", "protocol", "notes"]
    ordering = ["-started_at", "-created_at"]


class PathologyHistologySlideViewSet(PathologyModelViewSet):
    queryset = PathologyHistologySlide.objects.select_related("sample", "sample__patient", "processing", "prepared_by").all()
    serializer_class = PathologyHistologySlideSerializer
    filterset_class = PathologyHistologySlideFilter
    search_fields = ["custom_id", "sample__accession_number", "sample__patient__name", "slide_number", "block_number", "stain", "quality", "notes"]
    ordering = ["-prepared_at", "slide_number"]


class PathologyCytologyCaseViewSet(PathologyModelViewSet):
    queryset = PathologyCytologyCase.objects.select_related("sample", "sample__patient", "cytologist").all()
    serializer_class = PathologyCytologyCaseSerializer
    filterset_class = PathologyCytologyCaseFilter
    search_fields = ["custom_id", "sample__accession_number", "sample__patient__name", "specimen_source", "interpretation", "notes"]
    ordering = ["-created_at"]


class PathologyImmunohistochemistryViewSet(PathologyModelViewSet):
    queryset = PathologyImmunohistochemistry.objects.select_related("sample", "sample__patient", "slide", "interpreted_by").all()
    serializer_class = PathologyImmunohistochemistrySerializer
    filterset_class = PathologyImmunohistochemistryFilter
    search_fields = ["custom_id", "sample__accession_number", "sample__patient__name", "marker", "clone", "intensity", "notes"]
    ordering = ["-performed_at", "marker"]


class PathologyReportViewSet(PathologyModelViewSet):
    queryset = PathologyReport.objects.select_related("sample", "sample__patient", "pathologist").all()
    serializer_class = PathologyReportSerializer
    filterset_class = PathologyReportFilter
    search_fields = ["custom_id", "report_number", "sample__accession_number", "sample__patient__name", "diagnosis", "conclusion", "icd_code"]
    ordering = ["-signed_at", "-created_at"]


class PathologyArchiveViewSet(PathologyModelViewSet):
    queryset = PathologyArchive.objects.select_related("sample", "sample__patient", "report", "responsible").all()
    serializer_class = PathologyArchiveSerializer
    filterset_class = PathologyArchiveFilter
    search_fields = ["custom_id", "sample__accession_number", "sample__patient__name", "location", "box_number", "shelf", "notes"]
    ordering = ["-archived_at", "location"]


VIEWSET_MAP = {
    "recepcao_amostras": PathologySampleReceptionViewSet,
    "macroscopia": PathologyGrossExaminationViewSet,
    "processamento": PathologyProcessingViewSet,
    "histologia": PathologyHistologySlideViewSet,
    "citologia": PathologyCytologyCaseViewSet,
    "imunohistoquimica": PathologyImmunohistochemistryViewSet,
    "laudos": PathologyReportViewSet,
    "arquivamento": PathologyArchiveViewSet,
}
