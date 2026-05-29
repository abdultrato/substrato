from rest_framework.permissions import BasePermission

from security.permissions.base import tenant_matches_request


class OnlyAdmin(BasePermission):
    message = "Apenas administradores autenticados podem aceder a este recurso."

    def has_permission(self, request, view):
        user = getattr(request, "user", None)
        if not user or not getattr(user, "is_authenticated", False):
            return False
        if not getattr(user, "is_staff", False):
            return False
        return tenant_matches_request(request, user)
