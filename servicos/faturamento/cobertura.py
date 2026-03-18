from decimal import Decimal as d


def aplicar_coberturas(fatura):
    """
    Apura o valor total coberto por seguradoras e o saldo do paciente.
    """

    total = fatura.total or d("0.00")

    valor_seguro_total = d("0.00")

    for cobertura in fatura.seguros.all():
        percentual = (cobertura.percentual_cobertura or d("0.00")) / d("100")
        valor_coberto = (total * percentual).quantize(d("0.01"))

        cobertura.valor_coberto = valor_coberto
        cobertura.save(update_fields=["valor_coberto"])

        valor_seguro_total += valor_coberto

    if valor_seguro_total > total:
        valor_seguro_total = total

    valor_paciente = (total - valor_seguro_total).quantize(d("0.01"))

    fatura.valor_seguro = valor_seguro_total
    fatura.valor_paciente = valor_paciente

    fatura.save(update_fields=["valor_seguro", "valor_paciente", "atualizado_em"])
