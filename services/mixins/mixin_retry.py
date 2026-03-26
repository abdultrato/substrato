from infrastructure.utils.retry import retry


class RetryMixin:
    retry = staticmethod(retry)
