"""State machines for bloodbank operational flows."""

from __future__ import annotations

from django.core.exceptions import ValidationError


class StateMachine:
    """Small reusable transition validator for persisted model status fields."""

    transitions: dict[str, set[str]] = {}
    terminal_states: set[str] = set()

    @classmethod
    def validate_transition(cls, current_state: str | None, new_state: str | None, *, field: str = "status") -> None:
        if not current_state or not new_state or current_state == new_state:
            return

        if current_state in cls.terminal_states:
            raise ValidationError({field: f"Estado final {current_state} não pode ser alterado para {new_state}."})

        allowed = cls.transitions.get(current_state, set())
        if new_state not in allowed:
            raise ValidationError({field: f"Transição inválida de {current_state} para {new_state}."})


class BloodDonationStateMachine(StateMachine):
    REGISTERED = "REG"
    SCREENING = "SCR"
    COMPLETED = "COM"
    CANCELED = "CAN"

    transitions = {
        REGISTERED: {SCREENING, COMPLETED, CANCELED},
        SCREENING: {COMPLETED, CANCELED},
    }
    terminal_states = {COMPLETED, CANCELED}


class BloodUnitStateMachine(StateMachine):
    QUARANTINE = "QUA"
    AVAILABLE = "AVL"
    RESERVED = "RES"
    FORWARDED = "FWD"
    TRANSFUSED = "TRN"
    EXPIRED = "EXP"
    DISCARDED = "DSC"

    transitions = {
        QUARANTINE: {AVAILABLE, DISCARDED, EXPIRED},
        AVAILABLE: {RESERVED, FORWARDED, TRANSFUSED, DISCARDED, EXPIRED, QUARANTINE},
        RESERVED: {AVAILABLE, FORWARDED, TRANSFUSED, DISCARDED, EXPIRED, QUARANTINE},
        FORWARDED: {AVAILABLE, TRANSFUSED, DISCARDED, EXPIRED, QUARANTINE},
        EXPIRED: {DISCARDED},
    }
    terminal_states = {TRANSFUSED, DISCARDED}

    @classmethod
    def is_terminal(cls, state: str | None) -> bool:
        return bool(state and state in cls.terminal_states)


class BloodTransfusionStateMachine(StateMachine):
    REQUESTED = "REQ"
    APPROVED = "APR"
    IN_PROGRESS = "INP"
    COMPLETED = "COM"
    CANCELED = "CAN"
    ADVERSE_REACTION = "REA"

    transitions = {
        REQUESTED: {APPROVED, IN_PROGRESS, COMPLETED, CANCELED, ADVERSE_REACTION},
        APPROVED: {IN_PROGRESS, COMPLETED, CANCELED, ADVERSE_REACTION},
        IN_PROGRESS: {COMPLETED, CANCELED, ADVERSE_REACTION},
    }
    terminal_states = {COMPLETED, CANCELED, ADVERSE_REACTION}


class BloodDispatchOutcomePolicy:
    """Consistency policy between dispatch outcome and resulting unit status."""

    TRANSFUSED = "TRN"
    RETURNED = "RET"
    DISCARDED = "DSC"
    AVAILABLE = "AVL"

    expected_status_by_outcome = {
        TRANSFUSED: TRANSFUSED,
        RETURNED: AVAILABLE,
        DISCARDED: DISCARDED,
    }

    @classmethod
    def validate(cls, *, outcome: str | None, unit_status: str | None) -> None:
        expected_status = cls.expected_status_by_outcome.get(outcome)
        if expected_status is None or unit_status == expected_status:
            return

        labels = {
            cls.TRANSFUSED: "transfundida",
            cls.RETURNED: "devolvida",
            cls.DISCARDED: "descartada",
            cls.AVAILABLE: "disponível",
        }
        outcome_label = labels.get(outcome, outcome)
        status_label = labels.get(expected_status, expected_status)
        raise ValidationError({"dispatch_outcome": f"Desfecho {outcome_label} exige estado {status_label}."})
