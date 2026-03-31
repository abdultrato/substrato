from collections.abc import Callable


def check_connection(probe: Callable[[], object]) -> bool:
    try:
        probe()
    except Exception:
        return False
    return True
"""Helpers para obter/reusar conexões externas (e.g., banco, serviços)."""
