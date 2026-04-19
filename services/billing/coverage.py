from decimal import Decimal as d


def apply_coverages(invoice):
    """
    Computes insurer coverage and patient balance for an invoice.
    """

    total = invoice.total or d("0.00")

    total_covered_value = d("0.00")

    for coverage in invoice.seguros.all():
        percentage = (coverage.coverage_percentage or d("0.00")) / d("100")
        covered_value = (total * percentage).quantize(d("0.01"))

        coverage.value_coberto = covered_value
        coverage.save(update_fields=["value_coberto"])

        total_covered_value += covered_value

    if total_covered_value > total:
        total_covered_value = total

    patient_value = (total - total_covered_value).quantize(d("0.01"))

    invoice.insurance_amount = total_covered_value
    invoice.patient_amount = patient_value

    invoice.save(update_fields=["insurance_amount", "patient_amount", "updated_at"])


aplicar_coberturas = apply_coverages
"""Verificações de cobertura de convênio/seguradora para faturamento."""
