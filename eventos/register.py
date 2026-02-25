from .bus import event_bus
from .events import (
    PAYMENT_RECEIVED,
    PAYMENT_FAILED,
    LAB_RESULT_READY,
    CLAIM_APPROVED,
)
from .handlers import (
    on_payment_received,
    on_payment_failed,
    on_lab_result_ready,
    on_claim_approved,
)


def register_events():
    """
    Regista handlers do domínio.

    ✔ idempotente
    ✔ seguro contra múltiplas execuções
    ✔ evita import circular
    """

    # pagamentos
    event_bus.subscribe(PAYMENT_RECEIVED, on_payment_received)
    event_bus.subscribe(PAYMENT_FAILED, on_payment_failed)

    # laboratório
    event_bus.subscribe(LAB_RESULT_READY, on_lab_result_ready)

    # seguros
    event_bus.subscribe(CLAIM_APPROVED, on_claim_approved)
