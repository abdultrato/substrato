def calculate_copayment(total_value, coverage_percentage):
    insurer_value = (total_value * coverage_percentage) / 100
    patient_value = total_value - insurer_value

    return {
        "seguradora": insurer_value,
        "paciente": patient_value,
    }


calcular_coparticipacao = calculate_copayment
