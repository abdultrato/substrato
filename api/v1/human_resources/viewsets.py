"""Facade module for human resources viewsets."""

from .viewsets_impl import (
    VIEWSET_MAP,
    AbsenceViewSet,
    DisciplinaryProcessViewSet,
    EmployeeViewSet,
    FamilyDependentViewSet,
    JobTitleViewSet,
    OvertimeViewSet,
    PayrollViewSet,
    ProfessionViewSet,
    TerminationViewSet,
    VacationViewSet,
    WorkScheduleViewSet,
)

__all__ = [
    "VIEWSET_MAP",  # Alias -> ViewSet para roteamento dinâmico
    "AbsenceViewSet",
    "DisciplinaryProcessViewSet",
    "EmployeeViewSet",
    "FamilyDependentViewSet",
    "JobTitleViewSet",
    "OvertimeViewSet",
    "PayrollViewSet",
    "ProfessionViewSet",
    "TerminationViewSet",
    "VacationViewSet",
    "WorkScheduleViewSet",
]
