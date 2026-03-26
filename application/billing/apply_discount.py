from decimal import Decimal

from django.db import transaction


@transaction.atomic
def apply_discount(invoice, amount, description="Desconto manual"):
    discount_value = Decimal(str(amount))
    if discount_value <= 0:
        raise ValueError("O desconto deve ser maior que zero.")

    invoice.persist_totals()
    invoice.subtotal = max((invoice.subtotal or Decimal("0.00")) - discount_value, Decimal("0.00"))
    invoice.total = invoice.subtotal + (invoice.vat_amount or Decimal("0.00"))
    invoice.insurance_amount = min(invoice.insurance_amount or Decimal("0.00"), invoice.total)
    invoice.patient_amount = max(invoice.total - invoice.insurance_amount, Decimal("0.00"))
    invoice.save(update_fields=["subtotal", "total", "insurance_amount", "patient_amount"])
    return invoice


aplicar_desconto = apply_discount
