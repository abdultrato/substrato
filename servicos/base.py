# servicos/base.py

from django.db import transaction
from functools import wraps


class ServiceResult:
    def __init__(self, success: bool, data=None, error: str | None = None):
        self.success = success
        self.data = data
        self.error = error


class BaseService:

    @classmethod
    def ok(cls, data=None):
        return ServiceResult(True, data=data)

    @classmethod
    def fail(cls, message: str):
        return ServiceResult(False, error=message)

    @staticmethod
    def atomic(func):
        @wraps(func)
        def wrapper(*args, **kwargs):
            with transaction.atomic():
                return func(*args, **kwargs)

        return wrapper
