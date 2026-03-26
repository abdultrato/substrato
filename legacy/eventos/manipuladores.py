from apps.clinical.models.result import Result
from apps.payments.models.payment import Payment
from services.notifications.financial_service import FinancialService
from services.notifications.notification_service import CommunicationService

from .assinantes import registrar
from .tipos import PagamentoConfirmado, ResultadoLiberado


def notificar_resultado(evento):
    resultado = Result.objects.get(id=evento.resultado_id)
    paciente = resultado.request.patient

    CommunicationService().notify_result_ready(paciente)


def registrar_pagamento(evento):
    pagamento = Payment.objects.get(id=evento.pagamento_id)
    FinancialService().register_revenue(pagamento)


registrar(ResultadoLiberado, notificar_resultado)
registrar(PagamentoConfirmado, registrar_pagamento)
