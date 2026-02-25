class AdminOnlyMixin:
    permission_classes = ["rest_framework.permissions.IsAdminUser"]


class AuthenticatedMixin:
    permission_classes = ["rest_framework.permissions.IsAuthenticated"]
