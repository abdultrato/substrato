from decimal import Decimal

from .models.conciliacao import ConciliacaoFinanceira


def conciliar_fatura(fatura, valor_recebido):
    """
    Cria registro de conciliação comparando o valor da fatura
    com o valor confirmado pelo banco/gateway.
    """

    valor_recebido = Decimal(valor_recebido).quantize(Decimal("0.01"))
    valor_registrado = (fatura.total or Decimal("0.00")).quantize(Decimal("0.01"))

    divergencia = (valor_registrado - valor_recebido).quantize(Decimal("0.01"))
    conciliado = divergencia == Decimal("0.00")

    conciliacao = ConciliacaoFinanceira.objects.create(
        fatura=fatura,
        valor_registrado=valor_registrado,
        valor_recebido=valor_recebido,
        divergencia=divergencia,
        conciliado=conciliado,
    )

    return conciliacao
