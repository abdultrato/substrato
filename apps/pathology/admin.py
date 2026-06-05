from django.contrib import admin

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


class PathologyCoreAdmin(admin.ModelAdmin):
    list_filter = ("deleted",)
    readonly_fields = ("custom_id", "created_at", "updated_at")
    search_fields = ("custom_id",)
    ordering = ("-created_at",)


@admin.register(PathologyRequest)
class PathologyRequestAdmin(PathologyCoreAdmin):
    list_display = ("requested_at", "patient", "requesting_doctor", "request_type", "priority", "status", "service")
    list_filter = ("status", "priority", "request_type", "deleted", "requested_at")
    search_fields = (
        "custom_id",
        "patient__name",
        "requesting_doctor__name",
        "service",
        "clinical_diagnosis",
        "icd_code",
        "anatomical_site",
        "notes",
    )
    autocomplete_fields = ("patient", "lab_request", "requesting_doctor")
    date_hierarchy = "requested_at"


@admin.register(PathologySampleReception)
class PathologySampleReceptionAdmin(PathologyCoreAdmin):
    list_display = (
        "received_at",
        "accession_number",
        "patient",
        "specimen_type",
        "anatomical_site",
        "priority",
        "status",
    )
    list_filter = ("status", "priority", "specimen_type", "source", "deleted", "received_at")
    search_fields = ("custom_id", "accession_number", "patient__name", "anatomical_site", "clinical_history", "notes")
    autocomplete_fields = ("patient", "request", "lab_request", "surgery", "received_by")
    date_hierarchy = "received_at"


@admin.register(PathologyAccession)
class PathologyAccessionAdmin(PathologyCoreAdmin):
    list_display = ("accessioned_at", "accession_number", "sub_sample_code", "sample", "barcode_type", "status")
    list_filter = ("status", "barcode_type", "deleted", "accessioned_at")
    search_fields = (
        "custom_id",
        "sample__accession_number",
        "sample__patient__name",
        "accession_number",
        "sub_sample_code",
        "barcode_value",
        "notes",
    )
    autocomplete_fields = ("sample", "accessioned_by")
    date_hierarchy = "accessioned_at"


@admin.register(PathologyGrossExamination)
class PathologyGrossExaminationAdmin(PathologyCoreAdmin):
    list_display = ("performed_at", "sample", "pathologist", "status", "cassette_count", "fragment_count")
    list_filter = ("status", "deleted", "performed_at")
    search_fields = ("custom_id", "sample__accession_number", "pathologist__name", "gross_description", "notes")
    autocomplete_fields = ("sample", "pathologist")
    date_hierarchy = "performed_at"


@admin.register(PathologyProcessing)
class PathologyProcessingAdmin(PathologyCoreAdmin):
    list_display = ("started_at", "completed_at", "sample", "batch_number", "processor", "status", "cassette_count")
    list_filter = ("status", "deleted", "started_at")
    search_fields = ("custom_id", "sample__accession_number", "batch_number", "processor_machine", "protocol", "notes")
    autocomplete_fields = ("sample", "processor")
    date_hierarchy = "started_at"


@admin.register(PathologyEmbedding)
class PathologyEmbeddingAdmin(PathologyCoreAdmin):
    list_display = ("embedded_at", "block_number", "cassette_number", "sample", "embedded_by", "status")
    list_filter = ("status", "deleted", "embedded_at")
    search_fields = (
        "custom_id",
        "sample__accession_number",
        "sample__patient__name",
        "block_number",
        "cassette_number",
        "paraffin_type",
        "embedding_station",
        "notes",
    )
    autocomplete_fields = ("sample", "processing", "embedded_by")
    date_hierarchy = "embedded_at"


@admin.register(PathologyMicrotomy)
class PathologyMicrotomyAdmin(PathologyCoreAdmin):
    list_display = (
        "cut_at",
        "sample",
        "embedding",
        "cut_by",
        "microtome",
        "section_thickness_microns",
        "slide_count",
        "status",
    )
    list_filter = ("status", "deleted", "cut_at")
    search_fields = (
        "custom_id",
        "sample__accession_number",
        "sample__patient__name",
        "embedding__block_number",
        "microtome__name",
        "notes",
    )
    autocomplete_fields = ("sample", "embedding", "cut_by", "microtome")
    date_hierarchy = "cut_at"


@admin.register(PathologyHistologySlide)
class PathologyHistologySlideAdmin(PathologyCoreAdmin):
    list_display = ("slide_number", "block_number", "sample", "stain", "status", "current_location", "prepared_at")
    list_filter = ("status", "stain", "deleted", "prepared_at")
    search_fields = (
        "custom_id",
        "slide_number",
        "block_number",
        "sample__accession_number",
        "current_location",
        "quality",
        "notes",
    )
    autocomplete_fields = ("sample", "processing", "microtomy", "prepared_by")
    date_hierarchy = "prepared_at"


@admin.register(PathologyStaining)
class PathologyStainingAdmin(PathologyCoreAdmin):
    list_display = ("performed_at", "sample", "slide", "stain_name", "stain_type", "status", "billable", "unit_price")
    list_filter = ("status", "stain_type", "billable", "deleted", "performed_at")
    search_fields = (
        "custom_id",
        "sample__accession_number",
        "sample__patient__name",
        "slide__slide_number",
        "stain_name",
        "protocol",
        "reagent_lot",
        "notes",
    )
    autocomplete_fields = ("sample", "slide", "microtomy", "stained_by", "equipment")
    date_hierarchy = "performed_at"


