"""Gateway de pagamento *sandbox* — determinístico e testável.

Implementa o mesmo contrato dos gateways reais (M-Pesa, Stripe, ...), mas sem
chamadas de rede. Serve para construir e testar todo o motor de cobrança
(assinatura → fatura → cobrança → webhook → reconciliação) ponta-a-ponta sem
depender de credenciais externas.

Comportamento da cobrança:
- Se ``settings.PAYMENT_SANDBOX_FORCE`` for ``"succeed"`` ou ``"fail"``, força o
  resultado (útil em testes).
- Caso contrário, se a referência contiver ``"FAIL"`` (ex.: ``"SINV-FAIL-..."``),
  a cobrança falha; senão, é bem-sucedida.

Estado em memória (por processo) permite consultar ``status()`` e simular
webhooks de confirmação assíncrona.
"""

import hashlib
import uuid

from django.conf import settings

from .base_gateway import PaymentGateway

# Vocabulário normalizado de estados do gateway.
SUCCEEDED = "succeeded"
FAILED = "failed"
PENDING = "pending"
REFUNDED = "refunded"

# Estado em memória das transações simuladas: {transaction_id: {...}}.
_STORE: dict[str, dict] = {}


def _new_transaction_id(idempotency_key: str | None) -> str:
    """Id de transação determinístico quando há idempotency_key.

    Repetir a mesma cobrança (mesma chave) devolve o mesmo transaction_id, tal
    como um gateway real com suporte a idempotência.
    """
    if idempotency_key:
        digest = hashlib.sha1(idempotency_key.encode("utf-8")).hexdigest()[:16]
        return f"SBX-{digest}"
    return f"SBX-{uuid.uuid4().hex[:16]}"


def _decide_outcome(reference: str) -> str:
    forced = (getattr(settings, "PAYMENT_SANDBOX_FORCE", "") or "").strip().lower()
    if forced in ("succeed", "success", "succeeded"):
        return SUCCEEDED
    if forced in ("fail", "failed", "failure"):
        return FAILED
    if forced in ("pending", "pend"):
        return PENDING
    if reference and "FAIL" in reference.upper():
        return FAILED
    return SUCCEEDED


class SandboxGateway(PaymentGateway):
    name = "sandbox"

    def charge(self, amount, reference, phone=None, idempotency_key=None, metadata=None):
        transaction_id = _new_transaction_id(idempotency_key)
        existing = _STORE.get(transaction_id)
        if existing is not None:
            # Idempotência: mesma chave → mesmo resultado, sem cobrar de novo.
            return {
                "transaction_id": transaction_id,
                "status": existing["status"],
                "gateway": self.name,
                "idempotent_replay": True,
                "raw": existing,
            }

        status = _decide_outcome(reference or "")
        record = {
            "transaction_id": transaction_id,
            "status": status,
            "amount": str(amount),
            "reference": reference,
            "phone": phone,
            "metadata": metadata or {},
        }
        _STORE[transaction_id] = record
        return {
            "transaction_id": transaction_id,
            "status": status,
            "gateway": self.name,
            "raw": record,
        }

    def status(self, transaction_id):
        record = _STORE.get(transaction_id)
        return {
            "transaction_id": transaction_id,
            "status": record["status"] if record else "unknown",
            "gateway": self.name,
        }

    def refund(self, transaction_id, amount=None):
        record = _STORE.get(transaction_id)
        if record is not None:
            record["status"] = REFUNDED
        return {
            "refund_id": f"RFND-{transaction_id}",
            "transaction_id": transaction_id,
            "status": REFUNDED,
            "gateway": self.name,
        }

    # --- utilitário de testes/dev: simular um webhook de confirmação ---
    @classmethod
    def simulate_webhook(cls, transaction_id, status=SUCCEEDED):
        record = _STORE.setdefault(transaction_id, {"transaction_id": transaction_id})
        record["status"] = status
        return {
            "event": "charge.updated",
            "gateway": cls.name,
            "data": {"transaction_id": transaction_id, "status": status},
        }

    @classmethod
    def reset(cls):
        """Limpa o estado em memória (usar entre testes)."""
        _STORE.clear()
