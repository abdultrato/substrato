from django.db import connection


def verificar_banco():
    try:
        connection.cursor()
        return True
    except Exception:
        return False


def verificar_sistema():
    return {
        "banco_dados": verificar_banco(),
    }
