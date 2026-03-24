from .care_flow import (
    create_invoice_for_checkin,
    create_request_for_checkin,
    execute_full_flow,
    get_care_summary,
    open_checkin,
    register_payment_for_checkin,
)

__all__ = [
    "create_invoice_for_checkin",
    "create_request_for_checkin",
    "execute_full_flow",
    "get_care_summary",
    "open_checkin",
    "register_payment_for_checkin",
]


abrir_checkin = open_checkin
criar_fatura_para_checkin = create_invoice_for_checkin
criar_requisicao_para_checkin = create_request_for_checkin
executar_fluxo_completo = execute_full_flow
obter_resumo_atendimento = get_care_summary
registrar_pagamento_para_checkin = register_payment_for_checkin
