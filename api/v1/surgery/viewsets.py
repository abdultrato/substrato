"""Facade module for surgery viewsets."""

from .viewsets_impl import (
    VIEWSET_MAP,
    BaseSurgeryViewSet,
    LargeSurgeryViewSet,
    SmallSurgeryViewSet,
    SurgeryViewSet,
    SurgicalProcedureViewSet,
)

__all__ = [
    "VIEWSET_MAP",
    "BaseSurgeryViewSet",
    "LargeSurgeryViewSet",
    "SmallSurgeryViewSet",
    "SurgeryViewSet",
    "SurgicalProcedureViewSet",
]
