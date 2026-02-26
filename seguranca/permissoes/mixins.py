from rest_framework.permissions import IsAuthenticated, IsAdminUser


class AdminOnlyMixin:
    """
    Apenas administradores.
    """

    permission_classes = [IsAdminUser]


class AuthenticatedMixin:
    """
    Apenas usuários autenticados.
    """

    permission_classes = [IsAuthenticated]
