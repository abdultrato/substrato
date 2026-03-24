from services.accounting.accounting_service import AccountingService


class FinancialService:
    def register_revenue(self, payment, debit_account=None, credit_account=None):
        debit_account = debit_account or getattr(payment, "debit_account", None)
        credit_account = credit_account or getattr(payment, "credit_account", None)

        if not debit_account or not credit_account:
            return None

        reference = getattr(payment, "referencia_externa", "") or str(payment.pk)
        payment_date = getattr(payment, "pago_em", None)

        return AccountingService.create_entry(
            description=f"Payment receipt {getattr(payment, 'id_custom', payment.pk)}",
            data=payment_date.date() if payment_date else None,
            movements=[
                {"conta": debit_account, "debito": payment.valor, "credito": 0},
                {"conta": credit_account, "debito": 0, "credito": payment.valor},
            ],
            external_reference=reference,
            tenant=getattr(payment, "inquilino", None),
        )


ServicoFinanceiro = FinancialService
FinancialService.registrar_receita = FinancialService.register_revenue
