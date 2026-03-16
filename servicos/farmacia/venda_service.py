# aplicacao/farmacia/venda_service.py

from django.core.exceptions import ValidationError
from django.db import transaction
from django.utils import timezone
from farmacia.models import ItemVenda
from farmacia.services.estoque_service import EstoqueService


class VendaService:
    @staticmethod
    @transaction.atomic
    def adicionar_item(venda, produto, quantidade, preco_unitario):

        # Criar item
        item = ItemVenda.objects.create(
            venda=venda,
            produto=produto,
            quantidade=quantidade,
            preco_unitario=preco_unitario,
        )

        # Selecionar lote automaticamente (FEFO)
        lote = produto.lotes.filter(validade__gte=timezone.localdate()).order_by("validade").first()

        if not lote:
            raise ValidationError("Nenhum lote disponível.")

        # Baixar estoque
        EstoqueService.registrar_saida(lote, quantidade)

        return item
