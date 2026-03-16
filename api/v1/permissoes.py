from rest_framework.permissions import BasePermission


class ApenasAdmin(BasePermission):
    def has_permission(self, request, view):
        return request.user.is_staff
