from services.accounting.accounting_service import AccountingService


class FinancialService:
    def register_revenue(self, payment, debit_account=None, credit_account=None):
        debit_account = debit_account or getattr(payment, "debit_account", None)
        credit_account = credit_account or getattr(payment, "credit_account", None)

        if not debit_account or not credit_account:
            return None

        reference = getattr(payment, "external_reference", "") or str(payment.pk)
        payment_date = getattr(payment, "paid_at", None)

        return AccountingService.create_entry(
            description=f"Payment receipt {getattr(payment, 'custom_id', payment.pk)}",
            date=payment_date.date() if payment_date else None,
            movements=[
                {"account": debit_account, "debit": payment.value, "credit": 0},
                {"account": credit_account, "debit": 0, "credit": payment.value},
            ],
            external_reference=reference,
            tenant=getattr(payment, "tenant", None),
        )
