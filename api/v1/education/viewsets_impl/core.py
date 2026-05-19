import unicodedata

from rest_framework.permissions import IsAuthenticated
from rest_framework.viewsets import ModelViewSet

from api.v1.viewset_mixins import TenantScopedQuerysetMixin, ValidatedSearchOrderingMixin
from apps.education.models import (
    AttendanceRecord,
    Classroom,
    Course,
    Enrollment,
    Examination,
    GradeRecord,
    LearningContent,
    StudentProfile,
    TeacherProfile,
)

from ..filters import (
    AttendanceRecordFilter,
    ClassroomFilter,
    CourseFilter,
    EnrollmentFilter,
    ExaminationFilter,
    GradeRecordFilter,
    LearningContentFilter,
    StudentProfileFilter,
    TeacherProfileFilter,
)
from ..serializers import (
    AttendanceRecordSerializer,
    ClassroomSerializer,
    CourseSerializer,
    EnrollmentSerializer,
    ExaminationSerializer,
    GradeRecordSerializer,
    LearningContentSerializer,
    StudentProfileSerializer,
    TeacherProfileSerializer,
)


class TenantScopedEducationViewSet(ValidatedSearchOrderingMixin, TenantScopedQuerysetMixin, ModelViewSet):
    permission_classes = [IsAuthenticated]


def _normalize_group(value: str) -> str:
    value = (value or "").strip().lower()
    if not value:
        return ""
    value = unicodedata.normalize("NFD", value)
    return "".join(ch for ch in value if unicodedata.category(ch) != "Mn")


def _normalized_user_groups(user) -> set[str]:
    try:
        names = user.groups.values_list("name", flat=True)
    except Exception:
        return set()
    return {_normalize_group(name) for name in names if name}


def _is_student_user(user) -> bool:
    groups = _normalized_user_groups(user)
    return "estudante" in groups or "student" in groups


def _is_teacher_user(user) -> bool:
    groups = _normalized_user_groups(user)
    return "professor" in groups or "teacher" in groups


class StudentProfileViewSet(TenantScopedEducationViewSet):
    queryset = StudentProfile.objects.select_related("user").all()
    serializer_class = StudentProfileSerializer
    filterset_class = StudentProfileFilter
    search_fields = ["custom_id", "student_code", "user__username", "user__name"]
    ordering_fields = ["student_code", "status", "created_at"]
    ordering = ["student_code", "created_at"]

    def get_queryset(self):
        qs = super().get_queryset()
        user = getattr(self.request, "user", None)
        if user and not getattr(user, "is_superuser", False):
            if _is_student_user(user):
                return qs.filter(user=user)
        return qs


class TeacherProfileViewSet(TenantScopedEducationViewSet):
    queryset = TeacherProfile.objects.select_related("user").all()
    serializer_class = TeacherProfileSerializer
    filterset_class = TeacherProfileFilter
    search_fields = ["custom_id", "teacher_code", "specialty", "user__username", "user__name"]
    ordering_fields = ["teacher_code", "status", "created_at"]
    ordering = ["teacher_code", "created_at"]

    def get_queryset(self):
        qs = super().get_queryset()
        user = getattr(self.request, "user", None)
        if user and not getattr(user, "is_superuser", False):
            if _is_teacher_user(user):
                return qs.filter(user=user)
        return qs


class CourseViewSet(TenantScopedEducationViewSet):
    queryset = Course.objects.all()
    serializer_class = CourseSerializer
    filterset_class = CourseFilter
    search_fields = ["custom_id", "code", "name", "description"]
    ordering_fields = ["code", "name", "status", "created_at"]
    ordering = ["name", "created_at"]

    def get_queryset(self):
        qs = super().get_queryset()
        user = getattr(self.request, "user", None)
        if user and not getattr(user, "is_superuser", False):
            if _is_teacher_user(user):
                return qs.filter(classrooms__homeroom_teacher__user=user).distinct()
            if _is_student_user(user):
                return qs.filter(classrooms__enrollments__student__user=user).distinct()
        return qs


class ClassroomViewSet(TenantScopedEducationViewSet):
    queryset = Classroom.objects.select_related("course", "homeroom_teacher", "homeroom_teacher__user").all()
    serializer_class = ClassroomSerializer
    filterset_class = ClassroomFilter
    search_fields = ["custom_id", "name", "academic_year", "course__name"]
    ordering_fields = ["name", "academic_year", "capacity", "created_at"]
    ordering = ["academic_year", "name"]

    def get_queryset(self):
        qs = super().get_queryset()
        user = getattr(self.request, "user", None)
        if user and not getattr(user, "is_superuser", False):
            if _is_teacher_user(user):
                return qs.filter(homeroom_teacher__user=user)
            if _is_student_user(user):
                return qs.filter(enrollments__student__user=user).distinct()
        return qs


