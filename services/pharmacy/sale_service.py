from django.db import transaction

from apps.pharmacy.models.sale_item import SaleItem


class SaleService:
    @staticmethod
    @transaction.atomic
    def add_item(sale, product, quantity, unit_price=None):
        return SaleItem.objects.create(
            name=f"Item {product.name}",
            tenant=getattr(sale, "tenant", None),
            sale=sale,
            product=product,
            quantity=quantity,
            unit_price=unit_price if unit_price is not None else product.sale_price,
        )


"""Processa vendas de itens de farmácia."""
