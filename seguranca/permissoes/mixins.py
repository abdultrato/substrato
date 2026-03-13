from rest_framework.permissions import IsAuthenticated

from seguranca.permissoes.grupos import IsAdmin


class AdminOnlyMixin:
    """
    Apenas administradores.
    """

    permission_classes = [IsAdmin]


class AuthenticatedMixin:
    """
    Apenas usuários autenticados.
    """

    permission_classes = [IsAuthenticated]
