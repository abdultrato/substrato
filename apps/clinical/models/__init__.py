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

from . import lab_exam as lab_exam
from . import lab_exam_field as lab_exam_field
from . import lab_request as lab_request
from . import lab_request_item as lab_request_item
from . import patient as patient
from . import result as result
from . import result_item as result_item

requisicao_analise = request_analise = lab_request
requisicao_item = request_item = lab_request_item
resultado = result
resultado_item = result_item
resultado_medico_arquivo = result_doctor_file = medical_result_file
exame = exam = lab_exam
exame_campo = exam_field = lab_exam_field
paciente = patient

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
    "exam",
    "exam_field",
    "exame",
    "exame_campo",
    "exam",
    "exam_field",
    "lab_exam",
    "lab_exam_field",
    "lab_request",
    "lab_request_item",
    "medical_result_file",
    "paciente",
    "patient",
    "requisicao_analise",
    "requisicao_item",
    "request_analise",
    "request_item",
    "result",
    "resultado",
    "resultado_item",
    "resultado_medico_arquivo",
    "result_item",
    "result_doctor_file",
]
