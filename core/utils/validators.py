"""Validações utilitárias independentes de Django."""

def require_non_empty(value, field_name="valor"):
    if value is None or str(value).strip() == "":
        raise ValueError(f"{field_name} é obrigatório.")
    return value


def validate_choice(value, choices, field_name="valor"):
    normalized_choices = set(choices)
    if value not in normalized_choices:
        allowed = ", ".join(str(choice) for choice in sorted(normalized_choices))
        raise ValueError(f"{field_name} inválido. Permitidos: {allowed}.")
    return value
