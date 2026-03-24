from .fields import ExameCampoViewSet, ExameMedicoCampoViewSet, LabExamFieldViewSet, MedicalExamFieldViewSet
from .exams import ExameMedicoViewSet, ExameViewSet, LabExamViewSet, MedicalExamViewSet
from .medical_results import MedicalResultFileViewSet, ResultadoMedicoArquivoViewSet
from .patients import PacienteViewSet, PatientViewSet
from .requests import LabRequestItemViewSet, LabRequestViewSet, RequisicaoAnaliseViewSet, RequisicaoItemViewSet
from .results import ResultItemViewSet, ResultadoItemViewSet

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
    "LabExamFieldViewSet",
    "MedicalExamFieldViewSet",
    "LabExamViewSet",
    "MedicalExamViewSet",
    "PatientViewSet",
    "LabRequestViewSet",
    "LabRequestItemViewSet",
    "ResultItemViewSet",
    "MedicalResultFileViewSet",
    "ExameCampoViewSet",
    "ExameMedicoCampoViewSet",
    "ExameMedicoViewSet",
    "ExameViewSet",
    "PacienteViewSet",
    "RequisicaoAnaliseViewSet",
    "RequisicaoItemViewSet",
    "ResultadoItemViewSet",
    "ResultadoMedicoArquivoViewSet",
]
