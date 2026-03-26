from legacy.eventos.seguradora.tipos import AUTORIZACAO_SOLICITADA
from tasks.authorization_worker import process_authorization_task

ASSINANTES = {
    AUTORIZACAO_SOLICITADA: [
        process_authorization_task,
    ],
}
