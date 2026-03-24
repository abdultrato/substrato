# farmacia/services/estoque_service.py

from django.core.exceptions import ValidationError
from django.db import models, transaction
from django.db.models import Sum
from pharmacy.models import Lot, InventoryMovement, TipoMovimento


class EstoqueService:
    @staticmethod
    def saldo_lote(lote):
        resultado = InventoryMovement.objects.filter(lote=lote, deletado=False).aggregate(
            total=Sum(
                models.Case(
                    models.When(tipo=TipoMovimento.SAIDA, then=-models.F("quantidade")),
                    default=models.F("quantidade"),
                    output_field=models.IntegerField(),
                )
            )
        )

        return resultado["total"] or 0

    @staticmethod
    @transaction.atomic
    def registrar_entrada(lote, quantidade):
        InventoryMovement.objects.create(
            produto=lote.produto,
            lote=lote,
            tipo=TipoMovimento.ENTRADA,
            quantidade=quantidade,
        )

    @staticmethod
    @transaction.atomic
    def registrar_saida(lote, quantidade):

        # LOCK pessimista
        lote = Lot.objects.select_for_update().get(pk=lote.pk)

        saldo = EstoqueService.saldo_lote(lote)

        if saldo < quantidade:
            raise ValidationError("Estoque insuficiente.")

        InventoryMovement.objects.create(
            produto=lote.produto,
            lote=lote,
            tipo=TipoMovimento.SAIDA,
            quantidade=quantidade,
        )
