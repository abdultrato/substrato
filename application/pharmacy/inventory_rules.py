def validate_available_inventory(lote, quantidade):
    if lote.quantidade_atual < quantidade:
        raise ValueError("Estoque insuficiente.")


validar_estoque_disponivel = validate_available_inventory
