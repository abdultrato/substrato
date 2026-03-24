from django.core.exceptions import ValidationError
from django.utils import timezone


class LedgerPolicy:
    @staticmethod
    def can_reverse(entry):
        """
        Checks whether a ledger entry can be reversed.
        """

        if entry.revertido:
            raise ValidationError("Este lançamento já foi revertido.")

        if entry.reverso_de_id:
            raise ValidationError("Não é permitido reverter uma reversão.")

        if LedgerPolicy._is_closed_period(entry):
            raise ValidationError("Período contábil fechado. Reversão bloqueada.")

        return True

    @staticmethod
    def can_change(entry):
        """
        LedgerEntry objects are immutable.
        """

        raise ValidationError("LedgerEntry é imutável.")

    @staticmethod
    def can_delete(entry):
        """
        LedgerEntry objects cannot be removed.
        """

        raise ValidationError("LedgerEntry não pode ser removido.")

    @staticmethod
    def can_change_account_type(conta):
        """
        The account type cannot change after usage.
        """

        if conta.tem_movimentacao():
            raise ValidationError("Não é permitido alterar tipo de conta com histórico.")

        return True

    @staticmethod
    def can_deactivate_account(conta):
        """
        An account with balance cannot be deactivated.
        """

        if hasattr(conta, "saldo") and conta.saldo.saldo_atual != 0:
            raise ValidationError("Conta com saldo diferente de zero não pode ser desativada.")

        return True

    @staticmethod
    def validate_balanced_entries(total_debito, total_credito):
        if total_debito != total_credito:
            raise ValidationError("Partidas desbalanceadas.")

    @staticmethod
    def validate_minimum_lines(qtd_linhas):
        if qtd_linhas < 2:
            raise ValidationError("Lançamento deve possuir no mínimo duas linhas.")

    @staticmethod
    def _is_closed_period(entry):
        """
        Simple example: block entries older than 90 days.
        """

        today = timezone.localdate()
        delta = (today - entry.data_contabil).days
        return delta > 90

    @staticmethod
    def validate_tenant(entry, inquilino):
        if entry.inquilino_id != inquilino.id:
            raise ValidationError("Operação não autorizada para este inquilino.")

        return True


PoliticaLedger = LedgerPolicy
LedgerPolicy.pode_reverter = staticmethod(LedgerPolicy.can_reverse)
LedgerPolicy.pode_alterar = staticmethod(LedgerPolicy.can_change)
LedgerPolicy.pode_deletar = staticmethod(LedgerPolicy.can_delete)
LedgerPolicy.pode_alterar_tipo_conta = staticmethod(LedgerPolicy.can_change_account_type)
LedgerPolicy.pode_desativar_conta = staticmethod(LedgerPolicy.can_deactivate_account)
LedgerPolicy.validar_partidas_balanceadas = staticmethod(LedgerPolicy.validate_balanced_entries)
LedgerPolicy.validar_minimo_linhas = staticmethod(LedgerPolicy.validate_minimum_lines)
LedgerPolicy.validar_inquilino = staticmethod(LedgerPolicy.validate_tenant)
LedgerPolicy._periodo_fechado = staticmethod(LedgerPolicy._is_closed_period)
