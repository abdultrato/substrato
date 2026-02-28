from tarefas.autorizacao_worker import processar_autorizacao
from eventos.tipos import AUTORIZACAO_SOLICITADA


ASSINANTES = {
    AUTORIZACAO_SOLICITADA: [
        processar_autorizacao,
    ],
}
