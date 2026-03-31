from django.db import connection


def verify_database():
    try:
        connection.cursor()
        return True
    except Exception:
        return False


def verify_system():
    return {
        "banco_dados": verify_database(),
    }


__all__ = ["verify_database", "verify_system"]
"""Rotinas para avaliar indicadores de saúde do sistema."""
