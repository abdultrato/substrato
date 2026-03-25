from .exams import ExameMedicoViewSet, ExameViewSet, LabExamViewSet, MedicalExamViewSet
from .fields import ExameCampoViewSet, ExameMedicoCampoViewSet, LabExamFieldViewSet, MedicalExamFieldViewSet
from .medical_results import MedicalResultFileViewSet, ResultadoMedicoArquivoViewSet
from .patients import PacienteViewSet, PatientViewSet
from .requests import LabRequestItemViewSet, LabRequestViewSet, RequisicaoAnaliseViewSet, RequisicaoItemViewSet
from .results import ResultadoItemViewSet, ResultItemViewSet

VIEWSET_MAP = {
    "exame": LabExamViewSet,
    "examemedico": MedicalExamViewSet,
    "examecampo": LabExamFieldViewSet,
    "examemedicocampo": MedicalExamFieldViewSet,
    "paciente": PatientViewSet,
    "requisicaoanalise": LabRequestViewSet,
    "requisicaoitem": LabRequestItemViewSet,
    "resultadoitem": ResultItemViewSet,
    "resultadomedicoarquivo": MedicalResultFileViewSet,
}

__all__ = [
    "VIEWSET_MAP",
    "ExameCampoViewSet",
    "ExameMedicoCampoViewSet",
    "ExameMedicoViewSet",
    "ExameViewSet",
    "LabExamFieldViewSet",
    "LabExamViewSet",
    "LabRequestItemViewSet",
    "LabRequestViewSet",
    "MedicalExamFieldViewSet",
    "MedicalExamViewSet",
    "MedicalResultFileViewSet",
    "PacienteViewSet",
    "PatientViewSet",
    "RequisicaoAnaliseViewSet",
    "RequisicaoItemViewSet",
    "ResultItemViewSet",
    "ResultadoItemViewSet",
    "ResultadoMedicoArquivoViewSet",
]
