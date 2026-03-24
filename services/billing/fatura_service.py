from decimal import Decimal

from django.db import transaction

from apps.billing.models.invoice import Invoice
from apps.billing.models.item_fatura import ItemFatura
from domain.billing.calculadora import calcular_totais
from domain.billing.pricing import calcular_preco_item
from services.base import BaseService


class FaturaService(BaseService):
    """
    Application service para operações de fatura.
    """

    # =====================================================
    # CRIAÇÃO
    # =====================================================

    @classmethod
    @transaction.atomic
    def criar(cls, paciente):
        fatura = Invoice.objects.create(
            paciente=paciente,
            estado=Invoice.Estado.RASCUNHO,
        )
        return cls.ok(fatura)

    # =====================================================
    # ITENS
    # =====================================================

    @classmethod
    @transaction.atomic
    def adicionar_item(
        cls,
        fatura: Invoice,
        descricao: str,
        quantidade: Decimal,
        preco_unitario: Decimal,
        desconto_percentual: Decimal = 0,
        acrescimo_percentual: Decimal = 0,
        isento_iva: bool = False,
    ):
        if fatura.estado != Invoice.Estado.RASCUNHO:
            return cls.fail("Não é possível alterar fatura emitida.")

        subtotal = calcular_preco_item(
            preco_base=preco_unitario,
            quantidade=quantidade,
            desconto_percentual=desconto_percentual,
            acrescimo_percentual=acrescimo_percentual,
        )

        ItemFatura.objects.create(
            fatura=fatura,
            descricao=descricao,
            quantidade=quantidade,
            preco_unitario=preco_unitario,
            subtotal=subtotal,
            isento_iva=isento_iva,
        )

        cls._recalcular_totais(fatura)

        return cls.ok(fatura)

    # =====================================================
    # EMISSÃO
    # =====================================================

    @classmethod
    @transaction.atomic
    def emitir(cls, fatura: Invoice):
        if fatura.estado != Invoice.Estado.RASCUNHO:
            return cls.fail("Faturas em rascunho podem ser emitidas.")

        cls._recalcular_totais(fatura)

        fatura.estado = Invoice.Estado.EMITIDA
        fatura.save(update_fields=["estado"])

        return cls.ok(fatura)

    # =====================================================
    # PAGAMENTO
    # =====================================================

    @classmethod
    @transaction.atomic
    def registrar_pagamento(cls, fatura: Invoice):
        if fatura.estado != Invoice.Estado.EMITIDA:
            return cls.fail("Fatura deve estar emitida.")

        fatura.estado = Invoice.Estado.PAGA
        fatura.save(update_fields=["estado"])

        return cls.ok(fatura)

    # =====================================================
    # ANULAÇÃO
    # =====================================================

    @classmethod
    @transaction.atomic
    def anular(cls, fatura: Invoice):
        fatura.estado = Invoice.Estado.ANULADA
        fatura.save(update_fields=["estado"])
        return cls.ok(fatura)

    # =====================================================
    # PRIVADO
    # =====================================================

    @staticmethod
    def _recalcular_totais(fatura: Invoice):
        subtotal, iva, total = calcular_totais(fatura.itens.all())

        fatura.subtotal = subtotal
        fatura.iva_valor = iva
        fatura.total = total

        fatura.save(update_fields=["subtotal", "iva_valor", "total"])
