from domain.clinical.request_state import RequestState


class InvalidRequestTransition(Exception):
    pass


class RequestStateMachine:
    TRANSITIONS = {
        RequestState.CREATED: {
            RequestState.IN_PROGRESS,
            RequestState.CANCELED,
        },
        RequestState.IN_PROGRESS: {
            RequestState.AWAITING_VALIDATION,
        },
        RequestState.AWAITING_VALIDATION: {
            RequestState.VALIDATED,
            RequestState.CANCELED,
        },
    }

    @classmethod
    def validate(cls, current_state, new_state):
        if current_state in RequestState.TERMINAL:
            raise InvalidRequestTransition("Requisição em estado final é imutável.")

        allowed = cls.TRANSITIONS.get(current_state, set())
        if new_state not in allowed:
            raise InvalidRequestTransition(f"Transição inválida de {current_state} para {new_state}.")


TransicaoRequisicaoInvalida = InvalidRequestTransition
RequisicaoStateMachine = RequestStateMachine
RequestStateMachine.validar = classmethod(RequestStateMachine.validate.__func__)
