"""Facade module for surgery viewsets."""

from .viewsets_impl import (
    VIEWSET_MAP,
    CirurgiaViewSet,
    ProcedimentoCirurgicoViewSet,
    SurgeryViewSet,
    SurgicalProcedureViewSet,
)

__all__ = [
    "VIEWSET_MAP",
    "CirurgiaViewSet",
    "ProcedimentoCirurgicoViewSet",
    "SurgeryViewSet",
    "SurgicalProcedureViewSet",
]
