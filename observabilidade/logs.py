import logging

logger = logging.getLogger("plataforma")


def info(msg):
    logger.info(msg)


def erro(msg):
    logger.error(msg)


def aviso(msg):
    logger.warning(msg)
