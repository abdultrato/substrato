from decimal import Decimal as d

VAT_PERCENT = d("0.16")  # ajustar conforme legislação vigente


def calculate_totals(invoice):
    """
    Recalcula totais da invoice, IVA e valores de cobertura da seguradora.
    """

    subtotal = d("0.00")
    vat_total = d("0.00")

    for item in invoice.itens.all():
        line_total = getattr(item, "total_linha", None)
        if line_total is None:
            line_total = getattr(item, "total", d("0.00"))
        subtotal += line_total

        if getattr(item, "applies_vat", not getattr(item, "isento_iva", False)):
            vat_amount = (line_total * VAT_PERCENT).quantize(d("0.01"))
            vat_total += vat_amount

    total = (subtotal - vat_total).quantize(d("0.01"))
    if total < d("0.00"):
        total = d("0.00")

    total_insurer_value = d("0.00")

    for insurance in invoice.seguros.all():
        percentage = insurance.coverage_percentage / d("100")
        covered_value = (total * percentage).quantize(d("0.01"))

        insurance.value_coberto = covered_value
        insurance.save(update_fields=["value_coberto"])

        total_insurer_value += covered_value

    if total_insurer_value > total:
        total_insurer_value = total

    patient_value = (total - total_insurer_value).quantize(d("0.01"))

    invoice.subtotal = subtotal
    invoice.vat_amount = vat_total
    invoice.total = total
    invoice.insurance_amount = total_insurer_value
    invoice.patient_amount = patient_value

    invoice.save(
        update_fields=[
            "subtotal",
            "vat_amount",
            "total",
            "insurance_amount",
            "patient_amount",
            "updated_at",
        ]
    )


__all__ = ["calculate_totals", "VAT_PERCENT"]
