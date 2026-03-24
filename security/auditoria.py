import logging

logger = logging.getLogger("security.auditoria")


def registrar_acao(usuario, acao):
    logger.info(
        "acao_usuario",
        extra={
            "usuario_id": getattr(usuario, "id", None),
            "usuario": str(usuario),
            "acao": acao,
        },
    )
