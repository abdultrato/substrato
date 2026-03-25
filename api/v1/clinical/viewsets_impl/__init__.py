from .exams import MedicalExamViewSet, LabExamViewSet, LabExamViewSet, MedicalExamViewSet
from .fields import LabExamFieldViewSet, MedicalExamFieldViewSet, LabExamFieldViewSet, MedicalExamFieldViewSet
from .medical_results import MedicalResultFileViewSet, MedicalResultFileViewSet
from .patients import PatientViewSet, PatientViewSet
from .requests import LabRequestItemViewSet, LabRequestViewSet, LabRequestViewSet, LabRequestItemViewSet
from .results import ResultItemViewSet, ResultItemViewSet

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
    "MedicalExamFieldViewSet",
    "MedicalExamViewSet",
    "LabExamViewSet",
    "LabExamFieldViewSet",
    "LabExamViewSet",
    "LabRequestItemViewSet",
    "LabRequestViewSet",
    "MedicalExamFieldViewSet",
    "MedicalExamViewSet",
    "MedicalResultFileViewSet",
    "PatientViewSet",
    "PatientViewSet",
    "LabRequestViewSet",
    "LabRequestItemViewSet",
    "ResultItemViewSet",
    "ResultItemViewSet",
    "MedicalResultFileViewSet",
]
