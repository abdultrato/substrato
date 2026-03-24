from django.db import transaction

from apps.pharmacy.models.sale_item import SaleItem


class SaleService:
    @staticmethod
    @transaction.atomic
    def add_item(sale, product, quantity, unit_price=None):
        return SaleItem.objects.create(
            nome=f"Item {product.nome}",
            inquilino=getattr(sale, "inquilino", None),
            venda=sale,
            produto=product,
            quantidade=quantity,
            preco_unitario=unit_price if unit_price is not None else product.preco_venda,
        )


VendaService = SaleService
SaleService.adicionar_item = SaleService.add_item