@admin.register(PathologyCytologyCase)
class PathologyCytologyCaseAdmin(PathologyCoreAdmin):
    list_display = ("sample", "cytologist", "adequacy", "status", "screened_at")
    list_filter = ("status", "adequacy", "deleted", "screened_at")
    search_fields = ("custom_id", "sample__accession_number", "specimen_source", "interpretation", "notes")
    autocomplete_fields = ("sample", "cytologist")


@admin.register(PathologyImmunohistochemistry)
class PathologyImmunohistochemistryAdmin(PathologyCoreAdmin):
    list_display = (
        "performed_at",
        "sample",
        "marker",
        "result",
        "percentage_positive",
        "control_status",
        "billable",
        "unit_price",
    )
    list_filter = ("result", "control_status", "marker", "billable", "deleted", "performed_at")
    search_fields = ("custom_id", "sample__accession_number", "marker", "clone", "antibody_lot", "intensity", "notes")
    autocomplete_fields = ("sample", "slide", "interpreted_by", "equipment")
    date_hierarchy = "performed_at"


@admin.register(PathologyMolecularTest)
class PathologyMolecularTestAdmin(PathologyCoreAdmin):
    list_display = ("performed_at", "sample", "test_type", "target", "status", "billable", "unit_price")
    list_filter = ("status", "test_type", "billable", "deleted", "performed_at")
    search_fields = (
        "custom_id",
        "sample__accession_number",
        "sample__patient__name",
        "target",
        "gene_panel",
        "reagent_lot",
        "result",
        "interpretation",
        "notes",
    )
    autocomplete_fields = ("sample", "slide", "requested_by", "performed_by", "equipment")
    date_hierarchy = "performed_at"


@admin.register(PathologyDiagnosisReview)
class PathologyDiagnosisReviewAdmin(PathologyCoreAdmin):
    list_display = ("reviewed_at", "sample", "report", "pathologist", "reviewer", "review_type", "status")
    list_filter = ("status", "review_type", "deleted", "reviewed_at", "signed_at")
    search_fields = (
        "custom_id",
        "sample__accession_number",
        "sample__patient__name",
        "report__report_number",
        "diagnosis",
        "staging",
        "margins",
        "histologic_grade",
        "comments",
    )
    autocomplete_fields = ("sample", "report", "pathologist", "reviewer")
    date_hierarchy = "reviewed_at"


@admin.register(PathologyReport)
class PathologyReportAdmin(PathologyCoreAdmin):
    list_display = ("report_number", "sample", "pathologist", "status", "signed_at", "delivered_at")
    list_filter = ("status", "deleted", "signed_at")
    search_fields = ("custom_id", "report_number", "sample__accession_number", "diagnosis", "conclusion", "icd_code")
    autocomplete_fields = ("sample", "pathologist")
    date_hierarchy = "signed_at"


@admin.register(PathologyBillingEvent)
class PathologyBillingEventAdmin(PathologyCoreAdmin):
    list_display = (
        "sample",
        "event_type",
        "description",
        "quantity",
        "unit_price",
        "total_with_vat",
        "status",
        "billable",
        "billed_at",
    )
    list_filter = ("event_type", "status", "billable", "deleted", "billed_at")
    search_fields = (
        "custom_id",
        "sample__accession_number",
        "sample__patient__name",
        "description",
        "invoice__custom_id",
        "notes",
    )
    autocomplete_fields = ("sample", "report", "slide", "staining", "immunohistochemistry", "molecular_test", "invoice")
    date_hierarchy = "billed_at"


@admin.register(PathologyInventoryUsage)
class PathologyInventoryUsageAdmin(PathologyCoreAdmin):
    list_display = ("consumed_at", "sample", "product", "quantity", "unit", "unit_cost", "line_total", "lot_number")
    list_filter = ("deleted", "consumed_at")
    search_fields = (
        "custom_id",
        "sample__accession_number",
        "sample__patient__name",
        "product__name",
        "lot_number",
        "notes",
    )
    autocomplete_fields = ("sample", "processing", "staining", "molecular_test", "product", "consumed_by")
    date_hierarchy = "consumed_at"


@admin.register(PathologyQualityControl)
class PathologyQualityControlAdmin(PathologyCoreAdmin):
    list_display = (
        "reviewed_at",
        "sample",
        "control_type",
        "status",
        "turnaround_hours",
        "metric_value",
        "metric_unit",
        "due_at",
    )
    list_filter = ("control_type", "status", "deleted", "reviewed_at", "due_at")
    search_fields = (
        "custom_id",
        "sample__accession_number",
        "sample__patient__name",
        "finding",
        "corrective_action",
        "notes",
    )
    autocomplete_fields = ("sample", "slide", "staining", "report", "reviewed_by")
    date_hierarchy = "reviewed_at"


@admin.register(PathologyArchive)
class PathologyArchiveAdmin(PathologyCoreAdmin):
    list_display = ("archived_at", "sample", "archive_type", "status", "location", "box_number", "retention_until")
    list_filter = ("archive_type", "status", "deleted", "archived_at", "retention_until")
    search_fields = ("custom_id", "sample__accession_number", "location", "box_number", "shelf", "notes")
    autocomplete_fields = ("sample", "report", "responsible")
    date_hierarchy = "archived_at"
