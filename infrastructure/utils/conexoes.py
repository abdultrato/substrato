from collections.abc import Callable


def check_connection(probe: Callable[[], object]) -> bool:
    try:
        probe()
    except Exception:
        return False
    return True
