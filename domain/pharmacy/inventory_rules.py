def validate_available_inventory(lot, quantity):
    if lot.quantidade_atual < quantity:
        raise ValueError("Estoque insuficiente.")


validar_estoque_disponivel = validate_available_inventory
