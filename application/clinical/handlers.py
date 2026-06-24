from __future__ import annotations

from decimal import Decimal, InvalidOperation

from django.core.exceptions import ValidationError
from django.db import transaction
from django.utils import timezone

from apps.clinical.models.result_item import ResultItem
from domain.clinical.events import ResultValidatedEvent
from domain.clinical.result_state import ResultState
from domain.clinical.result_state_machine import InvalidTransitionError, ResultStateMachine
from events.bus import event_bus

from .commands import (
    DisregardEmptyRequestResultsCommand,
    DisregardResultCommand,
    SaveResultValueCommand,
    StartResultAnalysisCommand,
    ValidateRequestResultsCommand,
    ValidateResultCommand,
)


def handle_start_result_analysis(command: StartResultAnalysisCommand) -> ResultItem:
    if command.idempotent and command.result_item.status == ResultState.IN_ANALYSIS:
        return command.result_item

    command.result_item.transition(ResultState.IN_ANALYSIS, user=command.user)
    command.result_item.refresh_from_db()
    return command.result_item


def handle_save_result_value(command: SaveResultValueCommand) -> ResultItem:
    with transaction.atomic():
        locked = (
            ResultItem.all_objects.select_for_update()
            .select_related(
                "result",
                "result__request",
                "result__request__patient",
                "exam_field",
                "exam_field__test",
            )
            .get(pk=command.result_item.pk)
        )

        result_type = getattr(getattr(locked, "exam_field", None), "result_type", "numero") or "numero"
        is_numeric = result_type == "numero"

        if locked.status == ResultState.VALIDATED:
            raise ValidationError("Resultado validado não pode ser alterado.")
        if locked.status == ResultState.DISREGARDED:
            raise ValidationError("Resultado desconsiderado não pode receber valor.")

        if is_numeric:
            value = _normalize_value(command.raw_value)
            if (
                command.idempotent
                and locked.status == ResultState.AWAITING_VALIDATION
                and locked.result_value == value
            ):
                return locked
            locked.result_value = value
            update_fields = ["result_value", "status"]
        else:
            text_val = (command.raw_value or "").strip()
            if not text_val:
                raise ValidationError({"result_value": "Informe um valor antes de gravar."})
            if (
                command.idempotent
                and locked.status == ResultState.AWAITING_VALIDATION
                and locked.result_text == text_val
            ):
                return locked
            locked.result_text = text_val
            locked.result_value = None
            update_fields = ["result_text", "result_value", "status"]

        locked.status = ResultState.AWAITING_VALIDATION
        locked.save(update_fields=update_fields)

    locked.refresh_from_db()
    return locked


def handle_validate_result(command: ValidateResultCommand) -> ResultItem:
    if command.idempotent and command.result_item.status == ResultState.VALIDATED:
        return command.result_item

    command.result_item.transition(ResultState.VALIDATED, user=command.user)
    command.result_item.refresh_from_db()
    return command.result_item


def handle_disregard_result(command: DisregardResultCommand) -> ResultItem:
    reason = _normalize_optional_reason(command.reason)

    with transaction.atomic():
        locked = (
            ResultItem.all_objects.select_for_update()
            .select_related("result", "result__request", "exam_field")
            .get(pk=command.result_item.pk)
        )
        _disregard_locked_result_item(
            locked,
            reason=reason,
            user=command.user,
            idempotent=command.idempotent,
        )

    locked.refresh_from_db()
    return locked


def handle_disregard_empty_request_results(command: DisregardEmptyRequestResultsCommand) -> dict[str, int]:
    reason = _normalize_reason(command.reason)
    summary = {"disregarded": 0, "skipped_with_value": 0, "already_disregarded": 0, "already_validated": 0}

    with transaction.atomic():
        items = _request_result_items_for_update(command.lab_request)

        for item in items:
            if item.status == ResultState.VALIDATED:
                summary["already_validated"] += 1
                continue
            if item.status == ResultState.DISREGARDED:
                summary["already_disregarded"] += 1
                continue
            if item.result_value is not None:
                summary["skipped_with_value"] += 1
                continue

            _disregard_locked_result_item(
                item,
                reason=reason,
                user=command.user,
                idempotent=command.idempotent,
            )
            summary["disregarded"] += 1

    command.lab_request.refresh_from_db()
    return summary


