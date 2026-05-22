"""Facade module for education viewsets."""

from .viewsets_impl import (
    VIEWSET_MAP,
    AssignmentSubmissionViewSet,
    AssignmentViewSet,
    AttendanceRecordViewSet,
    ClassroomViewSet,
    CourseViewSet,
    EnrollmentViewSet,
    ExaminationViewSet,
    ExaminationAttemptViewSet,
    GradeRecordViewSet,
    LearningContentViewSet,
    RandomTestViewSet,
    SkillViewSet,
    StudentProfileViewSet,
    TeacherProfileViewSet,
)

__all__ = [
    "VIEWSET_MAP",
    "AssignmentViewSet",
    "AssignmentSubmissionViewSet",
    "AttendanceRecordViewSet",
    "ClassroomViewSet",
    "CourseViewSet",
    "EnrollmentViewSet",
    "ExaminationViewSet",
    "ExaminationAttemptViewSet",
    "GradeRecordViewSet",
    "LearningContentViewSet",
    "RandomTestViewSet",
    "SkillViewSet",
    "StudentProfileViewSet",
    "TeacherProfileViewSet",
]
