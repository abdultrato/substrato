"""Facade module for education viewsets."""

from .viewsets_impl import (
    VIEWSET_MAP,
    AttendanceRecordViewSet,
    ClassroomViewSet,
    CourseViewSet,
    EnrollmentViewSet,
    ExaminationViewSet,
    GradeRecordViewSet,
    LearningContentViewSet,
    StudentProfileViewSet,
    TeacherProfileViewSet,
)

__all__ = [
    "VIEWSET_MAP",
    "AttendanceRecordViewSet",
    "ClassroomViewSet",
    "CourseViewSet",
    "EnrollmentViewSet",
    "ExaminationViewSet",
    "GradeRecordViewSet",
    "LearningContentViewSet",
    "StudentProfileViewSet",
    "TeacherProfileViewSet",
]
