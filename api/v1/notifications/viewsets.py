"""
Facade module for Notificacoes ViewSets.
"""

from .viewsets_impl import (
    VIEWSET_MAP,
    LogEnvioViewSet,
    NotificacaoViewSet,
)

__all__ = [
    "VIEWSET_MAP",
    "LogEnvioViewSet",
    "NotificacaoViewSet",
]
