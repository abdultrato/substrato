from .exams import LabExamViewSet, MedicalExamViewSet, SampleViewSet
from .fields import LabExamFieldViewSet, MedicalExamFieldViewSet
from .medical_results import MedicalResultFileViewSet
from .occupational_profiles import OccupationalExamProfileViewSet
from .patients import PatientViewSet
from .requests import LabRequestItemViewSet, LabRequestViewSet
from .results import ResultItemViewSet
from .sample_rejection import SampleRejectionReasonViewSet, SampleRejectionViewSet

VIEWSET_MAP = {
    "exam": LabExamViewSet,
    "examfield": LabExamFieldViewSet,
    "labrequest": LabRequestViewSet,
    "labrequestitem": LabRequestItemViewSet,
    "medicalexam": MedicalExamViewSet,
    "medicalexamfield": MedicalExamFieldViewSet,
    "medicalresultfile": MedicalResultFileViewSet,
    "occupational_profile": OccupationalExamProfileViewSet,
    "patient": PatientViewSet,
    "resultitem": ResultItemViewSet,
    "sample": SampleViewSet,
    "sample_rejection": SampleRejectionViewSet,
    "sample_rejection_reason": SampleRejectionReasonViewSet,
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
    "OccupationalExamProfileViewSet",
    "PatientViewSet",
    "ResultItemViewSet",
    "SampleViewSet",
    "SampleRejectionViewSet",
    "SampleRejectionReasonViewSet",
]
