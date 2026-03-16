from decimal import Decimal


def aplicar_desconto_percentual(valor, percentual):
    """
    Aplica desconto percentual sobre um valor.
    """
    if not percentual:
        return valor

    percentual = Decimal(percentual) / Decimal("100")
    desconto = (valor * percentual).quantize(Decimal("0.01"))
    return (valor - desconto).quantize(Decimal("0.01"))


def aplicar_acrescimo_percentual(valor, percentual):
    """
    Aplica acréscimo percentual sobre um valor.
    """
    if not percentual:
        return valor

    percentual = Decimal(percentual) / Decimal("100")
    acrescimo = (valor * percentual).quantize(Decimal("0.01"))
    return (valor + acrescimo).quantize(Decimal("0.01"))


def calcular_preco_item(preco_base, quantidade=1, desconto_percentual=0, acrescimo_percentual=0):
    """
    Calcula preço final de um item considerando:

    ✔ quantidade
    ✔ descontos
    ✔ acréscimos
    """

    quantidade = Decimal(quantidade or 1)
    preco = (Decimal(preco_base) * quantidade).quantize(Decimal("0.01"))

    preco = aplicar_desconto_percentual(preco, desconto_percentual)
    return aplicar_acrescimo_percentual(preco, acrescimo_percentual)


def aplicar_preco_contratual(preco_base, preco_contrato=None):
    """
    Retorna preço contratual quando disponível.
    """
    if preco_contrato is not None:
        return Decimal(preco_contrato).quantize(Decimal("0.01"))
    return Decimal(preco_base).quantize(Decimal("0.01"))
