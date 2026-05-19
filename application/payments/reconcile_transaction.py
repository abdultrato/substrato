from .commands import ReconcileTransactionCommand
from .handlers import handle_reconcile_transaction


def reconcile_transaction(transaction, gateway_name=None):
    return handle_reconcile_transaction(
        ReconcileTransactionCommand(
            transaction=transaction,
            gateway_name=gateway_name,
            confirm_when_paid=True,
            idempotent=True,
        )
    )


reconciliar_transacao = reconcile_transaction
