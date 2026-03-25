from decimal import Decimal

VAT_PERCENT = Decimal("0.16")


def calculate_totals(items, vat_exempt: bool = False, insurance_coverage: Decimal | float | int = 0):
    """
    Calcula subtotal, IVA e total a partir de uma lista de itens.

    `insurance_coverage` pode ser fração (0-1) ou percentual (0-100).
    """

    subtotal = Decimal("0.00")
    vat_total = Decimal("0.00")

    for item in items:
        line_total = getattr(item, "total_linha", None)
        if line_total is None:
            line_total = getattr(item, "total", Decimal("0.00"))
        subtotal += line_total

        if not vat_exempt and not getattr(item, "isento_iva", False):
            vat_item = (line_total * VAT_PERCENT).quantize(Decimal("0.01"))
            vat_total += vat_item

    total = (subtotal - vat_total).quantize(Decimal("0.01"))
    if total < Decimal("0.00"):
        total = Decimal("0.00")

    coverage = Decimal(str(insurance_coverage or 0))
    if coverage > Decimal("1.00"):
        coverage = (coverage / Decimal("100")).quantize(Decimal("0.0001"))

    insurance_amount = (total * coverage).quantize(Decimal("0.01")) if coverage else Decimal("0.00")
    if insurance_amount > total:
        insurance_amount = total

    patient_amount = (total - insurance_amount).quantize(Decimal("0.01"))

    return {
        "subtotal": subtotal,
        "vat_amount": vat_total,
        "total": total,
        "insurance_amount": insurance_amount,
        "patient_amount": patient_amount,
    }


__all__ = ["calculate_totals", "VAT_PERCENT"]
