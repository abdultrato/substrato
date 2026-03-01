from django.core.exceptions import ValidationError
from django.test import TestCase

from aplicativos.contabilidade.modelos.contas import Conta, TipoConta
from aplicativos.inquilinos.modelos.inquilino import Inquilino


class ContabilidadeDadosIncompletosTests(TestCase):
    def _criar_inquilino(self):
        return Inquilino.objects.create(
            identificador="inq-contabilidade",
            nome="Tenant Contabilidade",
        )

    def test_conta_com_apenas_nome_falha_na_validacao(self):
        conta = Conta(nome="Caixa")

        with self.assertRaises(ValidationError):
            conta.full_clean()

    def test_conta_completa_salva_com_sucesso(self):
        inquilino = self._criar_inquilino()
        conta = Conta(
            inquilino=inquilino,
            nome="Caixa",
            tipo=TipoConta.ATIVO,
        )

        conta.full_clean()
        conta.save()

        self.assertIsNotNone(conta.pk)
