import unicodedata

from django.db.models import Q
from rest_framework.permissions import IsAuthenticated
from rest_framework.viewsets import ModelViewSet

from api.v1.viewset_mixins import TenantScopedQuerysetMixin, ValidatedSearchOrderingMixin
from apps.education.models import (
    Assignment,
    AssignmentSubmission,
    AttendanceRecord,
    Classroom,
    Course,
    Enrollment,
    Examination,
    ExaminationAttempt,
    GradeRecord,
    LearningContent,
    Skill,
    StudentProfile,
    TeacherProfile,
)
from services.education import AcademicService

from ..filters import (
    AssignmentFilter,
    AssignmentSubmissionFilter,
    AttendanceRecordFilter,
    ClassroomFilter,
    CourseFilter,
    EnrollmentFilter,
    ExaminationFilter,
    ExaminationAttemptFilter,
    GradeRecordFilter,
    LearningContentFilter,
    SkillFilter,
    StudentProfileFilter,
    TeacherProfileFilter,
)
from ..serializers import (
    AssignmentSerializer,
    AssignmentSubmissionSerializer,
    AttendanceRecordSerializer,
    ClassroomSerializer,
    CourseSerializer,
    EnrollmentSerializer,
    ExaminationSerializer,
    ExaminationAttemptSerializer,
    GradeRecordSerializer,
    LearningContentSerializer,
    SkillSerializer,
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
        if user and not getattr(user, "is_superuser", False) and _is_student_user(user):
            return qs.filter(user=user)
        return qs

    def perform_create(self, serializer):
        super().perform_create(serializer)
        AcademicService.register_student(student=serializer.instance)


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
        if user and not getattr(user, "is_superuser", False) and _is_teacher_user(user):
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

    def perform_create(self, serializer):
        super().perform_create(serializer)
        enrollment = serializer.instance
        if enrollment.status == Enrollment.Status.ACTIVE:
            AcademicService.activate_enrollment(enrollment=enrollment)

    def perform_update(self, serializer):
        enrollment = serializer.instance
        was_active = enrollment.status == Enrollment.Status.ACTIVE
        super().perform_update(serializer)
        enrollment = serializer.instance
        is_active = enrollment.status == Enrollment.Status.ACTIVE
        if not was_active and is_active:
            AcademicService.activate_enrollment(enrollment=enrollment)


class AttendanceRecordViewSet(TenantScopedEducationViewSet):
    queryset = AttendanceRecord.objects.select_related(
        "enrollment", "enrollment__student", "enrollment__classroom"
    ).all()
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

    def perform_create(self, serializer):
        super().perform_create(serializer)
        AcademicService.record_attendance(attendance=serializer.instance)

    def perform_update(self, serializer):
        attendance = serializer.instance
        previous_state = (
            attendance.enrollment_id,
            attendance.attendance_date,
            attendance.status,
            (attendance.notes or "").strip(),
        )
        super().perform_update(serializer)
        attendance = serializer.instance
        current_state = (
            attendance.enrollment_id,
            attendance.attendance_date,
            attendance.status,
            (attendance.notes or "").strip(),
        )
        if current_state != previous_state:
            AcademicService.record_attendance(attendance=attendance)


class GradeRecordViewSet(TenantScopedEducationViewSet):
    queryset = GradeRecord.objects.select_related(
        "enrollment",
        "enrollment__student",
        "teacher",
        "teacher__user",
        "assignment_submission",
        "examination_attempt",
    ).all()
    serializer_class = GradeRecordSerializer
    filterset_class = GradeRecordFilter
    search_fields = [
        "custom_id",
        "component",
        "enrollment__student__student_code",
        "teacher__teacher_code",
        "assignment_submission__custom_id",
        "examination_attempt__custom_id",
    ]
    ordering_fields = ["component", "score", "published_at", "created_at"]
    ordering = ["-created_at"]

    def get_queryset(self):
        qs = super().get_queryset()
        user = getattr(self.request, "user", None)
        if user and not getattr(user, "is_superuser", False):
            if _is_student_user(user):
                return qs.filter(enrollment__student__user=user)
            if _is_teacher_user(user):
                return qs.filter(
                    Q(teacher__user=user) | Q(enrollment__classroom__homeroom_teacher__user=user)
                ).distinct()
        return qs

    def perform_create(self, serializer):
        super().perform_create(serializer)
        grade = serializer.instance
        if grade.published_at is not None:
            AcademicService.publish_grade(grade=grade)

    def perform_update(self, serializer):
        grade = serializer.instance
        was_published = grade.published_at is not None
        super().perform_update(serializer)
        grade = serializer.instance
        is_published = grade.published_at is not None
        if not was_published and is_published:
            AcademicService.publish_grade(grade=grade)


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

    def perform_create(self, serializer):
        super().perform_create(serializer)
        AcademicService.schedule_examination(exam=serializer.instance)

    def perform_update(self, serializer):
        exam = serializer.instance
        previous_schedule = (exam.scheduled_for, exam.course_id, exam.classroom_id)
        super().perform_update(serializer)
        exam = serializer.instance
        current_schedule = (exam.scheduled_for, exam.course_id, exam.classroom_id)
        if current_schedule != previous_schedule:
            AcademicService.schedule_examination(exam=exam)


class AssignmentViewSet(TenantScopedEducationViewSet):
    queryset = Assignment.objects.select_related("course", "classroom", "teacher", "teacher__user").all()
    serializer_class = AssignmentSerializer
    filterset_class = AssignmentFilter
    search_fields = ["custom_id", "title", "course__name", "classroom__name", "teacher__teacher_code"]
    ordering_fields = ["due_at", "status", "created_at"]
    ordering = ["due_at", "-created_at"]

    def get_queryset(self):
        qs = super().get_queryset()
        user = getattr(self.request, "user", None)
        if user and not getattr(user, "is_superuser", False):
            if _is_teacher_user(user):
                return qs.filter(classroom__homeroom_teacher__user=user).distinct()
            if _is_student_user(user):
                return qs.filter(classroom__enrollments__student__user=user).distinct()
        return qs

    def perform_create(self, serializer):
        super().perform_create(serializer)
        assignment = serializer.instance
        if assignment.status == Assignment.Status.PUBLISHED:
            AcademicService.publish_assignment(assignment=assignment)

    def perform_update(self, serializer):
        assignment = serializer.instance
        was_published = assignment.status == Assignment.Status.PUBLISHED
        super().perform_update(serializer)
        assignment = serializer.instance
        is_published = assignment.status == Assignment.Status.PUBLISHED
        if not was_published and is_published:
            AcademicService.publish_assignment(assignment=assignment)


class AssignmentSubmissionViewSet(TenantScopedEducationViewSet):
    queryset = AssignmentSubmission.objects.select_related(
        "assignment",
        "enrollment",
        "student",
        "student__user",
        "graded_by",
        "graded_by__user",
    ).all()
    serializer_class = AssignmentSubmissionSerializer
    filterset_class = AssignmentSubmissionFilter
    search_fields = ["custom_id", "assignment__title", "student__student_code", "status"]
    ordering_fields = ["submitted_at", "status", "created_at"]
    ordering = ["-submitted_at", "-created_at"]

    def get_queryset(self):
        qs = super().get_queryset()
        user = getattr(self.request, "user", None)
        if user and not getattr(user, "is_superuser", False):
            if _is_student_user(user):
                return qs.filter(student__user=user)
            if _is_teacher_user(user):
                return qs.filter(assignment__classroom__homeroom_teacher__user=user).distinct()
        return qs

    def perform_create(self, serializer):
        super().perform_create(serializer)
        AcademicService.register_assignment_submission(submission=serializer.instance)


class ExaminationAttemptViewSet(TenantScopedEducationViewSet):
    queryset = ExaminationAttempt.objects.select_related(
        "examination",
        "enrollment",
        "student",
        "student__user",
        "graded_by",
        "graded_by__user",
    ).all()
    serializer_class = ExaminationAttemptSerializer
    filterset_class = ExaminationAttemptFilter
    search_fields = ["custom_id", "examination__title", "student__student_code", "status"]
    ordering_fields = ["started_at", "expires_at", "submitted_at", "status", "created_at"]
    ordering = ["-started_at", "-created_at"]

    def get_queryset(self):
        qs = super().get_queryset()
        user = getattr(self.request, "user", None)
        if user and not getattr(user, "is_superuser", False):
            if _is_student_user(user):
                return qs.filter(student__user=user)
            if _is_teacher_user(user):
                return qs.filter(examination__classroom__homeroom_teacher__user=user).distinct()
        return qs

    def perform_create(self, serializer):
        super().perform_create(serializer)
        AcademicService.open_exam_attempt(attempt=serializer.instance)

    def perform_update(self, serializer):
        attempt = serializer.instance
        previous_status = attempt.status
        super().perform_update(serializer)
        attempt = serializer.instance
        if attempt.status == ExaminationAttempt.Status.SUBMITTED and previous_status != ExaminationAttempt.Status.SUBMITTED:
            AcademicService.submit_exam_attempt(attempt=attempt)
        elif attempt.status == ExaminationAttempt.Status.EXPIRED and previous_status != ExaminationAttempt.Status.EXPIRED:
            AcademicService.expire_exam_attempt(attempt=attempt)


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

    def perform_create(self, serializer):
        super().perform_create(serializer)
        content = serializer.instance
        if content.published:
            AcademicService.publish_learning_content(content=content)

    def perform_update(self, serializer):
        content = serializer.instance
        was_published = bool(content.published)
        super().perform_update(serializer)
        content = serializer.instance
        is_published = bool(content.published)
        if not was_published and is_published:
            AcademicService.publish_learning_content(content=content)


class SkillViewSet(TenantScopedEducationViewSet):
    queryset = Skill.objects.select_related("course").all()
    serializer_class = SkillSerializer
    filterset_class = SkillFilter
    search_fields = ["custom_id", "code", "name", "course__name", "category", "level"]
    ordering_fields = ["code", "name", "category", "level", "status", "created_at"]
    ordering = ["name", "created_at"]

    def get_queryset(self):
        qs = super().get_queryset()
        user = getattr(self.request, "user", None)
        if user and not getattr(user, "is_superuser", False):
            if _is_teacher_user(user):
                return qs.filter(course__classrooms__homeroom_teacher__user=user).distinct()
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
    "assessment": GradeRecordViewSet,
    "examination": ExaminationViewSet,
    "assignment": AssignmentViewSet,
    "submission": AssignmentSubmissionViewSet,
    "exam_attempt": ExaminationAttemptViewSet,
    "examination_attempt": ExaminationAttemptViewSet,
    "content": LearningContentViewSet,
    "lesson": LearningContentViewSet,
    "skill": SkillViewSet,
}

__all__ = [
    "VIEWSET_MAP",
    "AttendanceRecordViewSet",
    "ClassroomViewSet",
    "CourseViewSet",
    "EnrollmentViewSet",
    "ExaminationViewSet",
    "ExaminationAttemptViewSet",
    "GradeRecordViewSet",
    "AssignmentViewSet",
    "AssignmentSubmissionViewSet",
    "LearningContentViewSet",
    "SkillViewSet",
    "StudentProfileViewSet",
    "TeacherProfileViewSet",
]
