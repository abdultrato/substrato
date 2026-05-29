"""
Custom exception handler para Django REST Framework
Implementa RFC 7807 - Problem Details for HTTP APIs

Uso em settings.py:
REST_FRAMEWORK = {
    'EXCEPTION_HANDLER': 'api.v1.exceptions.custom_exception_handler',
}
"""

import logging
from typing import Any

from django.core.exceptions import ValidationError as DjangoValidationError
from django.db import IntegrityError
from rest_framework import status
from rest_framework.exceptions import ErrorDetail
from rest_framework.response import Response
from rest_framework.views import exception_handler

logger = logging.getLogger(__name__)


def _friendly_error_message(value: Any) -> str:
    text = str(value or "").strip()
    code = getattr(value, "code", "")
    lowered = text.lower()
    normalized_code = str(code or "").lower()

    if (
        normalized_code == "does_not_exist"
        or "pk inv" in lowered
        or "objeto não existe" in lowered
        or "objeto nao existe" in lowered
        or ("objeto" in lowered and "existe" in lowered)
    ):
        return "O registo selecionado não existe ou já não está disponível. Atualize a lista e selecione novamente."
    if normalized_code == "incorrect_type" or "expected pk value" in lowered or "tipo incorreto" in lowered:
        return "Selecione uma opção válida da lista."
    if normalized_code == "required" or "this field is required" in lowered or "campo obrigatório" in lowered:
        return "Este campo é obrigatório."
    if normalized_code == "blank" or "may not be blank" in lowered or "não pode ficar em branco" in lowered:
        return "Este campo não pode ficar em branco."
    if normalized_code == "null" or "may not be null" in lowered or "não pode ser nulo" in lowered:
        return "Este campo não pode ficar vazio."
    if normalized_code == "unique" or "already exists" in lowered or "já existe" in lowered:
        return "Já existe um registo com este valor."

    return text


def _serialize_error_details(value: Any) -> Any:
    if isinstance(value, ErrorDetail):
        return _friendly_error_message(value)
    if isinstance(value, str):
        return _friendly_error_message(value)
    if isinstance(value, dict):
        return {str(key): _serialize_error_details(nested) for key, nested in value.items()}
    if isinstance(value, (list, tuple)):
        return [_serialize_error_details(item) for item in value]
    return value


def _first_error_message(value: Any) -> str:
    if isinstance(value, dict) and value:
        first_key = sorted(value.keys(), key=lambda x: str(x))[0]
        return _first_error_message(value[first_key])
    if isinstance(value, (list, tuple)) and value:
        return _first_error_message(value[0])
    if value not in (None, "", []):
        return _friendly_error_message(value)
    return "Erro de validação. Revise os dados enviados."


class APIException(Exception):
    """Exceção base para a API com suporte a RFC 7807"""

    def __init__(
        self,
        detail: str,
        status_code: int = status.HTTP_400_BAD_REQUEST,
        code: str = "UNKNOWN_ERROR",
        instance: str | None = None,
        type_uri: str = "about:blank",
        **kwargs,
    ):
        self.detail = detail
        self.status_code = status_code
        self.code = code
        self.instance = instance
        self.type_uri = type_uri
        self.extra_fields = kwargs
        super().__init__(detail)


class ValidationError(APIException):
    """Erro de validação de dados"""

    def __init__(self, detail: str, instance: str | None = None, **kwargs):
        super().__init__(
            detail=detail,
            status_code=status.HTTP_400_BAD_REQUEST,
            code="VALIDATION_ERROR",
            instance=instance,
            type_uri="https://example.com/problems/validation-error",
            **kwargs,
        )


class AuthenticationError(APIException):
    """Erro de autenticação (credenciais inválidas)"""

    def __init__(self, detail: str = "Credenciais inválidas", instance: str | None = None):
        super().__init__(
            detail=detail,
            status_code=status.HTTP_401_UNAUTHORIZED,
            code="AUTHENTICATION_ERROR",
            instance=instance,
            type_uri="https://example.com/problems/authentication-error",
        )


