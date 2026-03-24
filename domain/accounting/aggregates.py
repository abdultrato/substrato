from decimal import Decimal

from domain.accounting.exceptions import UnbalancedEntriesError


class LedgerAggregate:
    def __init__(self, lines):
        self.lines = lines

    def validate(self):
        debits = sum(
            (
                getattr(line.valor, "valor", line.valor)
                for line in self.lines
                if getattr(line.natureza, "tipo", line.natureza) == "D"
            ),
            Decimal("0.00"),
        )
        credits = sum(
            (
                getattr(line.valor, "valor", line.valor)
                for line in self.lines
                if getattr(line.natureza, "tipo", line.natureza) == "C"
            ),
            Decimal("0.00"),
        )

        if debits != credits:
            raise UnbalancedEntriesError()


LedgerAggregate.validar = LedgerAggregate.validate
