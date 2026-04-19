"""Enumeração de eventos clínicos (resultados, requisições, prescrições)."""

from django.db import models


class ClinicalEventType(models.TextChoices):
    """
    Enumeração oficial de eventos clínicos do system.
    Usado para histórico, auditoria clínica e event bus.
    """

    # RESULTADOS
    RESULTADO_CRIADO = "result_criado", "Resultado Criado"
    RESULTADO_INTERPRETADO = "result_interpretado", "Resultado Interpretado"
    RESULTADO_VALIDADO = "result_validado", "Resultado Validado"
    RESULTADO_CRITICO = "result_critico", "Resultado Crítico"

    # REQUISIÇÃO
    REQUISICAO_CRIADA = "request_criada", "Requisição Criada"
    REQUISICAO_PROCESSAMENTO = "request_processamento", "Requisição em Processamento"
    REQUISICAO_VALIDADA = "request_validada", "Requisição Validada"
    REQUISICAO_CANCELADA = "request_cancelada", "Requisição Cancelada"

    # PRESCRIÇÃO / FUTURO
    MEDICACAO_PRESCRITA = "medication_prescrita", "Medicação Prescrita"
    MEDICACAO_ADMINISTRADA = "medication_administrada", "Medicação Administrada"

    # OUTROS
    OBSERVACAO_CLINICA = "observation_clinica", "Observação Clínica"
    DIAGNOSTICO = "diagnóstico", "Diagnóstico"


__all__ = ["ClinicalEventType"]
