"""State machine simples para estados de resultado clínico."""

from domain.clinical.result_state import ResultState


class InvalidTransitionError(Exception):
    pass


class ResultStateMachine:
    TRANSITIONS = {
        ResultState.PENDING: {
            ResultState.IN_ANALYSIS,
            ResultState.DISREGARDED,
        },
        ResultState.IN_ANALYSIS: {
            ResultState.AWAITING_VALIDATION,
            ResultState.DISREGARDED,
        },
        ResultState.AWAITING_VALIDATION: {
            ResultState.VALIDATED,
            ResultState.REJECTED,
            ResultState.DISREGARDED,
        },
        ResultState.REJECTED: {
            ResultState.IN_ANALYSIS,
            ResultState.DISREGARDED,
        },
    }

    @classmethod
    def validate_transition(cls, current_state, new_state):
        if current_state in ResultState.TERMINAL:
            raise InvalidTransitionError("Estado final não permite transições.")

        allowed = cls.TRANSITIONS.get(current_state, set())
        if new_state not in allowed:
            raise InvalidTransitionError(f"Transição inválida de {current_state} para {new_state}.")
