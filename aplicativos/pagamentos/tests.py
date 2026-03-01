from django.core.exceptions import ValidationError
from django.test import TestCase

from aplicativos.pagamentos.modelos.pagamentos import Pagamento
from aplicativos.pagamentos.modelos.transacao import Transacao


class PagamentosDadosIncompletosTests(TestCase):
    def test_pagamento_com_apenas_valor_falha(self):
        pagamento = Pagamento(valor="10.00")

        with self.assertRaises(ValidationError):
            pagamento.full_clean()

    def test_transacao_com_apenas_referencia_falha(self):
        transacao = Transacao(referencia_externa="TX-1")

        with self.assertRaises(ValidationError):
            transacao.full_clean()

    def test_transacao_completa_salva_com_sucesso(self):
        transacao = Transacao(
            referencia_externa="TX-OK-1",
            gateway="mpesa",
            status="pendente",
        )

        transacao.full_clean()
        transacao.save()

        self.assertIsNotNone(transacao.pk)
