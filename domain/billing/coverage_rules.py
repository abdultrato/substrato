"""Regras para aplicar cobertura percentual em valores (planos)."""

def apply_coverage(value, percentage):
    discount = value * (percentage / 100)
    return value - discount


aplicar_cobertura = apply_coverage
