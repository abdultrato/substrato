from domain.billing.calculadora import calcular_totais


def executar(fatura):

    itens = fatura.itens.all()

    resultado = calcular_totais(
        itens=itens,
        isento_iva=False,
        cobertura_seguro=0,
    )

    fatura.subtotal = resultado["subtotal"]
    fatura.iva_valor = resultado["iva_valor"]
    fatura.total = resultado["total"]
    fatura.valor_seguro = resultado["valor_seguro"]
    fatura.valor_paciente = resultado["valor_paciente"]

    fatura.save(
        update_fields=[
            "subtotal",
            "iva_valor",
            "total",
            "valor_seguro",
            "valor_paciente",
        ]
    )
