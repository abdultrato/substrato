from apps.payments.models.payment import Payment
from domain.payments.settlement_rules import payment_quitado as payment_settled


class PaymentService:
    def register(self, invoice, value, method=Payment.Method.MOBILE_MONEY, external_reference=""):
        payment = Payment.objects.create(
            name=f"Payment {invoice.custom_id or invoice.pk}",
            tenant=getattr(invoice, "tenant", None),
            invoice=invoice,
            value=value,
            method=method,
            external_reference=external_reference or "",
        )

        if payment_settled(value, invoice.total):
            payment.confirm()

        return payment
