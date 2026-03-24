import logging

logger = logging.getLogger("platform")


def info(msg):
    logger.info(msg)


def error(msg):
    logger.error(msg)


def warning(msg):
    logger.warning(msg)


erro = error
aviso = warning
