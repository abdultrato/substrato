"""Facade module for human resources viewsets."""

from .viewsets_impl import (
    VIEWSET_MAP,
    AbsenceViewSet,
    EmployeeViewSet,
    FamilyDependentViewSet,
    JobTitleViewSet,
    OvertimeViewSet,
    PayrollViewSet,
    TerminationViewSet,
    VacationViewSet,
    WorkScheduleViewSet,
)

__all__ = [
    "VIEWSET_MAP",  # Alias -> ViewSet para roteamento dinâmico
    "AbsenceViewSet",
    "EmployeeViewSet",
    "FamilyDependentViewSet",
    "JobTitleViewSet",
    "OvertimeViewSet",
    "PayrollViewSet",
    "TerminationViewSet",
    "VacationViewSet",
    "WorkScheduleViewSet",
]
