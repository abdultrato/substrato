from decimal import Decimal

from domain.accounting.exceptions import UnbalancedEntriesError


class LedgerAggregate:
    def __init__(self, lines):
        self.lines = lines

    def validate(self):
        debits = sum(
            (
                getattr(line.value, "value", line.value)
                for line in self.lines
                if getattr(line.nature, "type", line.nature) == "D"
            ),
            Decimal("0.00"),
        )
        credits = sum(
            (
                getattr(line.value, "value", line.value)
                for line in self.lines
                if getattr(line.nature, "type", line.nature) == "C"
            ),
            Decimal("0.00"),
        )

        if debits != credits:
            raise UnbalancedEntriesError()


LedgerAggregate.validar = LedgerAggregate.validate
