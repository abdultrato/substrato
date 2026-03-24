from rest_framework.permissions import IsAuthenticated

from security.permissions.groups import IsAdmin


class AdminOnlyMixin:
    """
    Permissão: administradores.
    """

    permission_classes = [IsAdmin]


class AuthenticatedMixin:
    """
    Permissão: usuários autenticados.
    """

    permission_classes = [IsAuthenticated]
