"""Facade module for surgery viewsets."""

from .viewsets_impl import (
    BaseSurgeryViewSet,
    LargeSurgeryViewSet,
    SmallSurgeryViewSet,
    VIEWSET_MAP,
    SurgeryViewSet,
    SurgicalProcedureViewSet,
)

__all__ = [
    "VIEWSET_MAP",
    "BaseSurgeryViewSet",
    "SurgeryViewSet",
    "SmallSurgeryViewSet",
    "LargeSurgeryViewSet",
    "SurgicalProcedureViewSet",
]
