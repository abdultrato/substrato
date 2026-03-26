def build_idempotency_key(*parts):
    normalized = [str(part).strip() for part in parts if part not in (None, "")]
    if not normalized:
        raise ValueError("É necessário informar pelo menos uma parte da chave.")
    return ":".join(normalized)
