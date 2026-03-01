from decimal import Decimal

from django.core.exceptions import ValidationError
from django.test import TestCase

from aplicativos.clinico.modelos.paciente import Paciente
from aplicativos.clinico.modelos.requisicao_analise import RequisicaoAnalise
from aplicativos.faturamento.modelos.fatura import Fatura
from aplicativos.inquilinos.modelos.inquilino import Inquilino


class FaturamentoDadosIncompletosTests(TestCase):
    def _criar_inquilino(self):
        return Inquilino.objects.create(
            identificador="inq-faturamento",
            nome="Tenant Faturamento",
        )

    def _criar_paciente(self, inquilino):
        return Paciente.objects.create(
            inquilino=inquilino,
            nome="Joao da Silva",
            morada="Rua 1",
            contacto="841234567",
        )

    def _criar_requisicao(self, inquilino, paciente):
        return RequisicaoAnalise.objects.create(
            inquilino=inquilino,
            nome="REQ Basica",
            paciente=paciente,
        )

    def test_fatura_com_apenas_nome_falha_na_validacao(self):
        fatura = Fatura(nome="Fatura incompleta")

        with self.assertRaises(ValidationError):
            fatura.full_clean()

    def test_fatura_completa_salva_com_sucesso(self):
        inquilino = self._criar_inquilino()
        paciente = self._criar_paciente(inquilino)
        requisicao = self._criar_requisicao(inquilino, paciente)

        fatura = Fatura(
            inquilino=inquilino,
            nome="Fatura 001",
            paciente=paciente,
            requisicao=requisicao,
            subtotal=Decimal("100.00"),
            total=Decimal("100.00"),
        )

        fatura.full_clean()
        fatura.save()

        self.assertIsNotNone(fatura.pk)
