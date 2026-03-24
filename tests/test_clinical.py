from datetime import date
from decimal import Decimal

from django.core.exceptions import ValidationError as DjangoValidationError
import pytest

from apps.clinical.models.lab_exam import LabExam
from apps.clinical.models.lab_exam_field import LabExamField
from apps.clinical.models.patient import Patient
from apps.clinical.models.lab_request import LabRequest
from apps.clinical.models.lab_request_item import LabRequestItem
from apps.clinical.models.result import Result
from apps.clinical.models.result_item import ResultItem
from apps.tenants.models.tenant import Tenant
from core.constants.laboratory.metodo import Metodo
from core.constants.laboratory.setor import Setor
from core.constants.laboratory.tipo_resultado import TipoResultado
from core.constants.laboratory.unidades import UnidadePadrao


def _tenant():
    return Tenant.objects.create(identificador="tn-cli", nome="Tenant Clinico")


def _patient(tenant):
    return Patient.objects.create(
        inquilino=tenant,
        nome="Paciente Clinico",
        genero="Masculino",
        endereco_rua="Rua C",
        data_nascimento=date(1990, 1, 1),
    )


def _exam(tenant):
    return LabExam.objects.create(
        inquilino=tenant,
        nome="Hemograma",
        preco=Decimal("15.00"),
        metodo=Metodo.ENZIMATICO,
        setor=Setor.HEMATOLOGIA,
        trl_horas=4,
    )


def _campo(exame):
    return LabExamField.objects.create(
        inquilino=exame.inquilino,
        exame=exame,
        nome="Hemoglobina",
        tipo=TipoResultado.NUMERICO,
        unidade=UnidadePadrao.G_DL,
    )


@pytest.mark.django_db
def test_patient_age_calculation():
    tenant = _tenant()
    patient = _patient(tenant)
    assert "anos" in patient.idade()


@pytest.mark.django_db
def test_request_creates_result_and_items():
    tenant = _tenant()
    patient = _patient(tenant)
    exam = _exam(tenant)
    field = _campo(exam)

    req = LabRequest.objects.create(inquilino=tenant, paciente=patient)
    item = LabRequestItem.objects.create(inquilino=tenant, requisicao=req, exame=exam)

    # Result items are created by the request item helper.
    result = Result.objects.create(requisicao=req, inquilino=tenant)
    item._criar_resultados()

    assert req.inquilino == tenant
    assert result.requisicao == req
    assert ResultItem.objects.filter(resultado=result, exame_campo=field).exists()


@pytest.mark.django_db
def test_exam_rejects_zero_price():
    tenant = _tenant()
    exam = LabExam(
        inquilino=tenant,
        nome="Exame Zero",
        preco=Decimal("0.00"),
        metodo=Metodo.ENZIMATICO,
        setor=Setor.HEMATOLOGIA,
        trl_horas=1,
    )
    with pytest.raises(DjangoValidationError):
        exam.full_clean()


_paciente = _patient
_exame = _exam
test_paciente_idade_calculo = test_patient_age_calculation
test_requisicao_cria_resultado_e_itens = test_request_creates_result_and_items
test_exame_validacao_preco_zero = test_exam_rejects_zero_price