class EnrollmentViewSet(TenantScopedEducationViewSet):
    queryset = Enrollment.objects.select_related("student", "student__user", "classroom", "classroom__course").all()
    serializer_class = EnrollmentSerializer
    filterset_class = EnrollmentFilter
    search_fields = ["custom_id", "student__student_code", "classroom__name", "classroom__course__name"]
    ordering_fields = ["status", "enrolled_on", "created_at"]
    ordering = ["-enrolled_on", "-created_at"]

    def get_queryset(self):
        qs = super().get_queryset()
        user = getattr(self.request, "user", None)
        if user and not getattr(user, "is_superuser", False):
            if _is_student_user(user):
                return qs.filter(student__user=user)
            if _is_teacher_user(user):
                return qs.filter(classroom__homeroom_teacher__user=user)
        return qs


class AttendanceRecordViewSet(TenantScopedEducationViewSet):
    queryset = AttendanceRecord.objects.select_related("enrollment", "enrollment__student", "enrollment__classroom").all()
    serializer_class = AttendanceRecordSerializer
    filterset_class = AttendanceRecordFilter
    search_fields = ["custom_id", "enrollment__student__student_code", "notes"]
    ordering_fields = ["attendance_date", "status", "created_at"]
    ordering = ["-attendance_date", "-created_at"]

    def get_queryset(self):
        qs = super().get_queryset()
        user = getattr(self.request, "user", None)
        if user and not getattr(user, "is_superuser", False):
            if _is_student_user(user):
                return qs.filter(enrollment__student__user=user)
            if _is_teacher_user(user):
                return qs.filter(enrollment__classroom__homeroom_teacher__user=user)
        return qs


class GradeRecordViewSet(TenantScopedEducationViewSet):
    queryset = GradeRecord.objects.select_related("enrollment", "enrollment__student", "teacher", "teacher__user").all()
    serializer_class = GradeRecordSerializer
    filterset_class = GradeRecordFilter
    search_fields = ["custom_id", "component", "enrollment__student__student_code", "teacher__teacher_code"]
    ordering_fields = ["component", "score", "published_at", "created_at"]
    ordering = ["-created_at"]

    def get_queryset(self):
        qs = super().get_queryset()
        user = getattr(self.request, "user", None)
        if user and not getattr(user, "is_superuser", False):
            if _is_student_user(user):
                return qs.filter(enrollment__student__user=user)
            if _is_teacher_user(user):
                return qs.filter(teacher__user=user)
        return qs


class ExaminationViewSet(TenantScopedEducationViewSet):
    queryset = Examination.objects.select_related("course", "classroom").all()
    serializer_class = ExaminationSerializer
    filterset_class = ExaminationFilter
    search_fields = ["custom_id", "title", "course__name", "classroom__name"]
    ordering_fields = ["scheduled_for", "max_score", "created_at"]
    ordering = ["-scheduled_for", "-created_at"]

    def get_queryset(self):
        qs = super().get_queryset()
        user = getattr(self.request, "user", None)
        if user and not getattr(user, "is_superuser", False):
            if _is_teacher_user(user):
                return qs.filter(classroom__homeroom_teacher__user=user)
            if _is_student_user(user):
                return qs.filter(classroom__enrollments__student__user=user).distinct()
        return qs


class LearningContentViewSet(TenantScopedEducationViewSet):
    queryset = LearningContent.objects.select_related("course", "author", "author__user").all()
    serializer_class = LearningContentSerializer
    filterset_class = LearningContentFilter
    search_fields = ["custom_id", "title", "course__name", "author__teacher_code"]
    ordering_fields = ["content_type", "published", "created_at"]
    ordering = ["-created_at"]

    def get_queryset(self):
        qs = super().get_queryset()
        user = getattr(self.request, "user", None)
        if user and not getattr(user, "is_superuser", False):
            if _is_teacher_user(user):
                return qs.filter(author__user=user)
            if _is_student_user(user):
                return qs.filter(course__classrooms__enrollments__student__user=user).distinct()
        return qs


VIEWSET_MAP = {
    "student": StudentProfileViewSet,
    "teacher": TeacherProfileViewSet,
    "course": CourseViewSet,
    "classroom": ClassroomViewSet,
    "enrollment": EnrollmentViewSet,
    "attendance": AttendanceRecordViewSet,
    "grade": GradeRecordViewSet,
    "examination": ExaminationViewSet,
    "content": LearningContentViewSet,
}

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
