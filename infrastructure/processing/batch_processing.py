# infraestrutura/processamento/batch_processing.py

from collections.abc import Callable


def process_in_batches(
    queryset,
    batch_size: int = 500,
    handler: Callable | None = None,
):
    """
    Processa queryset em batches eficientes.
    """

    total = queryset.count()
    start = 0

    while start < total:
        batch = queryset[start : start + batch_size]

        for item in batch:
            if handler:
                handler(item)

        start += batch_size


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


processar_em_lotes = process_in_batches
