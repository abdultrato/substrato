from application.clinical.commands import ValidateResultCommand
from application.clinical.handlers import handle_validate_result


def validate_result(result_item, user=None):
    return handle_validate_result(
        ValidateResultCommand(
            result_item=result_item,
            user=user,
            idempotent=False,
        )
    )


validar_resultado = validate_result
