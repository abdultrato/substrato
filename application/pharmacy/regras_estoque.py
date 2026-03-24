def validar_estoque_disponivel(lote, quantidade):
    if lote.quantidade_atual < quantidade:
        raise ValueError("Estoque insuficiente.")
