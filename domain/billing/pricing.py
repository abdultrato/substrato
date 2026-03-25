from decimal import Decimal


def apply_percentage_discount(value, percentage):
    """
    Applies a percentage discount to a value.
    """
    if not percentage:
        return value

    percentage = Decimal(percentage) / Decimal("100")
    discount = (value * percentage).quantize(Decimal("0.01"))
    return (value - discount).quantize(Decimal("0.01"))


def apply_percentage_surcharge(value, percentage):
    """
    Applies a percentage surcharge to a value.
    """
    if not percentage:
        return value

    percentage = Decimal(percentage) / Decimal("100")
    surcharge = (value * percentage).quantize(Decimal("0.01"))
    return (value + surcharge).quantize(Decimal("0.01"))


def calculate_item_price(base_price, quantity=1, discount_percent=0, surcharge_percent=0):
    """
    Calculates a final item price using quantity, discounts, and surcharges.
    """

    quantity = Decimal(quantity or 1)
    price = (Decimal(base_price) * quantity).quantize(Decimal("0.01"))

    price = apply_percentage_discount(price, discount_percent)
    return apply_percentage_surcharge(price, surcharge_percent)


def apply_contract_price(base_price, contract_price=None):
    """
    Returns the contract price when available.
    """
    if contract_price is not None:
        return Decimal(contract_price).quantize(Decimal("0.01"))
    return Decimal(base_price).quantize(Decimal("0.01"))


aplicar_desconto_percentual = apply_percentage_discount
aplicar_acrescimo_percentual = apply_percentage_surcharge
calcular_price_item = calculate_item_price
aplicar_price_contratual = apply_contract_price
