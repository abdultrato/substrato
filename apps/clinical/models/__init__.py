from . import medical_result_file
from .clinical_reference import ClinicalReference
from .lab_exam import LabExam
from .lab_exam_field import LabExamField
from .lab_request import LabRequest
from .lab_request_item import LabRequestItem
from .medical_exam import MedicalExam, MedicalExamField
from .medical_result_file import MedicalResultFile
from .patient import Patient
from .result import Result
from .result_item import ResultItem

requisicao_analise = lab_request = __import__(__name__, fromlist=["lab_request"]).lab_request
requisicao_item = lab_request_item = __import__(__name__, fromlist=["lab_request_item"]).lab_request_item
resultado = result = __import__(__name__, fromlist=["result"]).result
resultado_item = result_item = __import__(__name__, fromlist=["result_item"]).result_item
resultado_medico_arquivo = medical_result_file
exame = lab_exam = __import__(__name__, fromlist=["lab_exam"]).lab_exam
exame_campo = lab_exam_field = __import__(__name__, fromlist=["lab_exam_field"]).lab_exam_field
paciente = patient = __import__(__name__, fromlist=["patient"]).patient

RequisicaoAnalise = LabRequest
RequisicaoItem = LabRequestItem
Resultado = Result
ResultadoItem = ResultItem
ResultadoMedicoArquivo = MedicalResultFile
Exame = LabExam
ExameCampo = LabExamField
Paciente = Patient

__all__ = [
    "ClinicalReference",
    "Exame",
    "ExameCampo",
    "LabExam",
    "LabExamField",
    "LabRequest",
    "LabRequestItem",
    "MedicalExam",
    "MedicalExamField",
    "MedicalResultFile",
    "Paciente",
    "Patient",
    "RequisicaoAnalise",
    "RequisicaoItem",
    "Result",
    "ResultItem",
    "Resultado",
    "ResultadoItem",
    "ResultadoMedicoArquivo",
    "exame",
    "exame_campo",
    "lab_exam",
    "lab_exam_field",
    "lab_request",
    "lab_request_item",
    "medical_result_file",
    "paciente",
    "patient",
    "requisicao_analise",
    "requisicao_item",
    "result",
    "result_item",
    "resultado",
    "resultado_item",
    "resultado_medico_arquivo",
]
