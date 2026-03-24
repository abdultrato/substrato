from decimal import Decimal


class PagamentoGateway:
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


class GatewaySimulado(PagamentoGateway):
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


def processar_pagamento_gateway(pagamento, gateway: PagamentoGateway):
    """
    Processa pagamento usando gateway externo.
    """

    resposta = gateway.cobrar(
        valor=pagamento.valor,
        referencia=pagamento.id_custom,
    )

    if resposta.get("sucesso"):
        pagamento.referencia = resposta.get("transacao_id", "")
        pagamento.confirmado = True
        pagamento.save(update_fields=["referencia", "confirmado", "atualizado_em"])
    else:
        pagamento.confirmado = False
        pagamento.save(update_fields=["confirmado", "atualizado_em"])

    return resposta
