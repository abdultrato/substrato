def calculate_covered_value(total_value, percentage):
    """
    Calcula o valor coberto com base no percentual informado.
    """
    return (total_value * percentage) / 100


__all__ = ["calculate_covered_value"]
