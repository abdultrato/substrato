import logging

logger = logging.getLogger("security.audit")


def register_action(user, action):
    logger.info(
        "acao_user",
        extra={
            "user_id": getattr(user, "id", None),
            "user": str(user),
            "acao": action,
        },
    )


registrar_acao = register_action
