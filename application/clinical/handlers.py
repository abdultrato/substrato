from __future__ import annotations

from decimal import Decimal, InvalidOperation

from django.core.exceptions import ValidationError
from django.db import transaction

from apps.clinical.models.result_item import ResultItem
from domain.clinical.result_state import ResultState
from domain.clinical.result_state_machine import InvalidTransitionError, ResultStateMachine

from .commands import (
    SaveResultValueCommand,
    StartResultAnalysisCommand,
    ValidateResultCommand,
)


def handle_start_result_analysis(command: StartResultAnalysisCommand) -> ResultItem:
    if command.idempotent and command.result_item.status == ResultState.IN_ANALYSIS:
        return command.result_item

    command.result_item.transition(ResultState.IN_ANALYSIS, user=command.user)
    command.result_item.refresh_from_db()
    return command.result_item


def handle_save_result_value(command: SaveResultValueCommand) -> ResultItem:
    value = _normalize_value(command.raw_value)

    with transaction.atomic():
        locked = (
            ResultItem.all_objects.select_for_update()
            .select_related(
                "result",
                "result__request",
                "result__request__patient",
                "exam_field",
                "exam_field__exam",
            )
            .get(pk=command.result_item.pk)
        )

        if (
            command.idempotent
            and locked.status == ResultState.AWAITING_VALIDATION
            and locked.result_value == value
        ):
            return locked

        try:
            ResultStateMachine.validate_transition(
                locked.status,
                ResultState.AWAITING_VALIDATION,
            )
        except InvalidTransitionError as err:
            raise ValidationError(str(err)) from err

        locked.result_value = value
        locked.status = ResultState.AWAITING_VALIDATION
        locked.save(update_fields=["result_value", "status"])

    locked.refresh_from_db()
    return locked


def handle_validate_result(command: ValidateResultCommand) -> ResultItem:
    if command.idempotent and command.result_item.status == ResultState.VALIDATED:
        return command.result_item

    command.result_item.transition(ResultState.VALIDATED, user=command.user)
    command.result_item.refresh_from_db()
    return command.result_item


def _normalize_value(raw_value) -> Decimal:
    if raw_value is None or (isinstance(raw_value, str) and not raw_value.strip()):
        raise ValidationError({"result_value": "Informe um valor antes de gravar."})

    try:
        return Decimal(str(raw_value).replace(",", "."))
    except (InvalidOperation, TypeError, ValueError) as err:
        raise ValidationError({"result_value": "Valor inválido."}) from err

