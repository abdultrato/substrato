from services.utils.idempotency import build_idempotency_key


class IdempotencyMixin:
    def build_idempotency_key(self, *parts):
        return build_idempotency_key(*parts)
