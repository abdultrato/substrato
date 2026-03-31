"""Cálculo de valor coberto por percentual de plano."""


def calculate_covered_value(total_value, percentage):
    return (total_value * percentage) / 100


__all__ = ["calculate_covered_value"]
