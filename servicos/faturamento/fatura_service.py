from decimal import Decimal
from django.db import transaction

from aplicativos.faturamento.modelos.fatura import Fatura
from aplicativos.faturamento.modelos.item_fatura import ItemFatura
from dominio.faturamento.calculadora import calcular_totais
from dominio.faturamento.pricing import calcular_preco_item
from servicos.base import BaseService


class FaturaService(BaseService):
    """
    Application Service responsável por:

    ✔ criar faturas
    ✔ adicionar itens
    ✔ recalcular totais
    ✔ emitir
    ✔ registrar pagamento
    ✔ anular
    """

    # =====================================================
    # CRIAÇÃO
    # =====================================================

    @classmethod
    @transaction.atomic
    def criar(cls, paciente):
        fatura = Fatura.objects.create(
            paciente=paciente,
            estado=Fatura.Estado.RASCUNHO,
        )
        return cls.ok(fatura)

    # =====================================================
    # ITENS
    # =====================================================

    @classmethod
    @transaction.atomic
    def adicionar_item(
        cls,
        fatura: Fatura,
        descricao: str,
        quantidade: Decimal,
        preco_unitario: Decimal,
        desconto_percentual: Decimal = 0,
        acrescimo_percentual: Decimal = 0,
        isento_iva: bool = False,
    ):
        if fatura.estado != Fatura.Estado.RASCUNHO:
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
    def emitir(cls, fatura: Fatura):
        if fatura.estado != Fatura.Estado.RASCUNHO:
            return cls.fail("Apenas faturas em rascunho podem ser emitidas.")

        cls._recalcular_totais(fatura)

        fatura.estado = Fatura.Estado.EMITIDA
        fatura.save(update_fields=["estado"])

        return cls.ok(fatura)

    # =====================================================
    # PAGAMENTO
    # =====================================================

    @classmethod
    @transaction.atomic
    def registrar_pagamento(cls, fatura: Fatura):
        if fatura.estado != Fatura.Estado.EMITIDA:
            return cls.fail("Fatura deve estar emitida.")

        fatura.estado = Fatura.Estado.PAGA
        fatura.save(update_fields=["estado"])

        return cls.ok(fatura)

    # =====================================================
    # ANULAÇÃO
    # =====================================================

    @classmethod
    @transaction.atomic
    def anular(cls, fatura: Fatura):
        fatura.estado = Fatura.Estado.ANULADA
        fatura.save(update_fields=["estado"])
        return cls.ok(fatura)

    # =====================================================
    # PRIVADO
    # =====================================================

    @staticmethod
    def _recalcular_totais(fatura: Fatura):
        subtotal, iva, total = calcular_totais(fatura.itens.all())

        fatura.subtotal = subtotal
        fatura.iva_valor = iva
        fatura.total = total

        fatura.save(update_fields=["subtotal", "iva_valor", "total"])
