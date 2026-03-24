from decimal import Decimal as d

IVA_PERCENT = d("0.16")  # ajustar conforme legislação vigente


def calculate_totals(invoice):
    """
    Recalculates invoice totals, VAT, and insurer coverage values.
    """

    subtotal = d("0.00")
    vat_total = d("0.00")

    for item in invoice.itens.all():
        line_total = getattr(item, "total_linha", None)
        if line_total is None:
            line_total = getattr(item, "total", d("0.00"))
        subtotal += line_total

        if getattr(item, "aplica_iva", not getattr(item, "isento_iva", False)):
            vat_amount = (line_total * IVA_PERCENT).quantize(d("0.01"))
            vat_total += vat_amount

    total = (subtotal - vat_total).quantize(d("0.01"))
    if total < d("0.00"):
        total = d("0.00")

    total_insurer_value = d("0.00")

    for insurance in invoice.seguros.all():
        percentage = insurance.percentual_cobertura / d("100")
        covered_value = (total * percentage).quantize(d("0.01"))

        insurance.valor_coberto = covered_value
        insurance.save(update_fields=["valor_coberto"])

        total_insurer_value += covered_value

    if total_insurer_value > total:
        total_insurer_value = total

    patient_value = (total - total_insurer_value).quantize(d("0.01"))

    invoice.subtotal = subtotal
    invoice.iva_valor = vat_total
    invoice.total = total
    invoice.valor_seguro = total_insurer_value
    invoice.valor_paciente = patient_value

    invoice.save(
        update_fields=[
            "subtotal",
            "iva_valor",
            "total",
            "valor_seguro",
            "valor_paciente",
            "atualizado_em",
        ]
    )


calcular_totais = calculate_totals
