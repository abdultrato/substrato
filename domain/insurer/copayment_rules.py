def calculate_copayment(total_value, coverage_percentage):
    """
    Calcula coparticipação (seguradora + patient) a partir do percentual de cobertura.
    """
    insurer_value = (total_value * coverage_percentage) / 100
    patient_value = total_value - insurer_value

    return {
        "insurer": insurer_value,
        "patient": patient_value,
    }
__all__ = ["calculate_copayment"]
