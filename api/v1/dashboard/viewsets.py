"""
Facade module for Dashboard ViewSets.
"""

from .viewsets_impl import (
    VIEWSET_MAP,
    AnalyticsViewSet,
)

__all__ = [
    "VIEWSET_MAP",
    "AnalyticsViewSet",
]
