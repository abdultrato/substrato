"""Enum-like de estados de resultado clínico."""

class ResultState:
    PENDING = "pendente"
    IN_ANALYSIS = "em_analise"
    AWAITING_VALIDATION = "aguardando_validacao"
    VALIDATED = "validado"
    REJECTED = "rejeitado"
    DISREGARDED = "desconsiderado"
    CANCELED = "cancelado"

    TERMINAL = {VALIDATED, CANCELED}

    CHOICES = [
        (PENDING, "Pendente"),
        (IN_ANALYSIS, "Em Análise"),
        (AWAITING_VALIDATION, "Aguardando Validação"),
        (VALIDATED, "Validado"),
        (REJECTED, "Rejeitado"),
        (DISREGARDED, "Desconsiderado"),
        (CANCELED, "Cancelado"),
    ]
