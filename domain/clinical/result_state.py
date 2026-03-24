class ResultState:
    PENDING = "pendente"
    IN_ANALYSIS = "em_analise"
    AWAITING_VALIDATION = "aguardando_validacao"
    VALIDATED = "validado"
    REJECTED = "rejeitado"

    TERMINAL = {VALIDATED}

    CHOICES = [
        (PENDING, "Pendente"),
        (IN_ANALYSIS, "Em Análise"),
        (AWAITING_VALIDATION, "Aguardando Validação"),
        (VALIDATED, "Validado"),
        (REJECTED, "Rejeitado"),
    ]


EstadoResultado = ResultState
ResultState.PENDENTE = ResultState.PENDING
ResultState.EM_ANALISE = ResultState.IN_ANALYSIS
ResultState.AGUARDANDO_VALIDACAO = ResultState.AWAITING_VALIDATION
ResultState.VALIDADO = ResultState.VALIDATED
ResultState.REJEITADO = ResultState.REJECTED
