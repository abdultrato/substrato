import logging

from .events import *

logger = logging.getLogger("metrics")


# =========================
# PAYMENT
# =========================


def on_payment_received(data):
    logger.info("Pagamento recebido")
    # atualizar fatura
    # liberar atendimento
    # emitir recibo


def on_payment_failed(data):
    logger.warning("Falha no pagamento")


# =========================
# LAB
# =========================


def on_lab_result_ready(data):
    logger.info("Resultado laboratorial disponível")
    # notificar médico
    # notificar paciente


# =========================
# INSURANCE
# =========================


def on_claim_approved(data):
    logger.info("Seguro aprovado")
