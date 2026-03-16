# LOCAL: dominio/clinico/estado_resultado.py


class EstadoResultado:
    PENDENTE = "pendente"
    EM_ANALISE = "em_analise"
    AGUARDANDO_VALIDACAO = "aguardando_validacao"
    VALIDADO = "validado"
    REJEITADO = "rejeitado"

    TERMINAIS = {VALIDADO}

    CHOICES = [
        (PENDENTE, "Pendente"),
        (EM_ANALISE, "Em Análise"),
        (AGUARDANDO_VALIDACAO, "Aguardando Validação"),
        (VALIDADO, "Validado"),
        (REJEITADO, "Rejeitado"),
    ]
