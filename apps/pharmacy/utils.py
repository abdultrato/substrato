"""Funções utilitárias para cálculos de estoque."""

from django.db.models import Case, F, IntegerField, Sum, When  # Construções de agregação
from django.db.models.functions import Coalesce  # Troca None por zero

from .models.lot import Lot  # Modelo de lote usado nas consultas


def calculate_initial_stock(product):
    """
    Soma das quantidades iniciais de todos os lotes do produto.
    Útil para reutilizar em views/API/frontend sem duplicar lógica.
    """
    return (
        Lot.objects.filter(product=product)  # Filtra lotes do produto
        .aggregate(total=Sum("initial_quantity"))  # Soma campo initial_quantity
        .get("total")  # Obtém o valor do dicionário agregado
        or 0  # Substitui None por zero
    )


def calculate_current_stock(product):
    """
    Estoque atual = estoque inicial + movimentações (entradas - saídas).
    """
    movements = (
        Lot.objects.filter(product=product)  # Filtra lotes do produto
        .aggregate(
            total=Coalesce(
                Sum(
                    Case(
                        When(movimentos__type="SAI", then=-F("movimentos__quantity")),  # Saídas negativas
                        default=F("movimentos__quantity"),  # Entradas positivas
                        output_field=IntegerField(),  # Tipo inteiro
                    )
                ),
                0,  # Se não houver movimentos, usa zero
            )
        )
        .get("total")
        or 0
    )
    return calculate_initial_stock(product) + movements  # Estoque inicial + movimentações
