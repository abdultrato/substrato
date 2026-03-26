def chunked(iterable, size: int):
    if size <= 0:
        raise ValueError("size deve ser maior que zero.")

    batch = []
    for item in iterable:
        batch.append(item)
        if len(batch) == size:
            yield batch
            batch = []

    if batch:
        yield batch
