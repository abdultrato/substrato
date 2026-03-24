class RequestState:
    CREATED = "criada"
    IN_PROGRESS = "em_processamento"
    AWAITING_VALIDATION = "aguardando_validacao"
    VALIDATED = "validada"
    CANCELED = "cancelada"

    TERMINAL = {VALIDATED, CANCELED}

    CHOICES = [
        (CREATED, "Criada"),
        (IN_PROGRESS, "Em Processamento"),
        (AWAITING_VALIDATION, "Aguardando Validação"),
        (VALIDATED, "Validada"),
        (CANCELED, "Cancelada"),
    ]


EstadoRequisicao = RequestState
RequestState.CRIADA = RequestState.CREATED
RequestState.EM_PROCESSAMENTO = RequestState.IN_PROGRESS
RequestState.AGUARDANDO_VALIDACAO = RequestState.AWAITING_VALIDATION
RequestState.VALIDADA = RequestState.VALIDATED
RequestState.CANCELADA = RequestState.CANCELED
