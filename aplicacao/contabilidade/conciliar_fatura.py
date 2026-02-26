from decimal import Decimal
from django.db import transaction

from aplicativos.contabilidade.modelos.conciliacao import ConciliacaoFinanceira


@transaction.atomic
def conciliar_fatura(fatura, valor_recebido):
    """
    Concilia fatura com valor recebido do banco/gateway.
    """

    if valor_recebido is None:
        raise ValueError("Valor recebido não pode ser nulo.")

    valor_recebido = Decimal(valor_recebido).quantize(Decimal("0.01"))

    if valor_recebido < 0:
        raise ValueError("Valor recebido inválido.")

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
