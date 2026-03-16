from aplicativos.clinico.modelos.resultado import Resultado
from aplicativos.pagamentos.modelos.pagamento import Pagamento
from servicos.servico_contabil import ServicoFinanceiro
from servicos.servico_notificacao import ServicoComunicacao

from .assinantes import registrar
from .tipos import PagamentoConfirmado, ResultadoLiberado


def notificar_resultado(evento):
    resultado = Resultado.objects.get(id=evento.resultado_id)
    paciente = resultado.amostra.requisicao.paciente

    ServicoComunicacao().avisar_resultado_pronto(paciente)


def registrar_pagamento(evento):
    pagamento = Pagamento.objects.get(id=evento.pagamento_id)
    ServicoFinanceiro().registrar_receita(pagamento)


registrar(ResultadoLiberado, notificar_resultado)
registrar(PagamentoConfirmado, registrar_pagamento)
