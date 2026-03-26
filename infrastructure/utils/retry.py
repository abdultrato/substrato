from __future__ import annotations

from collections.abc import Callable
from functools import wraps
from time import sleep


def retry(times: int = 3, delay: float = 0.0, exceptions=(Exception,)):
    def decorator(func: Callable):
        @wraps(func)
        def wrapper(*args, **kwargs):
            attempt = 0
            while True:
                try:
                    return func(*args, **kwargs)
                except exceptions:
                    attempt += 1
                    if attempt >= times:
                        raise
                    if delay > 0:
                        sleep(delay)

        return wrapper

    return decorator
