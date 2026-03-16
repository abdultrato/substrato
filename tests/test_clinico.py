from datetime import date
from decimal import Decimal

from django.core.exceptions import ValidationError as DjangoValidationError
import pytest

from aplicativos.clinico.modelos.exame import Exame
from aplicativos.clinico.modelos.exame_campo import ExameCampo
from aplicativos.clinico.modelos.paciente import Paciente
from aplicativos.clinico.modelos.requisicao_analise import RequisicaoAnalise
from aplicativos.clinico.modelos.requisicao_item import RequisicaoItem
from aplicativos.clinico.modelos.resultado import Resultado
from aplicativos.clinico.modelos.resultado_analise import ResultadoItem
from aplicativos.inquilinos.modelos.inquilino import Inquilino
from nucleo.constantes.laboratorio.metodo import Metodo
from nucleo.constantes.laboratorio.setor import Setor
from nucleo.constantes.laboratorio.tipo_resultado import TipoResultado
from nucleo.constantes.laboratorio.unidades import UnidadePadrao


def _tenant():
    return Inquilino.objects.create(identificador="tn-cli", nome="Tenant Clinico")


def _paciente(tenant):
    return Paciente.objects.create(
        inquilino=tenant,
        nome="Paciente Clinico",
        genero="Masculino",
        endereco_rua="Rua C",
        data_nascimento=date(1990, 1, 1),
    )


def _exame(tenant):
    return Exame.objects.create(
        inquilino=tenant,
        nome="Hemograma",
        preco=Decimal("15.00"),
        metodo=Metodo.ENZIMATICO,
        setor=Setor.HEMATOLOGIA,
        trl_horas=4,
    )


def _campo(exame):
    return ExameCampo.objects.create(
        inquilino=exame.inquilino,
        exame=exame,
        nome="Hemoglobina",
        tipo=TipoResultado.NUMERICO,
        unidade=UnidadePadrao.G_DL,
    )


@pytest.mark.django_db
def test_paciente_idade_calculo():
    tenant = _tenant()
    paciente = _paciente(tenant)
    assert "anos" in paciente.idade()


@pytest.mark.django_db
def test_requisicao_cria_resultado_e_itens():
    tenant = _tenant()
    paciente = _paciente(tenant)
    exame = _exame(tenant)
    campo = _campo(exame)

    req = RequisicaoAnalise.objects.create(inquilino=tenant, paciente=paciente)
    item = RequisicaoItem.objects.create(inquilino=tenant, requisicao=req, exame=exame)

    # cria resultado automaticamente via RequisicaoItem._criar_resultados (quando chamado externamente)
    resultado = Resultado.objects.create(requisicao=req, inquilino=tenant)
    # popula itens
    item._criar_resultados()

    assert req.inquilino == tenant
    assert resultado.requisicao == req
    assert ResultadoItem.objects.filter(resultado=resultado, exame_campo=campo).exists()


@pytest.mark.django_db
def test_exame_validacao_preco_zero():
    tenant = _tenant()
    exame = Exame(
        inquilino=tenant,
        nome="Exame Zero",
        preco=Decimal("0.00"),
        metodo=Metodo.ENZIMATICO,
        setor=Setor.HEMATOLOGIA,
        trl_horas=1,
    )
    with pytest.raises(DjangoValidationError):
        exame.full_clean()
