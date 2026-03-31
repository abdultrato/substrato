from django.db import transaction


class AtomicTransactionMixin:
    @staticmethod
    def atomic():
        return transaction.atomic()
"""Mixin que envolve execução em transação atômica."""
