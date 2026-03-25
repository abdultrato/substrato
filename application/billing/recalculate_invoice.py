from domain.billing.calculator import calculate_totals


def execute(invoice):

    items = invoice.itens.all()

    result = calculate_totals(
        items=items,
        vat_exempt=False,
        insurance_coverage=0,
    )

    invoice.subtotal = result["subtotal"]
    invoice.vat_amount = result["vat_amount"]
    invoice.total = result["total"]
    invoice.insurance_amount = result["insurance_amount"]
    invoice.patient_amount = result["patient_amount"]

    invoice.save(
        update_fields=[
            "subtotal",
            "vat_amount",
            "total",
            "insurance_amount",
            "patient_amount",
        ]
    )
