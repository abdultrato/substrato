from aplicativos.pagamentos.modelos.pagamento import Pagamento
from dominio.pagamentos.regras_liquidacao import pagamento_quitado

class ServicoPagamento:

    def registrar(self, fatura, valor):
        pagamento = Pagamento.objects.create(
            fatura=fatura,
            valor=valor,
            metodo="mobile_money"
        )

        if pagamento_quitado(valor, fatura.total):
            pagamento.confirmado = True
            pagamento.save()

        return pagamento
