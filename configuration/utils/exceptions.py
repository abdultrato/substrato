"""Handlers personalizados para exceptions DRF."""

from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import exception_handler


def custom_exception_handler(exc, context):
    response = exception_handler(exc, context)

    if response is None:
        return Response(
            {
                "error": "Erro interno do servidor.",
                "details": str(exc),
            },
            status=status.HTTP_500_INTERNAL_SERVER_ERROR,
        )

    return Response(
        {
            "error": True,
            "status_code": response.status_code,
            "details": response.data,
        },
        status=response.status_code,
    )
