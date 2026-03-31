"""Cálculo de coparticipação entre seguradora e paciente."""


def calculate_copayment(total_value, coverage_percentage):
    insurer_value = (total_value * coverage_percentage) / 100
    patient_value = total_value - insurer_value

    return {
        "insurer": insurer_value,
        "patient": patient_value,
    }
__all__ = ["calculate_copayment"]
