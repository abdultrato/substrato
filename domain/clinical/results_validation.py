"""Validações simples de resultados (ex.: crítico por limite superior)."""

def is_critical_result(value, upper_limit):
    return float(value) > upper_limit


result_critico = is_critical_result
