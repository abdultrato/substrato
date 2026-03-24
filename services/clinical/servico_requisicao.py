from django.db import transaction

from apps.clinical.models import LabRequest
from services.financeiro.servico_faturamento import ServicoFaturamento


class ServicoRequisicao:
    @staticmethod
    @transaction.atomic
    def criar_requisicao(paciente, exames):

        requisicao = LabRequest.objects.create(paciente=paciente)

        requisicao.exames.set(exames)

        requisicao.criar_resultados_automaticos()

        return requisicao

    @staticmethod
    @transaction.atomic
    def finalizar_requisicao(requisicao):

        if not requisicao.exames.exists():
            raise ValueError("Requisição deve conter exames.")

        requisicao.status = LabRequest.Status.AGUARDANDO_RESULTADO
        requisicao.save(update_fields=["status"])

        # aqui sim pode gerar faturamento
        ServicoFaturamento.gerar_fatura(requisicao)

        return requisicao
