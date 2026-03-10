from decimal import Decimal

from django.core.exceptions import ValidationError
from django.test import TestCase

from aplicacao.recepcao.fluxo_atendimento import (
    criar_fatura_para_checkin,
    criar_requisicao_para_checkin,
    executar_fluxo_completo,
    registrar_pagamento_para_checkin,
)
from aplicacao.recepcao.obter_area_trabalho import executar as obter_area_trabalho
from aplicativos.clinico.modelos.exame import Exame
from aplicativos.clinico.modelos.paciente import Paciente
from aplicativos.clinico.modelos.requisicao_analise import RequisicaoAnalise
from aplicativos.faturamento.modelos.fatura import Fatura
from aplicativos.inquilinos.modelos.inquilino import Inquilino
from aplicativos.pagamentos.modelos.pagamentos import Pagamento
from aplicativos.pagamentos.modelos.recibo import Recibo
from aplicativos.recepcao.modelos.checkin_recepcao import CheckinRecepcao


class RecepcaoWorkspaceTests(TestCase):
    def setUp(self):
        self.inquilino = Inquilino.objects.create(
            identificador="recepcao-tenant",
            nome="Recepcao Tenant",
        )
        self.paciente = Paciente.objects.create(
            inquilino=self.inquilino,
            nome="Maria Recepcao",
            morada="Maputo",
            numero_id="123456789",
        )
        self.exame = Exame.objects.create(
            inquilino=self.inquilino,
            nome="Hemograma",
            preco=Decimal("100.00"),
            trl_horas=24,
            metodo="ELISA",
            setor="Hematologia",
        )

    def test_checkin_propaga_inquilino_do_paciente(self):
        checkin = CheckinRecepcao.objects.create(
            paciente=self.paciente,
            motivo="Entrada para exames de rotina",
        )

        self.assertEqual(checkin.inquilino_id, self.inquilino.id)
        self.assertEqual(checkin.estado, CheckinRecepcao.Estado.AGUARDANDO)

    def test_checkin_vincula_requisicao_do_mesmo_paciente(self):
        checkin = CheckinRecepcao.objects.create(
            paciente=self.paciente,
            motivo="Entrada para exames de rotina",
        )
        requisicao = RequisicaoAnalise.objects.create(
            inquilino=self.inquilino,
            paciente=self.paciente,
        )

        checkin.registrar_requisicao(requisicao)

        checkin.refresh_from_db()
        self.assertEqual(checkin.requisicao_id, requisicao.id)
        self.assertEqual(checkin.estado, CheckinRecepcao.Estado.REQUISICAO_CRIADA)

    def test_checkin_rejeita_requisicao_de_outro_paciente(self):
        outro = Paciente.objects.create(
            inquilino=self.inquilino,
            nome="Joao Outro",
            morada="Beira",
            numero_id="987654321",
        )
        checkin = CheckinRecepcao.objects.create(
            paciente=self.paciente,
            motivo="Entrada para exames",
        )
        requisicao = RequisicaoAnalise.objects.create(
            inquilino=self.inquilino,
            paciente=outro,
        )

        with self.assertRaises(ValidationError):
            checkin.registrar_requisicao(requisicao)

    def test_workspace_retorna_metricas_e_fila(self):
        checkin = CheckinRecepcao.objects.create(
            paciente=self.paciente,
            motivo="Entrada para exames de rotina",
        )

        workspace = obter_area_trabalho(self.inquilino)

        self.assertEqual(workspace["resumo"]["checkins_hoje"], 1)
        self.assertEqual(workspace["resumo"]["na_fila"], 1)
        self.assertEqual(workspace["fila"][0]["id"], checkin.id)

    def test_fluxo_cria_requisicao_fatura_pagamento_e_recibo(self):
        checkin = CheckinRecepcao.objects.create(
            paciente=self.paciente,
            motivo="Entrada para exames de rotina",
        )

        requisicao = criar_requisicao_para_checkin(
            checkin=checkin,
            exame_ids=[self.exame.id],
        )
        fatura = criar_fatura_para_checkin(checkin=checkin, emitir=True)
        pagamento, recibo = registrar_pagamento_para_checkin(
            checkin=checkin,
            metodo=Pagamento.Metodo.DINHEIRO,
        )

        checkin.refresh_from_db()
        fatura.refresh_from_db()

        self.assertEqual(requisicao.paciente_id, self.paciente.id)
        self.assertEqual(checkin.requisicao_id, requisicao.id)
        self.assertEqual(checkin.fatura_id, fatura.id)
        self.assertEqual(fatura.estado, Fatura.Estado.PAGA)
        self.assertEqual(pagamento.status, Pagamento.Status.CONFIRMADO)
        self.assertIsNotNone(recibo)
        self.assertEqual(Recibo.objects.filter(pagamento=pagamento).count(), 1)

    def test_fluxo_completo_via_orquestrador(self):
        resumo = executar_fluxo_completo(
            inquilino=self.inquilino,
            paciente={
                "nome": "Jose Fluxo",
                "morada": "Matola",
                "contacto": "841111111",
            },
            checkin={
                "motivo": "Atendimento completo",
                "prioridade": CheckinRecepcao.Prioridade.PREFERENCIAL,
                "iniciar_atendimento": True,
            },
            requisicao={
                "exames_ids": [self.exame.id],
            },
            faturamento={
                "emitir": True,
            },
            pagamento={
                "metodo": Pagamento.Metodo.DINHEIRO,
            },
            concluir_checkin=True,
        )

        self.assertIsNotNone(resumo["checkin"]["id"])
        self.assertEqual(resumo["checkin"]["estado"], CheckinRecepcao.Estado.CONCLUIDO)
        self.assertEqual(len(resumo["requisicao"]["exames"]), 1)
        self.assertEqual(resumo["fatura"]["estado"], Fatura.Estado.PAGA)
        self.assertEqual(len(resumo["pagamentos"]), 1)
        self.assertEqual(len(resumo["recibos"]), 1)
