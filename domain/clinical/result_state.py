"""Enum-like de estados de resultado clínico."""

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
