from .exams import LabExamViewSet, MedicalExamViewSet
from .fields import LabExamFieldViewSet, MedicalExamFieldViewSet
from .medical_results import MedicalResultFileViewSet
from .patients import PatientViewSet
from .requests import LabRequestItemViewSet, LabRequestViewSet
from .results import ResultItemViewSet

VIEWSET_MAP = {
    "exam": LabExamViewSet,
    "examemedico": MedicalExamViewSet,
    "examecampo": LabExamFieldViewSet,
    "examemedicocampo": MedicalExamFieldViewSet,
    "patient": PatientViewSet,
    "requisicaoanalise": LabRequestViewSet,
    "requisicaoitem": LabRequestItemViewSet,
    "resultadoitem": ResultItemViewSet,
    "resultadomedicoarquivo": MedicalResultFileViewSet,
}

__all__ = [
    "VIEWSET_MAP",
    "LabExamFieldViewSet",
    "LabExamFieldViewSet",
    "LabExamViewSet",
    "LabExamViewSet",
    "LabRequestItemViewSet",
    "LabRequestItemViewSet",
    "LabRequestViewSet",
    "LabRequestViewSet",
    "MedicalExamFieldViewSet",
    "MedicalExamFieldViewSet",
    "MedicalExamViewSet",
    "MedicalExamViewSet",
    "MedicalResultFileViewSet",
    "MedicalResultFileViewSet",
    "PatientViewSet",
    "PatientViewSet",
    "ResultItemViewSet",
    "ResultItemViewSet",
]