class AuthorizationError(APIException):
    """Erro de autorização (acesso negado)"""

    def __init__(self, detail: str = "Acesso negado", instance: str | None = None):
        super().__init__(
            detail=detail,
            status_code=status.HTTP_403_FORBIDDEN,
            code="AUTHORIZATION_ERROR",
            instance=instance,
            type_uri="https://example.com/problems/authorization-error",
        )


class ResourceNotFoundError(APIException):
    """Erro de recurso não encontrado"""

    def __init__(self, detail: str = "Recurso não encontrado", instance: str | None = None):
        super().__init__(
            detail=detail,
            status_code=status.HTTP_404_NOT_FOUND,
            code="NOT_FOUND",
            instance=instance,
            type_uri="https://example.com/problems/not-found",
        )


class ConflictError(APIException):
    """Erro de conflito (ex: ID duplicado)"""

    def __init__(self, detail: str, instance: str | None = None):
        super().__init__(
            detail=detail,
            status_code=status.HTTP_409_CONFLICT,
            code="CONFLICT",
            instance=instance,
            type_uri="https://example.com/problems/conflict",
        )


class RateLimitError(APIException):
    """Erro de rate limit exceeded"""

    def __init__(self, detail: str = "Muitas requisições. Tente novamente mais tarde.", instance: str | None = None):
        super().__init__(
            detail=detail,
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            code="RATE_LIMIT_EXCEEDED",
            instance=instance,
            type_uri="https://example.com/problems/rate-limit",
        )


class InternalServerError(APIException):
    """Erro interno do servidor"""

    def __init__(self, detail: str = "Erro interno do servidor", instance: str | None = None):
        super().__init__(
            detail=detail,
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            code="INTERNAL_SERVER_ERROR",
            instance=instance,
            type_uri="https://example.com/problems/internal-error",
        )


def get_problem_details(
    exc: Exception,
    context: dict[str, Any],
) -> dict[str, Any]:
    """
    Constrói response RFC 7807 Problem Details

    Exemplo:
    {
        "type": "https://example.com/problems/validation-error",
        "status": 400,
        "title": "Validation Error",
        "detail": "O campo 'name' é obrigatório",
        "instance": "/api/v1/pacientes/",
        "code": "VALIDATION_ERROR"
    }
    """

    if isinstance(exc, APIException):
        return {
            "type": exc.type_uri,
            "status": exc.status_code,
            "title": exc.__class__.__name__,
            "detail": str(exc.detail),
            "instance": exc.instance or context.get("request").path if context.get("request") else None,
            "code": exc.code,
            **exc.extra_fields,  # Campos adicionais
        }

    return None


