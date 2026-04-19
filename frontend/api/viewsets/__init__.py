"""Reexporta permissões utilizadas pelos viewsets do frontend legado."""

from .permissions_api import IsAdminUser

__all__ = ["IsAdminUser"]
