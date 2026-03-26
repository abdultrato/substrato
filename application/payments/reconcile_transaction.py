import json

from application.payments.verify_payment import verify_payment


def reconcile_transaction(transaction, gateway_name=None):
    payload = verify_payment(transaction, gateway_name=gateway_name)
    if isinstance(payload, dict):
        transaction.status = str(payload.get("status", transaction.status))
        transaction.gateway_response = json.dumps(payload, ensure_ascii=True, default=str)
        transaction.save(update_fields=["status", "gateway_response"])
    return transaction


reconciliar_transacao = reconcile_transaction
