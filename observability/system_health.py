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


verificar_banco = verify_database
verificar_sistema = verify_system
