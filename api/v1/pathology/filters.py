from api.core.filters import SafeFilterSet
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

BASE_FIELDS = ["tenant", "custom_id", "deleted", "deleted_at", "created_at", "updated_at", "created_by", "updated_by"]


class PathologySampleReceptionFilter(SafeFilterSet):
    class Meta:
        model = PathologySampleReception
        fields = [
            *BASE_FIELDS,
            "patient",
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


class PathologyGrossExaminationFilter(SafeFilterSet):
    class Meta:
        model = PathologyGrossExamination
        fields = [*BASE_FIELDS, "sample", "pathologist", "status", "performed_at"]


class PathologyProcessingFilter(SafeFilterSet):
    class Meta:
        model = PathologyProcessing
        fields = [*BASE_FIELDS, "sample", "processor", "batch_number", "status", "started_at", "completed_at"]


class PathologyHistologySlideFilter(SafeFilterSet):
    class Meta:
        model = PathologyHistologySlide
        fields = [*BASE_FIELDS, "sample", "processing", "prepared_by", "slide_number", "block_number", "stain", "status", "prepared_at"]


class PathologyCytologyCaseFilter(SafeFilterSet):
    class Meta:
        model = PathologyCytologyCase
        fields = [*BASE_FIELDS, "sample", "cytologist", "adequacy", "status", "screened_at"]


class PathologyImmunohistochemistryFilter(SafeFilterSet):
    class Meta:
        model = PathologyImmunohistochemistry
        fields = [*BASE_FIELDS, "sample", "slide", "interpreted_by", "marker", "result", "control_status", "performed_at"]


class PathologyReportFilter(SafeFilterSet):
    class Meta:
        model = PathologyReport
        fields = [*BASE_FIELDS, "sample", "pathologist", "report_number", "status", "icd_code", "signed_at", "delivered_at"]


class PathologyArchiveFilter(SafeFilterSet):
    class Meta:
        model = PathologyArchive
        fields = [*BASE_FIELDS, "sample", "report", "responsible", "archive_type", "status", "location", "box_number", "archived_at", "retention_until"]


FILTER_MAP = {
    "recepcao_amostras": PathologySampleReceptionFilter,
    "macroscopia": PathologyGrossExaminationFilter,
    "processamento": PathologyProcessingFilter,
    "histologia": PathologyHistologySlideFilter,
    "citologia": PathologyCytologyCaseFilter,
    "imunohistoquimica": PathologyImmunohistochemistryFilter,
    "laudos": PathologyReportFilter,
    "arquivamento": PathologyArchiveFilter,
}
