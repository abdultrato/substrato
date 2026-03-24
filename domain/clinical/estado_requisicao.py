# LOCAL: dominio/clinico/estado_requisicao.py


class EstadoRequisicao:
    CRIADA = "criada"
    EM_PROCESSAMENTO = "em_processamento"
    AGUARDANDO_VALIDACAO = "aguardando_validacao"
    VALIDADA = "validada"
    CANCELADA = "cancelada"

    TERMINAIS = {VALIDADA, CANCELADA}

    CHOICES = [
        (CRIADA, "Criada"),
        (EM_PROCESSAMENTO, "Em Processamento"),
        (AGUARDANDO_VALIDACAO, "Aguardando Validação"),
        (VALIDADA, "Validada"),
        (CANCELADA, "Cancelada"),
    ]