def handle_validate_request_results(command: ValidateRequestResultsCommand) -> dict[str, int]:
    summary = {
        "validated_results": 0,
        "validated_disregards": 0,
        "skipped_empty": 0,
        "already_validated": 0,
    }
    validated_result_ids: list[int] = []

    with transaction.atomic():
        items = _request_result_items_for_update(command.lab_request)
        incomplete = [
            item
            for item in items
            if item.status in {ResultState.PENDING, ResultState.IN_ANALYSIS, ResultState.REJECTED}
            or (item.status not in {ResultState.VALIDATED, ResultState.DISREGARDED} and item.result_value is None)
        ]
        if incomplete:
            raise ValidationError("Preencha ou desconsidere todos os campos antes de validar a requisição.")

        for item in items:
            if item.status == ResultState.VALIDATED:
                summary["already_validated"] += 1
                continue

            if item.status == ResultState.DISREGARDED:
                if item.disregard_validation_date:
                    summary["validated_disregards"] += 1
                    continue
                item.disregard_validated_by = command.user
                item.disregard_validation_date = timezone.now()
                item.save(update_fields=["disregard_validated_by", "disregard_validation_date"])
                summary["validated_disregards"] += 1
                continue

            if item.result_value is None:
                summary["skipped_empty"] += 1
                continue

            _validate_entered_locked_result_item(item, user=command.user)
            validated_result_ids.append(item.id)
            summary["validated_results"] += 1

    for result_id in validated_result_ids:
        event_bus.publish_after_commit(ResultValidatedEvent(result_id=result_id))

    command.lab_request.refresh_from_db()
    return summary


def _normalize_value(raw_value) -> Decimal:
    if raw_value is None or (isinstance(raw_value, str) and not raw_value.strip()):
        raise ValidationError({"result_value": "Informe um valor antes de gravar."})

    try:
        return Decimal(str(raw_value).replace(",", "."))
    except (InvalidOperation, TypeError, ValueError) as err:
        raise ValidationError({"result_value": "Valor inválido."}) from err


def _normalize_reason(raw_reason) -> str:
    reason = str(raw_reason or "").strip()
    if len(reason) < 5:
        raise ValidationError({"reason": "Explique o motivo da desconsideração com pelo menos 5 caracteres."})
    return reason


def _normalize_optional_reason(raw_reason) -> str:
    return str(raw_reason or "").strip()


def _request_result_items_for_update(lab_request):
    result = lab_request.create_result()
    return list(
        ResultItem.all_objects.select_for_update()
        .select_related("result", "result__request", "exam_field")
        .filter(result=result)
        .order_by("position", "id")
    )


def _disregard_locked_result_item(
    item: ResultItem,
    *,
    reason: str,
    user,
    idempotent: bool,
) -> None:
    if item.status == ResultState.VALIDATED:
        raise ValidationError("Resultado validado não pode ser desconsiderado.")
    if item.result_value is not None:
        raise ValidationError("Resultado com valor inserido não pode ser desconsiderado.")
    if idempotent and item.status == ResultState.DISREGARDED and item.disregard_reason == reason:
        return

    try:
        ResultStateMachine.validate_transition(item.status, ResultState.DISREGARDED)
    except InvalidTransitionError as err:
        raise ValidationError(str(err)) from err

    item.status = ResultState.DISREGARDED
    item.disregard_reason = reason
    item.disregarded_by = user
    item.disregarded_at = timezone.now()
    item.disregard_validated_by = None
    item.disregard_validation_date = None
    item.clinical_status = ""
    item.report_color = ""
    item.critical_alert = False
    item.save(
        update_fields=[
            "status",
            "disregard_reason",
            "disregarded_by",
            "disregarded_at",
            "disregard_validated_by",
            "disregard_validation_date",
            "clinical_status",
            "report_color",
            "critical_alert",
        ]
    )


def _validate_entered_locked_result_item(item: ResultItem, *, user) -> None:
    item.validated_by = user
    item.validation_date = timezone.now()
    item._result_service().interpret(item)
    item.status = ResultState.VALIDATED
    item.save(
        update_fields=[
            "status",
            "validated_by",
            "validation_date",
            "clinical_status",
            "report_color",
            "critical_alert",
            "result_value",
        ]
    )
