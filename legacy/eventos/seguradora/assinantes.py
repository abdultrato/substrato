from eventos.seguradora.tipos import AUTORIZACAO_SOLICITADA
from tarefas.autorizacao_worker import processar_autorizacao_task

ASSINANTES = {
    AUTORIZACAO_SOLICITADA: [
        processar_autorizacao_task,
    ],
}
