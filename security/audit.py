import logging

logger = logging.getLogger("security.audit")


def register_action(user, action):
    logger.info(
        "acao_usuario",
        extra={
            "usuario_id": getattr(user, "id", None),
            "usuario": str(user),
            "acao": action,
        },
    )


registrar_acao = register_action
