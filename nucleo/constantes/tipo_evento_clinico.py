# LOCAL: nucleo/constantes/laboratorio/tipo_evento_clinico.py

from django.db import models


class TipoEventoClinico(models.TextChoices):
    """
    Enumeração oficial de eventos clínicos do sistema.
    Usado para histórico, auditoria clínica e event bus.
    """

    # RESULTADOS
    RESULTADO_CRIADO = "resultado_criado", "Resultado Criado"
    RESULTADO_INTERPRETADO = "resultado_interpretado", "Resultado Interpretado"
    RESULTADO_VALIDADO = "resultado_validado", "Resultado Validado"
    RESULTADO_CRITICO = "resultado_critico", "Resultado Crítico"

    # REQUISIÇÃO
    REQUISICAO_CRIADA = "requisicao_criada", "Requisição Criada"
    REQUISICAO_PROCESSAMENTO = "requisicao_processamento", "Requisição em Processamento"
    REQUISICAO_VALIDADA = "requisicao_validada", "Requisição Validada"
    REQUISICAO_CANCELADA = "requisicao_cancelada", "Requisição Cancelada"

    # PRESCRIÇÃO / FUTURO
    MEDICACAO_PRESCRITA = "medicacao_prescrita", "Medicação Prescrita"
    MEDICACAO_ADMINISTRADA = "medicacao_administrada", "Medicação Administrada"

    # OUTROS
    OBSERVACAO_CLINICA = "observacao_clinica", "Observação Clínica"
    DIAGNOSTICO = "diagnóstico", "Diagnóstico"
