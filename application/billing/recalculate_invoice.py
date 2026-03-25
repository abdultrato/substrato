from domain.billing.calculadora import calcular_totais


def executar(invoice):

    itens = invoice.itens.all()

    result = calcular_totais(
        itens=itens,
        isento_iva=False,
        cobertura_seguro=0,
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
