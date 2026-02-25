from decimal import Decimal as d

from django.db import transaction as t

from frontend.billing.models.fatura import Fatura as f

from .base import BaseService as bs


class FaturaService(bs):
    @classmethod
    @t.atomic
    def emitir(cls, fatura: f):
        if fatura.estado != f.Estado.RASCUNHO:
            return cls.fail("Apenas faturas em rascunho podem ser emitidas.")

        fatura.recalcular_totais(save=True)
        fatura.estado = f.Estado.EMITIDA
        fatura.save(update_fields=["estado"])

        return cls.ok(fatura)

    @classmethod
    @t.atomic
    def registrar_pagamento(cls, fatura: f):
        if fatura.estado != f.Estado.EMITIDA:
            return cls.fail("Fatura precisa estar emitida.")

        fatura.estado = f.Estado.PAGA
        fatura.save(update_fields=["estado"])

        return cls.ok(fatura)

    @classmethod
    @t.atomic
    def aplicar_seguro(cls, fatura: f, percentual: d):
        if percentual < 0 or percentual > 100:
            return cls.fail("Percentual inválido.")

        fatura.cobertura_seguro_percent = percentual
        fatura.recalcular_totais(save=True)

        return cls.ok(fatura)

    @classmethod
    @t.atomic
    def anular(cls, fatura: f):
        fatura.estado = f.Estado.ANULADA
        fatura.save(update_fields=["estado"])
        return cls.ok(fatura)
