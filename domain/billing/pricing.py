"""Regras genéricas de pricing (descontos/acréscimos percentuais)."""

from decimal import Decimal


def apply_percentage_discount(value, percentage):
    if not percentage:
        return value

    percentage = Decimal(percentage) / Decimal("100")
    discount = (value * percentage).quantize(Decimal("0.01"))
    return (value - discount).quantize(Decimal("0.01"))


def apply_percentage_surcharge(value, percentage):
    """Aplica um acréscimo percentual a um valor."""
    if not percentage:
        return value

    percentage = Decimal(percentage) / Decimal("100")
    surcharge = (value * percentage).quantize(Decimal("0.01"))
    return (value + surcharge).quantize(Decimal("0.01"))


def calculate_item_price(base_price, quantity=1, discount_percent=0, surcharge_percent=0):
    """Calcula preço final considerando quantidade, descontos e acréscimos."""

    quantity = Decimal(quantity or 1)
    price = (Decimal(base_price) * quantity).quantize(Decimal("0.01"))

    price = apply_percentage_discount(price, discount_percent)
    return apply_percentage_surcharge(price, surcharge_percent)


def apply_contract_price(base_price, contract_price=None):
    """Retorna o preço contratual quando disponível, senão base."""
    if contract_price is not None:
        return Decimal(contract_price).quantize(Decimal("0.01"))
    return Decimal(base_price).quantize(Decimal("0.01"))


__all__ = [
    "apply_contract_price",
    "apply_percentage_discount",
    "apply_percentage_surcharge",
    "calculate_item_price",
]
