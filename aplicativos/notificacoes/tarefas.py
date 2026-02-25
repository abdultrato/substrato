from .servicos import ServicoNotificacao

def enviar_notificacao_async(destino, mensagem, canal):
    ServicoNotificacao().enviar(destino, mensagem, canal)
