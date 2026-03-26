import logging


class StructuredLoggingMixin:
    logger = logging.getLogger(__name__)

    def log_info(self, message: str, **extra):
        self.logger.info(message, extra=extra or None)

    def log_error(self, message: str, **extra):
        self.logger.error(message, extra=extra or None)
