from aplicativos.faturamento.modelos import HistoricoFatura


def registrar_evento_fatura(fatura, descricao, tipo=None):
    return HistoricoFatura.objects.create(
        fatura=fatura,
        descricao=descricao,
        tipo_evento=tipo,
    )
