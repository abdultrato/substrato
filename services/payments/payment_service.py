from apps.payments.models.payment import Payment
from domain.payments.regras_liquidacao import pagamento_quitado as payment_settled


class PaymentService:
    def register(self, invoice, value, method=Payment.Method.MOBILE_MONEY, external_reference=""):
        payment = Payment.objects.create(
            nome=f"Payment {invoice.id_custom or invoice.pk}",
            inquilino=getattr(invoice, "inquilino", None),
            fatura=invoice,
            valor=value,
            metodo=method,
            referencia_externa=external_reference or "",
        )

        if payment_settled(value, invoice.total):
            payment.confirm()

        return payment


ServicoPagamento = PaymentService
PaymentService.registrar = PaymentService.register
