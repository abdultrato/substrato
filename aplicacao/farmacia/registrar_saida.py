from django.db import transaction

from aplicativos.farmacia.models.movimento import MovimentoEstoque
from dominio.farmacia.regras_estoque import validar_estoque_disponivel


@transaction.atomic
def registrar_saida(lote, quantidade):
    validar_estoque_disponivel(lote, quantidade)

    lote.quantidade_atual -= quantidade
    lote.save(update_fields=["quantidade_atual"])

    MovimentoEstoque.objects.create(
        produto=lote.produto,
        lote=lote,
        tipo="SAI",
        quantidade=quantidade,
    )
