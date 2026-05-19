from django.db import transaction

from frontend.billing.models.result_item import ResultItem

from ..base import BaseService


class ResultadoService(BaseService):
    @classmethod
    @transaction.atomic
    def registrar_resultado(cls, resultado: ResultItem, valor, usuario=None):
        resultado.resultado = valor

        if valor not in (None, "", " "):
            resultado.validado = True
            if usuario:
                resultado.validado_por = usuario
        else:
            resultado.validado = False
            resultado.validado_por = None

        resultado.save(update_fields=["resultado", "validado", "validado_por", "atualizado_em"])

        return cls.ok(resultado)

    @classmethod
    @transaction.atomic
    def validar(cls, resultado: ResultItem, usuario):
        resultado.validado = True
        resultado.validado_por = usuario
        resultado.save(update_fields=["validado", "validado_por"])
        return cls.ok(resultado)
