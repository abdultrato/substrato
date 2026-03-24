# dominio/faturamento/calculadora.py

from decimal import Decimal

IVA_PERCENT = Decimal("0.16")


def calcular_totais(itens):
    subtotal = Decimal("0.00")
    iva_total = Decimal("0.00")

    for item in itens:
        total_linha = item.total_linha
        subtotal += total_linha

        if not item.isento_iva:
            iva_item = (total_linha * IVA_PERCENT).quantize(Decimal("0.01"))
            iva_total += iva_item

    total = (subtotal - iva_total).quantize(Decimal("0.01"))
    if total < Decimal("0.00"):
        total = Decimal("0.00")

    return subtotal, iva_total, total
