from decimal import Decimal as d

IVA_PERCENT = d("0.16")  # ajustar conforme legislação vigente


def calcular_totais(fatura):
    """
    Recalcula todos os totais financeiros da fatura.

    ✔ calcula subtotal
    ✔ calcula IVA por item
    ✔ aplica coberturas de seguro
    ✔ determina valor do paciente
    """

    subtotal = d("0.00")
    iva_total = d("0.00")

    # ==========================================
    # SOMA DOS ITENS
    # ==========================================
    for item in fatura.itens.all():
        total_linha = item.total_linha
        subtotal += total_linha

        if not item.isento_iva:
            iva_item = (total_linha * IVA_PERCENT).quantize(d("0.01"))
            iva_total += iva_item

    total = (subtotal + iva_total).quantize(d("0.01"))

    # ==========================================
    # COBERTURAS DE SEGURO
    # ==========================================
    valor_seguro_total = d("0.00")

    for seguro in fatura.seguros.all():
        percentual = seguro.percentual_cobertura / d("100")

        valor_coberto = (total * percentual).quantize(d("0.01"))

        seguro.valor_coberto = valor_coberto
        seguro.save(update_fields=["valor_coberto"])

        valor_seguro_total += valor_coberto

    # evita cobrir mais que o total
    if valor_seguro_total > total:
        valor_seguro_total = total

    valor_paciente = (total - valor_seguro_total).quantize(d("0.01"))

    # ==========================================
    # ATUALIZA FATURA
    # ==========================================
    fatura.subtotal = subtotal
    fatura.iva_valor = iva_total
    fatura.total = total
    fatura.valor_seguro = valor_seguro_total
    fatura.valor_paciente = valor_paciente

    fatura.save(
        update_fields=[
            "subtotal",
            "iva_valor",
            "total",
            "valor_seguro",
            "valor_paciente",
            "atualizado_em",
        ]
    )
