"""Facade module for education viewsets."""

from .viewsets_impl import (
    AttendanceRecordViewSet,
    ClassroomViewSet,
    CourseViewSet,
    EnrollmentViewSet,
    ExaminationViewSet,
    GradeRecordViewSet,
    LearningContentViewSet,
    StudentProfileViewSet,
    TeacherProfileViewSet,
    VIEWSET_MAP,
)

__all__ = [
    "AttendanceRecordViewSet",
    "ClassroomViewSet",
    "CourseViewSet",
    "EnrollmentViewSet",
    "ExaminationViewSet",
    "GradeRecordViewSet",
    "LearningContentViewSet",
    "StudentProfileViewSet",
    "TeacherProfileViewSet",
    "VIEWSET_MAP",
]
