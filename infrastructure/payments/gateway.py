from decimal import Decimal


class PaymentGateway:
    """
    Interface base para integração com provedores externos
    (Mobile Money, POS, bancos, gateways online).
    """

    def cobrar(self, valor, referencia, **kwargs):
        """
        Realisa uma cobrança no provedor externo.

        Deve retornar:
        {
            "sucesso": bool,
            "transacao_id": str,
            "mensagem": str,
        }
        """
        raise NotImplementedError


class SimulatedGateway(PaymentGateway):
    """
    Gateway de teste para desenvolvimento.
    """

    def cobrar(self, valor, referencia, **kwargs):
        valor = Decimal(valor).quantize(Decimal("0.01"))

        return {
            "sucesso": True,
            "transacao_id": f"SIM-{referencia}",
            "mensagem": f"Pagamento simulado aprovado ({valor})",
        }


def process_payment_gateway(payment, gateway: PaymentGateway):
    """
    Processa pagamento usando gateway externo.
    """

    resposta = gateway.cobrar(
        valor=payment.valor,
        referencia=payment.id_custom,
    )

    if resposta.get("sucesso"):
        payment.referencia = resposta.get("transacao_id", "")
        payment.confirmado = True
        payment.save(update_fields=["referencia", "confirmado", "atualizado_em"])
    else:
        payment.confirmado = False
        payment.save(update_fields=["confirmado", "atualizado_em"])

    return resposta


PagamentoGateway = PaymentGateway
GatewaySimulado = SimulatedGateway
processar_pagamento_gateway = process_payment_gateway
