from django.contrib import admin

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


class PathologyCoreAdmin(admin.ModelAdmin):
    list_filter = ("deleted",)
    readonly_fields = ("custom_id", "created_at", "updated_at")
    search_fields = ("custom_id",)
    ordering = ("-created_at",)


@admin.register(PathologySampleReception)
class PathologySampleReceptionAdmin(PathologyCoreAdmin):
    list_display = ("received_at", "accession_number", "patient", "specimen_type", "anatomical_site", "priority", "status")
    list_filter = ("status", "priority", "specimen_type", "source", "deleted", "received_at")
    search_fields = ("custom_id", "accession_number", "patient__name", "anatomical_site", "clinical_history", "notes")
    autocomplete_fields = ("patient", "lab_request", "surgery", "received_by")
    date_hierarchy = "received_at"


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


@admin.register(PathologyHistologySlide)
class PathologyHistologySlideAdmin(PathologyCoreAdmin):
    list_display = ("slide_number", "block_number", "sample", "stain", "status", "prepared_at")
    list_filter = ("status", "stain", "deleted", "prepared_at")
    search_fields = ("custom_id", "slide_number", "block_number", "sample__accession_number", "quality", "notes")
    autocomplete_fields = ("sample", "processing", "prepared_by")
    date_hierarchy = "prepared_at"


@admin.register(PathologyCytologyCase)
class PathologyCytologyCaseAdmin(PathologyCoreAdmin):
    list_display = ("sample", "cytologist", "adequacy", "status", "screened_at")
    list_filter = ("status", "adequacy", "deleted", "screened_at")
    search_fields = ("custom_id", "sample__accession_number", "specimen_source", "interpretation", "notes")
    autocomplete_fields = ("sample", "cytologist")


@admin.register(PathologyImmunohistochemistry)
class PathologyImmunohistochemistryAdmin(PathologyCoreAdmin):
    list_display = ("performed_at", "sample", "marker", "result", "percentage_positive", "control_status")
    list_filter = ("result", "control_status", "marker", "deleted", "performed_at")
    search_fields = ("custom_id", "sample__accession_number", "marker", "clone", "intensity", "notes")
    autocomplete_fields = ("sample", "slide", "interpreted_by")
    date_hierarchy = "performed_at"


@admin.register(PathologyReport)
class PathologyReportAdmin(PathologyCoreAdmin):
    list_display = ("report_number", "sample", "pathologist", "status", "signed_at", "delivered_at")
    list_filter = ("status", "deleted", "signed_at")
    search_fields = ("custom_id", "report_number", "sample__accession_number", "diagnosis", "conclusion", "icd_code")
    autocomplete_fields = ("sample", "pathologist")
    date_hierarchy = "signed_at"


@admin.register(PathologyArchive)
class PathologyArchiveAdmin(PathologyCoreAdmin):
    list_display = ("archived_at", "sample", "archive_type", "status", "location", "box_number", "retention_until")
    list_filter = ("archive_type", "status", "deleted", "archived_at", "retention_until")
    search_fields = ("custom_id", "sample__accession_number", "location", "box_number", "shelf", "notes")
    autocomplete_fields = ("sample", "report", "responsible")
    date_hierarchy = "archived_at"
