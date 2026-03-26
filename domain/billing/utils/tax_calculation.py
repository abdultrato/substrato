from decimal import ROUND_HALF_UP, Decimal


def calculate_tax(amount, rate):
    amount_decimal = Decimal(str(amount))
    rate_decimal = Decimal(str(rate))
    return (amount_decimal * rate_decimal / Decimal("100")).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)


calcular_iva = calculate_tax
