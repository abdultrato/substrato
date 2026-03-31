"""Validações simples para transações de gateway."""

def validate_reference(reference):
    if not reference:
        raise ValueError("Referência inválida")


validar_referencia = validate_reference
