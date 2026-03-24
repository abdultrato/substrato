import django_filters

from api.core.filters import SafeFilterSet
from apps.clinical.models.lab_exam import LabExam
from apps.clinical.models.lab_exam_field import LabExamField
from apps.clinical.models.medical_exam import MedicalExam, MedicalExamField
from apps.clinical.models.patient import Patient
from apps.clinical.models.lab_request import LabRequest
from apps.clinical.models.lab_request_item import LabRequestItem
from apps.clinical.models.result_item import ResultItem
from apps.clinical.models.medical_result_file import MedicalResultFile

# =====================================================
# EXAMS
# =====================================================


class LabExamFilter(SafeFilterSet):
    class Meta:
        model = LabExam
        fields = [
            "inquilino",
            "id_custom",
            "deletado",
            "criado_em",
            "atualizado_em",
            "criado_por",
            "atualizado_por",
            "nome",
            "trl_horas",
            "preco",
            "metodo",
            "setor",
        ]


class MedicalExamFilter(SafeFilterSet):
    class Meta:
        model = MedicalExam
        fields = [
            "inquilino",
            "id_custom",
            "deletado",
            "criado_em",
            "atualizado_em",
            "criado_por",
            "atualizado_por",
            "nome",
            "trl_horas",
            "preco",
            "metodo",
            "setor",
        ]


# =====================================================
# EXAM FIELDS
# =====================================================


class LabExamFieldFilter(SafeFilterSet):
    class Meta:
        model = LabExamField
        fields = [
            "inquilino",
            "id_custom",
            "criado_em",
            "atualizado_em",
            "criado_por",
            "atualizado_por",
            "exame",
            "nome",
            "tipo",
            "unidade",
        ]


class MedicalExamFieldFilter(SafeFilterSet):
    class Meta:
        model = MedicalExamField
        fields = [
            "inquilino",
            "id_custom",
            "criado_em",
            "atualizado_em",
            "criado_por",
            "atualizado_por",
            "exame",
            "nome",
            "tipo",
        ]


# =====================================================
# PATIENTS
# =====================================================


class PatientFilter(SafeFilterSet):
    morada = django_filters.CharFilter(field_name="morada", lookup_expr="icontains")

    class Meta:
        model = Patient

        fields = [
            "inquilino",
            "id_custom",
            "deletado",
            "criado_em",
            "atualizado_em",
            "criado_por",
            "atualizado_por",
            "nome",
            "data_nascimento",
            "genero",
            "raca_origem",
            "tipo_documento",
            "numero_id",
            "morada",
            "contacto",
            "email",
            "proveniencia",
        ]


# =====================================================
# REQUESTS
# =====================================================


class LabRequestFilter(SafeFilterSet):
    class Meta:
        model = LabRequest
        fields = [
            "inquilino",
            "id_custom",
            "criado_em",
            "atualizado_em",
            "criado_por",
            "atualizado_por",
            "paciente",
            "analista",
            "tipo",
            "estado",
            "status_clinico",
            "possui_resultado_critico",
        ]


# =====================================================
# REQUEST ITEMS
# =====================================================


class LabRequestItemFilter(SafeFilterSet):
    class Meta:
        model = LabRequestItem
        fields = [
            "inquilino",
            "id_custom",
            "criado_em",
            "atualizado_em",
            "criado_por",
            "atualizado_por",
            "requisicao",
            "exame",
            "exame_medico",
        ]


# =====================================================
# RESULTS
# =====================================================


class ResultItemFilter(SafeFilterSet):
    class Meta:
        model = ResultItem
        fields = [
            "inquilino",
            "id_custom",
            "criado_em",
            "atualizado_em",
            "criado_por",
            "atualizado_por",
            "requisicao",
            "exame_campo",
            "resultado",
            "status_clinico",
            "cor_laudo",
            "alerta_critico",
            "estado",
            "validado_por",
            "data_validacao",
        ]


class MedicalResultFileFilter(SafeFilterSet):
    class Meta:
        model = MedicalResultFile
        fields = [
            "inquilino",
            "id_custom",
            "criado_em",
            "atualizado_em",
            "requisicao",
            "exame_medico",
            "resultado",
            "requisicao_item",
            "tipo",
        ]


# =====================================================
# MAPA
# =====================================================

FILTER_MAP = {
    "exame": LabExamFilter,
    "examemedico": MedicalExamFilter,
    "examecampo": LabExamFieldFilter,
    "examemedicocampo": MedicalExamFieldFilter,
    "paciente": PatientFilter,
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
