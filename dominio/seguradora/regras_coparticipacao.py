def calcular_coparticipacao(valor_total, percentual_cobertura):
    valor_seguradora = (valor_total * percentual_cobertura) / 100
    valor_paciente = valor_total - valor_seguradora

    return {
        "seguradora": valor_seguradora,
        "paciente": valor_paciente,
    }
