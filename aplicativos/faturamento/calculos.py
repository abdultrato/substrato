def calcular_total_fatura(fatura):
    total = sum(item.subtotal for item in fatura.itens.all())
    fatura.total = total
    fatura.save()
    return total
