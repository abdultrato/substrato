def partition_list(items, size: int):
    if size <= 0:
        raise ValueError("size deve ser maior que zero.")
    return [items[index : index + size] for index in range(0, len(items), size)]
"""Funções auxiliares de particionamento de dados."""
