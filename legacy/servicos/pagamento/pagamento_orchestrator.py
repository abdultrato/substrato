from frontend.billing.models.historico import HistoricoFinanceiro
from frontend.payments.models.receipt import Receipt


def registrar_pagamento(pagamento):
    """
    Orquestra ações após registro de um pagamento.

    ✔ gera recibo
    ✔ registra histórico financeiro
    ✔ mantém rastreabilidade auditável
    """

    # ==============================
    # GERAR RECIBO
    # ==============================
    Receipt.objects.create(
        fatura=pagamento.fatura,
        pagamento=pagamento,
        numero=f"REC-{pagamento.id}",
        valor=pagamento.valor,
    )

    # ==============================
    # REGISTRAR HISTÓRICO
    # ==============================
    HistoricoFinanceiro.objects.create(
        fatura=pagamento.fatura,
        tipo_evento=HistoricoFinanceiro.TipoEvento.PAGAMENTO,
        descricao="Pagamento registrado",
        valor=pagamento.valor,
        referencia_externa=pagamento.referencia,
    )

    # ==============================
    # ATUALIZAR ESTADO DA FATURA
    # ==============================
    pagamento.fatura.atualizar_estado_pagamento()
