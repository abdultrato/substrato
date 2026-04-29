from .exams import LabExamViewSet, MedicalExamViewSet, SampleViewSet
from .fields import LabExamFieldViewSet, MedicalExamFieldViewSet
from .medical_results import MedicalResultFileViewSet
from .patients import PatientViewSet
from .requests import LabRequestItemViewSet, LabRequestViewSet
from .results import ResultItemViewSet

VIEWSET_MAP = {
    "exam": LabExamViewSet,
    "examfield": LabExamFieldViewSet,
    "labrequest": LabRequestViewSet,
    "labrequestitem": LabRequestItemViewSet,
    "medicalexam": MedicalExamViewSet,
    "medicalexamfield": MedicalExamFieldViewSet,
    "medicalresultfile": MedicalResultFileViewSet,
    "patient": PatientViewSet,
    "resultitem": ResultItemViewSet,
    "sample": SampleViewSet,
}

__all__ = [
    "VIEWSET_MAP",
    "LabExamFieldViewSet",
    "LabExamViewSet",
    "LabRequestItemViewSet",
    "LabRequestViewSet",
    "MedicalExamFieldViewSet",
    "MedicalExamViewSet",
    "MedicalResultFileViewSet",
    "PatientViewSet",
    "ResultItemViewSet",
    "SampleViewSet",
]
