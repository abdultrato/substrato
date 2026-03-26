from django.db import transaction


class AtomicTransactionMixin:
    @staticmethod
    def atomic():
        return transaction.atomic()
