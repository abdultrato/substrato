from events.insurer.tipos import AUTORIZACAO_SOLICITADA
from tasks.autorizacao_worker import processar_autorizacao_task

ASSINANTES = {
    AUTORIZACAO_SOLICITADA: [
        processar_autorizacao_task,
    ],
}
