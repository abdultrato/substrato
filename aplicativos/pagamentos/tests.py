from decimal import Decimal

from django.core.exceptions import ValidationError
from django.test import TestCase

from aplicativos.clinico.modelos.paciente import Paciente
from aplicativos.clinico.modelos.requisicao_analise import RequisicaoAnalise
from aplicativos.faturamento.modelos.fatura import Fatura
from aplicativos.pagamentos.modelos.pagamentos import Pagamento
from aplicativos.pagamentos.modelos.recibo import Recibo
from aplicativos.pagamentos.modelos.transacao import Transacao
from aplicativos.inquilinos.modelos.inquilino import Inquilino


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


class PagamentoReciboAutomaticoTests(TestCase):
    def _criar_inquilino(self):
        return Inquilino.objects.create(
            identificador="inq-pagamentos-recibo",
            nome="Tenant Pagamentos",
        )

    def _criar_paciente(self, inquilino):
        return Paciente.objects.create(
            inquilino=inquilino,
            nome="Maria Teste",
            morada="Rua 2",
            contacto="841111111",
        )

    def _criar_fatura_emitida(self):
        inquilino = self._criar_inquilino()
        paciente = self._criar_paciente(inquilino)
        requisicao = RequisicaoAnalise.objects.create(
            inquilino=inquilino,
            paciente=paciente,
        )

        fatura = Fatura.objects.create(
            inquilino=inquilino,
            origem=Fatura.Origem.CLINICO,
            requisicao=requisicao,
            paciente=paciente,
            subtotal=Decimal("86.21"),
            iva_valor=Decimal("13.79"),
            total=Decimal("100.00"),
            valor_paciente=Decimal("100.00"),
            estado=Fatura.Estado.EMITIDA,
        )
        return inquilino, fatura

    def test_confirmar_pagamento_gera_recibo_e_marca_fatura_paga(self):
        inquilino, fatura = self._criar_fatura_emitida()
        pagamento = Pagamento.objects.create(
            inquilino=inquilino,
            nome="Pagamento FAT",
            fatura=fatura,
            valor=Decimal("100.00"),
            metodo=Pagamento.Metodo.DINHEIRO,
        )

        pagamento.confirmar()

        pagamento.refresh_from_db()
        fatura.refresh_from_db()

        self.assertEqual(pagamento.status, Pagamento.Status.CONFIRMADO)
        self.assertIsNotNone(pagamento.pago_em)
        self.assertEqual(fatura.estado, Fatura.Estado.PAGA)

        recibo = Recibo.objects.get(pagamento=pagamento)
        self.assertEqual(recibo.fatura_id, fatura.id)
        self.assertEqual(recibo.valor, Decimal("100.00"))

    def test_reprocessar_atualizacao_nao_duplica_recibo(self):
        inquilino, fatura = self._criar_fatura_emitida()
        pagamento = Pagamento.objects.create(
            inquilino=inquilino,
            nome="Pagamento FAT 2",
            fatura=fatura,
            valor=Decimal("100.00"),
            metodo=Pagamento.Metodo.DINHEIRO,
        )

        pagamento.confirmar()
        fatura.atualizar_estado_pagamento(pagamento=pagamento)

        self.assertEqual(Recibo.objects.filter(pagamento=pagamento).count(), 1)

    def test_pagamento_parcial_nao_gera_recibo_ate_fatura_paga(self):
        inquilino, fatura = self._criar_fatura_emitida()
        pagamento = Pagamento.objects.create(
            inquilino=inquilino,
            nome="Pagamento Parcial",
            fatura=fatura,
            valor=Decimal("40.00"),
            metodo=Pagamento.Metodo.DINHEIRO,
        )

        pagamento.confirmar()
        fatura.refresh_from_db()

        self.assertEqual(fatura.estado, Fatura.Estado.EMITIDA)
        self.assertFalse(Recibo.objects.filter(pagamento=pagamento).exists())
