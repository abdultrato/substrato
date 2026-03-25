from django.db import models


class Moeda(models.TextChoices):
    """
    ISO 4217 — Códigos internacionais de currency.
    """

    MZN = "MZN", "Metical Moçambicano"
    ZAR = "ZAR", "Rand Sul-Africano"
    USD = "USD", "Dólar Americano"
    EUR = "EUR", "Euro"
    GBP = "GBP", "Libra Esterlina"
    BRL = "BRL", "Real Brasileiro"
    CNY = "CNY", "Yuan Chinês"
    INR = "INR", "Rupia Indiana"
    JPY = "JPY", "Iene Japonês"
    AUD = "AUD", "Dólar Australiano"
