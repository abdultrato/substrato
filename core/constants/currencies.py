"""ISO 4217 — Códigos internacionais de moeda."""

from django.db import models


class Currency(models.TextChoices):
    """ISO 4217 — códigos de moeda usados no sistema."""

    MZN = "MZN", "Metical Moçambicano"
    ZAR = "ZAR", "Rand Sul-Africano"
    USD = "USD", "Dólar Americano"
    EUR = "EUR", "Euro"
    GBP = "GBP", "Libra Esterlina"
    BRL = "BRL", "Real Brasileiro"
    CNY = "CNY", "Yuan Chinês"
    INR = "INR", "Rúpia Indiana"
    JPY = "JPY", "Iene Japonês"
    AUD = "AUD", "Dólar Australiano"


__all__ = ["Currency"]
