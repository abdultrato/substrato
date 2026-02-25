from django.db import transaction


class ServiceResult:
    def __init__(self, success: bool, data=None, error: str | None = None):
        self.success = success
        self.data = data
        self.error = error


class BaseService:
    """
    Base para serviços de domínio.
    """

    @classmethod
    def ok(cls, data=None):
        return ServiceResult(True, data=data)

    @classmethod
    def fail(cls, message: str):
        return ServiceResult(False, error=message)

    @classmethod
    def atomic(cls, func):
        """
        decorator para transações seguras
        """

        def wrapper(*args, **kwargs):
            with transaction.atomic():
                return func(*args, **kwargs)

        return wrapper
