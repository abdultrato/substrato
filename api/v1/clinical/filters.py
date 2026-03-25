import django_filters

from api.core.filters import SafeFilterSet
from apps.clinical.models.lab_exam import LabExam
from apps.clinical.models.lab_exam_field import LabExamField
from apps.clinical.models.lab_request import LabRequest
from apps.clinical.models.lab_request_item import LabRequestItem
from apps.clinical.models.medical_exam import MedicalExam, MedicalExamField
from apps.clinical.models.medical_result_file import MedicalResultFile
from apps.clinical.models.patient import Patient
from apps.clinical.models.result_item import ResultItem

# =====================================================
# EXAMS
# =====================================================


class LabExamFilter(SafeFilterSet):
    class Meta:
        model = LabExam
        fields = [
            "tenant",
            "custom_id",
            "deleted",
            "created_at",
            "updated_at",
            "created_by",
            "updated_by",
            "name",
            "turnaround_hours",
            "price",
            "method",
            "sector",
        ]


class MedicalExamFilter(SafeFilterSet):
    class Meta:
        model = MedicalExam
        fields = [
            "tenant",
            "custom_id",
            "deleted",
            "created_at",
            "updated_at",
            "created_by",
            "updated_by",
            "name",
            "turnaround_hours",
            "price",
            "method",
            "sector",
        ]


# =====================================================
# EXAM FIELDS
# =====================================================


class LabExamFieldFilter(SafeFilterSet):
    class Meta:
        model = LabExamField
        fields = [
            "tenant",
            "custom_id",
            "created_at",
            "updated_at",
            "created_by",
            "updated_by",
            "exam",
            "name",
            "type",
            "unit",
        ]


class MedicalExamFieldFilter(SafeFilterSet):
    class Meta:
        model = MedicalExamField
        fields = [
            "tenant",
            "custom_id",
            "created_at",
            "updated_at",
            "created_by",
            "updated_by",
            "exam",
            "name",
            "type",
        ]


# =====================================================
# PATIENTS
# =====================================================


class PatientFilter(SafeFilterSet):
    address = django_filters.CharFilter(field_name="address", lookup_expr="icontains")

    class Meta:
        model = Patient

        fields = [
            "tenant",
            "custom_id",
            "deleted",
            "created_at",
            "updated_at",
            "created_by",
            "updated_by",
            "name",
            "birth_date",
            "gender",
            "race_origin",
            "document_type",
            "document_number",
            "address",
            "contact",
            "email",
            "provenance",
        ]


# =====================================================
# REQUESTS
# =====================================================


class LabRequestFilter(SafeFilterSet):
    class Meta:
        model = LabRequest
        fields = [
            "tenant",
            "custom_id",
            "created_at",
            "updated_at",
            "created_by",
            "updated_by",
            "patient",
            "analyst",
            "type",
            "status",
            "clinical_status",
            "has_critical_result",
        ]


# =====================================================
# REQUEST ITEMS
# =====================================================


class LabRequestItemFilter(SafeFilterSet):
    class Meta:
        model = LabRequestItem
        fields = [
            "tenant",
            "custom_id",
            "created_at",
            "updated_at",
            "created_by",
            "updated_by",
            "request",
            "exam",
            "medical_exam",
        ]


# =====================================================
# RESULTS
# =====================================================


class ResultItemFilter(SafeFilterSet):
    class Meta:
        model = ResultItem
        fields = [
            "tenant",
            "custom_id",
            "created_at",
            "updated_at",
            "created_by",
            "updated_by",
            "request",
            "exam_field",
            "result",
            "clinical_status",
            "report_color",
            "critical_alert",
            "status",
            "validated_by",
            "validation_date",
        ]


class MedicalResultFileFilter(SafeFilterSet):
    class Meta:
        model = MedicalResultFile
        fields = [
            "tenant",
            "custom_id",
            "created_at",
            "updated_at",
            "request",
            "medical_exam",
            "result",
            "request_item",
            "type",
        ]


# =====================================================
# MAPA
# =====================================================

FILTER_MAP = {
    "exam": LabExamFilter,
    "examemedico": MedicalExamFilter,
    "examecampo": LabExamFieldFilter,
    "examemedicocampo": MedicalExamFieldFilter,
    "patient": PatientFilter,
    "requisicaoanalise": LabRequestFilter,
    "requisicaoitem": LabRequestItemFilter,
    "resultadoitem": ResultItemFilter,
    "resultadomedicoarquivo": MedicalResultFileFilter,
}

# Backwards-compatible aliases while callers are migrated incrementally.
ExameFilter = LabExamFilter
ExameMedicoFilter = MedicalExamFilter
ExameCampoFilter = LabExamFieldFilter
ExameMedicoCampoFilter = MedicalExamFieldFilter
PacienteFilter = PatientFilter
RequisicaoAnaliseFilter = LabRequestFilter
RequisicaoItemFilter = LabRequestItemFilter
ResultadoItemFilter = ResultItemFilter
ResultadoMedicoArquivoFilter = MedicalResultFileFilter
