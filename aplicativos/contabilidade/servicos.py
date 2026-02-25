from .modelos.lancamento import Lancamento
from .modelos.movimento import Movimento

class ServicoContabil:

    def registrar_lancamento(self, descricao, movimentos):
        lancamento = Lancamento.objects.create(descricao=descricao)

        for mov in movimentos:
            Movimento.objects.create(
                lancamento=lancamento,
                conta=mov["conta"],
                debito=mov.get("debito", 0),
                credito=mov.get("credito", 0),
            )

        return lancamento
