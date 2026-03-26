def require_fields(payload, *fields):
    missing = [field for field in fields if payload.get(field) in (None, "")]
    if missing:
        raise ValueError(f"Campos obrigatórios ausentes: {', '.join(missing)}")
    return payload


def coerce_bool(value):
    if isinstance(value, bool):
        return value
    if isinstance(value, str):
        normalized = value.strip().lower()
        if normalized in {"1", "true", "yes", "sim"}:
            return True
        if normalized in {"0", "false", "no", "nao", "não"}:
            return False
    raise ValueError("Valor booleano inválido.")
