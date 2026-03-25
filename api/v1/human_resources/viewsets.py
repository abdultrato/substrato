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
    "VIEWSET_MAP",
    "AbsenceViewSet",
    "AbsenceViewSet",
    "EmployeeViewSet",
    "EmployeeViewSet",
    "FamilyDependentViewSet",
    "FamilyDependentViewSet",
    "JobTitleViewSet",
    "JobTitleViewSet",
    "OvertimeViewSet",
    "OvertimeViewSet",
    "PayrollViewSet",
    "PayrollViewSet",
    "TerminationViewSet",
    "TerminationViewSet",
    "VacationViewSet",
    "VacationViewSet",
    "WorkScheduleViewSet",
    "WorkScheduleViewSet",
]
