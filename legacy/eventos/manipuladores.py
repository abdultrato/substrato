from apps.clinical.models.result import Result
from apps.payments.models.pagamento import Payment
from services.servico_contabil import ServicoFinanceiro
from services.servico_notificacao import ServicoComunicacao

from .assinantes import registrar
from .tipos import PagamentoConfirmado, ResultadoLiberado


def notificar_resultado(evento):
    resultado = Result.objects.get(id=evento.resultado_id)
    paciente = resultado.amostra.requisicao.paciente

    ServicoComunicacao().avisar_resultado_pronto(paciente)


def registrar_pagamento(evento):
    pagamento = Payment.objects.get(id=evento.pagamento_id)
    ServicoFinanceiro().registrar_receita(pagamento)


registrar(ResultadoLiberado, notificar_resultado)
registrar(PagamentoConfirmado, registrar_pagamento)
