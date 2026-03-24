"""Facade module for surgery viewsets."""

from .viewsets_impl import (
    VIEWSET_MAP,
    SurgeryViewSet,
    SurgicalProcedureViewSet,
    CirurgiaViewSet,
    ProcedimentoCirurgicoViewSet,
)

__all__ = [
    "VIEWSET_MAP",
    "SurgeryViewSet",
    "SurgicalProcedureViewSet",
    "CirurgiaViewSet",
    "ProcedimentoCirurgicoViewSet",
]
