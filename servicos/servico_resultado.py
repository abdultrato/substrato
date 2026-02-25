from aplicativos.clinico.modelos.resultado import Resultado
from dominio.clinico.validacao_resultados import resultado_critico

class ServicoResultado:

    def registrar(self, amostra, exame, valor, limite):
        critico = resultado_critico(valor, limite)

        resultado = Resultado.objects.create(
            amostra=amostra,
            exame=exame,
            valor=valor,
            validado=True
        )

        if critico:
            # aqui poderia publicar evento crítico
            pass

        return resultado
