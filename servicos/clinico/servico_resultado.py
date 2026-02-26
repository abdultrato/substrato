from django.db import transaction
from dominio.clinico.interpretador_resultado import InterpretadorResultado


class ServicoResultado:

    @staticmethod
    @transaction.atomic
    def atualizar_valor(resultado_item, valor):

        resultado_item.resultado = valor
        resultado_item.save(update_fields=["resultado"])

        interpretacao = InterpretadorResultado.interpretar(resultado_item)

        resultado_item.status_clinico = interpretacao["status_clinico"]
        resultado_item.cor_laudo = interpretacao["cor_laudo"]
        resultado_item.alerta_critico = interpretacao["alerta_critico"]
        resultado_item.delta_alerta = interpretacao["delta_alerta"]
        resultado_item.tendencia = interpretacao["tendencia"]
        resultado_item.interpretacao = interpretacao["interpretacao"]

        resultado_item.save()
