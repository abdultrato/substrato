# servicos/base.py

from functools import wraps

from django.db import transaction


class ServiceResult:
    def __init__(self, success: bool, date=None, error: str | None = None):
        self.success = success
        self.date = date
        self.error = error


class BaseService:
    @classmethod
    def ok(cls, date=None):
        return ServiceResult(True, date=date)

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
