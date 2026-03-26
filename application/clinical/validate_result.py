from domain.clinical.result_state import ResultState


def validate_result(result_item, user=None):
    result_item.transition(ResultState.VALIDATED, user=user)
    return result_item


validar_resultado = validate_result
