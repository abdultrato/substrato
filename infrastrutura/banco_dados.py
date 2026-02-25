from django.db import connection

def consultas_ativas():
    return connection.queries
