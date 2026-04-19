"""Permissões DRF expostas para uso por viewsets do frontend legado."""

from rest_framework.permissions import IsAdminUser

__all__ = ["IsAdminUser"]
