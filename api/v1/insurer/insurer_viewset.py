"""Compatibility module for legacy insurer imports."""

from .serializers import InsurerSerializer
from .viewsets_impl.core import InsurerViewSet

__all__ = ["InsurerSerializer", "InsurerViewSet"]


