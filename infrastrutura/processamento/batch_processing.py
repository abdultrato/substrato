# infraestrutura/processamento/batch_processing.py

from collections.abc import Callable


def processar_em_lotes(
    queryset,
    tamanho_lote: int = 500,
    handler: Callable | None = None,
):
    """
    Processa queryset em batches eficientes.
    """

    total = queryset.count()
    inicio = 0

    while inicio < total:
        lote = queryset[inicio : inicio + tamanho_lote]

        for objeto in lote:
            if handler:
                handler(objeto)

        inicio += tamanho_lote


def iterar_em_chunks(queryset, chunk_size=1000):
    """
    Iteração eficiente usando primary key.
    """

    ultimo_id = None

    while True:
        lote = queryset.filter(id__gt=ultimo_id if ultimo_id else 0).order_by("id")[:chunk_size]

        if not lote:
            break

        for obj in lote:
            yield obj
            ultimo_id = obj.id
