from apps.payments.models.pagamento import Payment
from domain.payments.regras_liquidacao import pagamento_quitado


class ServicoPagamento:
    def registrar(self, fatura, valor):
        pagamento = Payment.objects.create(fatura=fatura, valor=valor, metodo="mobile_money")

        if pagamento_quitado(valor, fatura.total):
            pagamento.confirmado = True
            pagamento.save()

        return pagamento