def custom_exception_handler(exc: Exception, context: dict[str, Any]) -> Response | None:
    """
    Handler customizado que implementa RFC 7807

    Chamado automaticamente pelo DRF quando uma exceção é lançada
    """

    # Model/domain validation errors (django.core.exceptions.ValidationError) are not
    # handled by DRF's default exception handler. Convert them to RFC 7807 400 here.
    if isinstance(exc, DjangoValidationError):
        request_path = context.get("request").path if context.get("request") else None

        validation_errors: Any
        if hasattr(exc, "message_dict"):
            validation_errors = exc.message_dict
        elif hasattr(exc, "messages"):
            validation_errors = exc.messages
        else:
            validation_errors = str(exc)
        validation_errors = _serialize_error_details(validation_errors)
        detail = _first_error_message(validation_errors)

        problem_details = {
            "type": "about:blank",
            "status": status.HTTP_400_BAD_REQUEST,
            "title": "Bad Request",
            "detail": detail,
            "instance": request_path,
            "code": "VALIDATION_ERROR",
        }

        if isinstance(validation_errors, dict):
            problem_details["validationErrors"] = validation_errors

        return Response(problem_details, status=status.HTTP_400_BAD_REQUEST)

    # DB integrity violations (UNIQUE/NOT NULL/FK) should be treated as 4xx
    # when they are triggered by client payloads.
    if isinstance(exc, IntegrityError):
        request_path = context.get("request").path if context.get("request") else None
        detail = (
            "Não foi possível concluir a operação: os dados enviados violaram uma "
            "restrição de integridade. Verifique duplicados, campos obrigatórios e relações selecionadas."
        )
        logger.warning("Integrity error while processing API request", exc_info=True)

        problem_details = {
            "type": "about:blank",
            "status": status.HTTP_400_BAD_REQUEST,
            "title": "Bad Request",
            "detail": detail,
            "instance": request_path,
            "code": "INTEGRITY_ERROR",
        }
        return Response(problem_details, status=status.HTTP_400_BAD_REQUEST)

    # Tentar usar handler padrão do DRF primeiro
    response = exception_handler(exc, context)

    # Se DRF tratou a exceção
    if response is not None:
        # Reformatar para RFC 7807
        status_code = response.status_code
        request_path = context.get("request").path if context.get("request") else None

        # Extrair título baseado no status code
        title_map = {
            status.HTTP_400_BAD_REQUEST: "Bad Request",
            status.HTTP_401_UNAUTHORIZED: "Unauthorized",
            status.HTTP_403_FORBIDDEN: "Forbidden",
            status.HTTP_404_NOT_FOUND: "Not Found",
            status.HTTP_429_TOO_MANY_REQUESTS: "Too Many Requests",
            status.HTTP_500_INTERNAL_SERVER_ERROR: "Internal Server Error",
        }

        title = title_map.get(status_code, "Error")

        # Determinar código de error
        error_code = "UNKNOWN_ERROR"
        if status_code == status.HTTP_400_BAD_REQUEST:
            error_code = "VALIDATION_ERROR"
        elif status_code == status.HTTP_401_UNAUTHORIZED:
            error_code = "AUTHENTICATION_ERROR"
        elif status_code == status.HTTP_403_FORBIDDEN:
            error_code = "AUTHORIZATION_ERROR"
        elif status_code == status.HTTP_404_NOT_FOUND:
            error_code = "NOT_FOUND"
        elif status_code == status.HTTP_429_TOO_MANY_REQUESTS:
            error_code = "RATE_LIMIT_EXCEEDED"
        elif status_code >= 500:
            error_code = "INTERNAL_SERVER_ERROR"

        serialized_data = _serialize_error_details(response.data)

        # Extrair message de error
        if isinstance(serialized_data, dict) and "detail" in serialized_data:
            detail = _first_error_message(serialized_data.get("detail"))
        elif isinstance(serialized_data, dict):
            detail = _first_error_message(serialized_data)
        else:
            detail = _first_error_message(serialized_data)

        # Formato RFC 7807
        problem_details = {
            "type": "about:blank",
            "status": status_code,
            "title": title,
            "detail": detail,
            "instance": request_path,
            "code": error_code,
        }

        # Se houver campos específicos de error (ex: validação)
        if isinstance(serialized_data, dict) and "detail" not in serialized_data:
            problem_details["validationErrors"] = serialized_data

        response.data = problem_details
        return response

    # Se não foi tratado por DRF, usar handler customizado
    if isinstance(exc, APIException):
        problem_details = get_problem_details(exc, context)

        logger.warning(
            f"API Exception: {exc.__class__.__name__}",
            extra={
                "code": exc.code,
                "status": exc.status_code,
                "detail": str(exc.detail),
            },
        )

        return Response(problem_details, status=exc.status_code)

    # Erro não tratado - logar e retornar error genérico
    logger.error(
        f"Unhandled exception: {exc.__class__.__name__}",
        exc_info=True,
        extra={
            "exception": str(exc),
            "path": context.get("request").path if context.get("request") else None,
        },
    )

    problem_details = {
        "type": "about:blank",
        "status": status.HTTP_500_INTERNAL_SERVER_ERROR,
        "title": "Internal Server Error",
        "detail": "Erro interno do servidor. Contate o suporte.",
        "instance": context.get("request").path if context.get("request") else None,
        "code": "INTERNAL_SERVER_ERROR",
    }

    return Response(problem_details, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
