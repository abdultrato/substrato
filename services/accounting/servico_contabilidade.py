# servicos/servico_contabilidade.py

from decimal import Decimal

from django.core.exceptions import ValidationError
from django.db import transaction

from apps.accounting.models.legacy_entry import LegacyEntry
from apps.accounting.models.legacy_movement import LegacyMovement


class ServicoContabilidade:
    @staticmethod
    @transaction.atomic
    def criar_lancamento(
        *,
        descricao: str,
        data=None,
        data_contabil=None,
        movimentos: list,
        referencia_externa: str = "",
        inquilino=None,
    ):
        """
        movimentos = [
            {"conta": conta_obj, "debito": Decimal("100.00"), "credito": Decimal("0.00")},
            {"conta": conta_obj, "debito": Decimal("0.00"), "credito": Decimal("100.00")},
        ]
        """

        if len(movimentos) < 2:
            raise ValidationError("Lançamento deve ter pelo menos dois movimentos.")

        data_lancamento = data or data_contabil
        if not data_lancamento:
            raise ValidationError("Data do lançamento é obrigatória.")

        lancamento = LegacyEntry.objects.create(
            descricao=descricao,
            data=data_lancamento,
            referencia_externa=referencia_externa,
            inquilino=inquilino,
        )

        total_debito = Decimal("0.00")
        total_credito = Decimal("0.00")

        for mov in movimentos:
            LegacyMovement.objects.create(
                lancamento=lancamento,
                conta=mov["conta"],
                debito=mov.get("debito", Decimal("0.00")),
                credito=mov.get("credito", Decimal("0.00")),
                inquilino=inquilino,
            )

            total_debito += mov.get("debito", Decimal("0.00"))
            total_credito += mov.get("credito", Decimal("0.00"))

        if total_debito != total_credito:
            raise ValidationError("Lançamento desbalanceado.")

        lancamento.confirmar()

        return lancamento
