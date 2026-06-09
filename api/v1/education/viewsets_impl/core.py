import unicodedata

from django.db.models import Q
from rest_framework import status
from rest_framework.decorators import action
from rest_framework.exceptions import ValidationError
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.viewsets import ModelViewSet

from api.v1.viewset_mixins import TenantScopedQuerysetMixin, ValidatedSearchOrderingMixin
from apps.education.models import (
    Assignment,
    AssignmentSubmission,
    AttendanceRecord,
    Classroom,
    Course,
    DisciplineScheduleItem,
    DisciplineScheduleStudentStatus,
    Enrollment,
    Examination,
    ExaminationAttempt,
    GradeRecord,
    LearningContent,
    RandomTest,
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
    DisciplineScheduleItemFilter,
    DisciplineScheduleStudentStatusFilter,
    EnrollmentFilter,
    ExaminationAttemptFilter,
    ExaminationFilter,
    GradeRecordFilter,
    LearningContentFilter,
    RandomTestFilter,
    SkillFilter,
    StudentProfileFilter,
    TeacherProfileFilter,
)
from ..serializers import (
    AssignmentSerializer,
    AssignmentSubmissionSerializer,
    AttendanceRecordSerializer,
    AttendanceRollCallSerializer,
    ClassroomSerializer,
    CourseSerializer,
    DisciplineFullPlanSerializer,
    DisciplineScheduleItemSerializer,
    DisciplineScheduleStudentStatusSerializer,
    EnrollmentSerializer,
    ExaminationAttemptSerializer,
    ExaminationSerializer,
    GradeRecordSerializer,
    LearningContentSerializer,
    RandomTestClassroomScheduleSerializer,
    RandomTestSerializer,
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
    search_fields = ["custom_id", "student_code", "guardian_name", "notes", "user__username", "user__name"]
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

    @action(detail=True, methods=["post"], url_path="activate")
    def activate(self, request, pk=None):
        course = AcademicService.activate_course(course=self.get_object())
        return Response(self.get_serializer(course).data)

    @action(detail=True, methods=["post"], url_path="archive")
    def archive(self, request, pk=None):
        course = AcademicService.archive_course(course=self.get_object())
        return Response(self.get_serializer(course).data)


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

    @action(detail=True, methods=["post"], url_path="activate")
    def activate(self, request, pk=None):
        enrollment = AcademicService.activate_enrollment(enrollment=self.get_object())
        return Response(self.get_serializer(enrollment).data)

    @action(detail=True, methods=["post"], url_path="complete")
    def complete(self, request, pk=None):
        enrollment = AcademicService.complete_enrollment(enrollment=self.get_object())
        return Response(self.get_serializer(enrollment).data)

    @action(detail=True, methods=["post"], url_path="cancel")
    def cancel(self, request, pk=None):
        enrollment = AcademicService.cancel_enrollment(enrollment=self.get_object())
        return Response(self.get_serializer(enrollment).data)


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

    @action(detail=False, methods=["post"], url_path="roll_call")
    def roll_call(self, request):
        serializer = AttendanceRollCallSerializer(data=request.data, context={"request": request})
        serializer.is_valid(raise_exception=True)
        payload = serializer.validated_data

        classroom = payload["classroom"]
        user = getattr(request, "user", None)
        tenant = getattr(request, "tenant", None)

        if _is_teacher_user(user) and not getattr(user, "is_superuser", False):
            teacher_profile = TeacherProfile.objects.filter(tenant=tenant, user=user).first()
            if teacher_profile is None:
                raise ValidationError({"teacher": "Teacher profile not found for the authenticated user."})
            if classroom.homeroom_teacher_id and classroom.homeroom_teacher_id != teacher_profile.id:
                raise ValidationError({"classroom": "Teacher can only register attendance for assigned classrooms."})

        records = AcademicService.record_classroom_roll_call(
            tenant=tenant,
            classroom=classroom,
            attendance_date=payload["attendance_date"],
            present_student_ids=payload.get("present_student_ids") or [],
            late_student_ids=payload.get("late_student_ids") or [],
            notes=payload.get("notes", ""),
        )
        output = self.get_serializer(records, many=True)
        return Response({"count": len(output.data), "results": output.data}, status=status.HTTP_200_OK)


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
    search_fields = ["custom_id", "title", "course__name", "classroom__name", "exam_type", "discipline_final_stage"]
    ordering_fields = ["exam_type", "test_slot", "scheduled_for", "max_score", "created_at"]
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
    ordering_fields = ["attempt_number", "started_at", "expires_at", "submitted_at", "status", "created_at"]
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


class BibliographyContentViewSet(LearningContentViewSet):
    forced_content_type = LearningContent.ContentType.BIBLIOGRAPHY

    def get_queryset(self):
        return super().get_queryset().filter(content_type=self.forced_content_type)

    def perform_create(self, serializer):
        serializer.validated_data["content_type"] = self.forced_content_type
        super().perform_create(serializer)

    def perform_update(self, serializer):
        serializer.validated_data["content_type"] = self.forced_content_type
        super().perform_update(serializer)


class ThematicMapContentViewSet(LearningContentViewSet):
    forced_content_type = LearningContent.ContentType.THEMATIC_MAP

    def get_queryset(self):
        return super().get_queryset().filter(content_type=self.forced_content_type)

    def perform_create(self, serializer):
        serializer.validated_data["content_type"] = self.forced_content_type
        super().perform_create(serializer)

    def perform_update(self, serializer):
        serializer.validated_data["content_type"] = self.forced_content_type
        super().perform_update(serializer)


class RandomTestViewSet(TenantScopedEducationViewSet):
    queryset = RandomTest.objects.select_related(
        "course",
        "classroom",
        "enrollment",
        "student",
        "student__user",
        "teacher",
        "teacher__user",
    ).all()
    serializer_class = RandomTestSerializer
    filterset_class = RandomTestFilter
    search_fields = ["custom_id", "title", "student__student_code", "classroom__name", "course__name"]
    ordering_fields = ["scheduled_for", "opens_at", "closes_at", "status", "created_at"]
    ordering = ["-opens_at", "-scheduled_for", "-created_at"]

    def get_queryset(self):
        qs = super().get_queryset()
        user = getattr(self.request, "user", None)
        if user and not getattr(user, "is_superuser", False):
            if _is_student_user(user):
                return qs.filter(student__user=user)
            if _is_teacher_user(user):
                return qs.filter(
                    Q(classroom__homeroom_teacher__user=user) | Q(teacher__user=user)
                ).distinct()
        return qs

    def perform_create(self, serializer):
        super().perform_create(serializer)
        AcademicService.schedule_random_test(random_test=serializer.instance)

    def perform_update(self, serializer):
        random_test = serializer.instance
        previous_schedule = (
            random_test.classroom_id,
            random_test.student_id,
            random_test.enrollment_id,
            random_test.scheduled_for,
            random_test.opens_at,
            random_test.closes_at,
            random_test.duration_minutes,
            random_test.question_count,
            random_test.status,
        )
        super().perform_update(serializer)
        random_test = serializer.instance
        current_schedule = (
            random_test.classroom_id,
            random_test.student_id,
            random_test.enrollment_id,
            random_test.scheduled_for,
            random_test.opens_at,
            random_test.closes_at,
            random_test.duration_minutes,
            random_test.question_count,
            random_test.status,
        )
        if current_schedule != previous_schedule:
            AcademicService.schedule_random_test(random_test=random_test)

    @action(detail=False, methods=["post"], url_path="schedule_for_classroom")
    def schedule_for_classroom(self, request):
        serializer = RandomTestClassroomScheduleSerializer(data=request.data, context={"request": request})
        serializer.is_valid(raise_exception=True)
        payload = serializer.validated_data

        classroom = payload["classroom"]
        teacher = payload.get("teacher")
        user = getattr(request, "user", None)
        tenant = getattr(request, "tenant", None)

        if _is_teacher_user(user) and not getattr(user, "is_superuser", False):
            teacher_profile = TeacherProfile.objects.filter(tenant=tenant, user=user).first()
            if teacher_profile is None:
                raise ValidationError({"teacher": "Teacher profile not found for the authenticated user."})
            if classroom.homeroom_teacher_id and classroom.homeroom_teacher_id != teacher_profile.id:
                raise ValidationError({"classroom": "Teacher can only schedule random tests for assigned classrooms."})
            if teacher is not None and teacher.id != teacher_profile.id:
                raise ValidationError({"teacher": "Teacher must match the authenticated teacher profile."})
            teacher = teacher_profile
        elif teacher is None and user and tenant is not None:
            teacher = TeacherProfile.objects.filter(tenant=tenant, user=user).first()

        scheduled = AcademicService.schedule_random_tests_for_classroom(
            tenant=tenant,
            classroom=classroom,
            course=payload["course"],
            scheduled_for=payload["scheduled_for"],
            opens_at=payload["opens_at"],
            closes_at=payload.get("closes_at"),
            duration_minutes=payload["duration_minutes"],
            question_count=payload["question_count"],
            title_template=payload["title_template"],
            student_ids=payload.get("student_ids") or [],
            only_active_enrollments=payload["only_active_enrollments"],
            notes=payload.get("notes", ""),
            teacher=teacher,
        )
        output = self.get_serializer(scheduled, many=True)
        return Response(
            {"count": len(output.data), "results": output.data},
            status=status.HTTP_201_CREATED,
        )


class DisciplineScheduleItemViewSet(TenantScopedEducationViewSet):
    queryset = DisciplineScheduleItem.objects.select_related(
        "course",
        "classroom",
        "linked_examination",
        "linked_assignment",
        "linked_content",
    ).all()
    serializer_class = DisciplineScheduleItemSerializer
    filterset_class = DisciplineScheduleItemFilter
    search_fields = ["custom_id", "title", "description", "course__name", "classroom__name", "notes"]
    ordering_fields = ["scheduled_date", "item_type", "status", "created_at"]
    ordering = ["scheduled_date", "created_at"]

    def get_queryset(self):
        qs = super().get_queryset()
        user = getattr(self.request, "user", None)
        if user and not getattr(user, "is_superuser", False):
            if _is_student_user(user):
                return qs.filter(classroom__enrollments__student__user=user).distinct()
            if _is_teacher_user(user):
                return qs.filter(classroom__homeroom_teacher__user=user).distinct()
        return qs

    def perform_create(self, serializer):
        super().perform_create(serializer)
        AcademicService.schedule_discipline_item(item=serializer.instance)

    def perform_update(self, serializer):
        schedule_item = serializer.instance
        previous_state = (
            schedule_item.course_id,
            schedule_item.classroom_id,
            schedule_item.item_type,
            schedule_item.title,
            schedule_item.description,
            schedule_item.scheduled_date,
            schedule_item.requires_attendance,
            schedule_item.status,
            schedule_item.completed_at,
            schedule_item.linked_examination_id,
            schedule_item.linked_assignment_id,
            schedule_item.linked_content_id,
            schedule_item.notes,
        )
        super().perform_update(serializer)
        schedule_item = serializer.instance
        current_state = (
            schedule_item.course_id,
            schedule_item.classroom_id,
            schedule_item.item_type,
            schedule_item.title,
            schedule_item.description,
            schedule_item.scheduled_date,
            schedule_item.requires_attendance,
            schedule_item.status,
            schedule_item.completed_at,
            schedule_item.linked_examination_id,
            schedule_item.linked_assignment_id,
            schedule_item.linked_content_id,
            schedule_item.notes,
        )
        if current_state != previous_state:
            AcademicService.schedule_discipline_item(item=schedule_item)

    @action(detail=False, methods=["post"], url_path="create_full_plan")
    def create_full_plan(self, request):
        serializer = DisciplineFullPlanSerializer(data=request.data, context={"request": request})
        serializer.is_valid(raise_exception=True)
        payload = serializer.validated_data

        classroom = payload["classroom"]
        user = getattr(request, "user", None)
        tenant = getattr(request, "tenant", None)

        if _is_teacher_user(user) and not getattr(user, "is_superuser", False):
            teacher_profile = TeacherProfile.objects.filter(tenant=tenant, user=user).first()
            if teacher_profile is None:
                raise ValidationError({"teacher": "Teacher profile not found for the authenticated user."})
            if classroom.homeroom_teacher_id and classroom.homeroom_teacher_id != teacher_profile.id:
                raise ValidationError({"classroom": "Teacher can only define plans for assigned classrooms."})

        created_items = AcademicService.create_full_discipline_schedule(
            tenant=tenant,
            course=payload["course"],
            classroom=classroom,
            test_dates=payload.get("test_dates") or [],
            assignment_dates=payload.get("assignment_dates") or [],
            themes=payload.get("themes") or [],
            exercise_dates=payload.get("exercise_dates") or [],
            notes=payload.get("notes", ""),
        )
        output = self.get_serializer(created_items, many=True)
        return Response({"count": len(output.data), "results": output.data}, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=["post"], url_path="mark_completed")
    def mark_completed(self, request, pk=None):
        schedule_item = self.get_object()
        schedule_item = AcademicService.mark_schedule_item_completed(schedule_item=schedule_item)
        output = self.get_serializer(schedule_item)
        return Response(output.data, status=status.HTTP_200_OK)


class DisciplineScheduleStudentStatusViewSet(TenantScopedEducationViewSet):
    queryset = DisciplineScheduleStudentStatus.objects.select_related(
        "schedule_item",
        "enrollment",
        "enrollment__student",
        "enrollment__classroom",
    ).all()
    serializer_class = DisciplineScheduleStudentStatusSerializer
    filterset_class = DisciplineScheduleStudentStatusFilter
    search_fields = [
        "custom_id",
        "status",
        "notes",
        "enrollment__student__student_code",
        "schedule_item__title",
    ]
    ordering_fields = ["status", "completion_marked", "completed_at", "created_at"]
    ordering = ["-created_at"]

    def get_queryset(self):
        qs = super().get_queryset()
        user = getattr(self.request, "user", None)
        if user and not getattr(user, "is_superuser", False):
            if _is_student_user(user):
                return qs.filter(enrollment__student__user=user).distinct()
            if _is_teacher_user(user):
                return qs.filter(enrollment__classroom__homeroom_teacher__user=user).distinct()
        return qs

    def perform_create(self, serializer):
        super().perform_create(serializer)
        progress = serializer.instance
        AcademicService.sync_schedule_progress_for_enrollment(
            schedule_item=progress.schedule_item,
            enrollment=progress.enrollment,
        )

    def perform_update(self, serializer):
        progress = serializer.instance
        previous_state = (
            progress.status,
            progress.completion_marked,
            progress.completed_at,
            progress.attendance_status_snapshot,
            progress.notes,
        )
        super().perform_update(serializer)
        progress = serializer.instance
        current_state = (
            progress.status,
            progress.completion_marked,
            progress.completed_at,
            progress.attendance_status_snapshot,
            progress.notes,
        )
        if current_state != previous_state:
            AcademicService.sync_schedule_progress_for_enrollment(
                schedule_item=progress.schedule_item,
                enrollment=progress.enrollment,
            )

    @action(detail=True, methods=["post"], url_path="mark_success")
    def mark_success(self, request, pk=None):
        progress = self.get_object()
        progress.completion_marked = True
        notes = request.data.get("notes")
        if isinstance(notes, str):
            progress.notes = notes
        progress.full_clean()
        progress.save()
        progress = AcademicService.sync_schedule_progress_for_enrollment(
            schedule_item=progress.schedule_item,
            enrollment=progress.enrollment,
        )
        output = self.get_serializer(progress)
        return Response(output.data, status=status.HTTP_200_OK)


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
    "random_test": RandomTestViewSet,
    "content": LearningContentViewSet,
    "lesson": LearningContentViewSet,
    "bibliography": BibliographyContentViewSet,
    "thematic_map": ThematicMapContentViewSet,
    "discipline_schedule": DisciplineScheduleItemViewSet,
    "schedule_progress": DisciplineScheduleStudentStatusViewSet,
    "skill": SkillViewSet,
}

__all__ = [
    "VIEWSET_MAP",
    "AssignmentSubmissionViewSet",
    "AssignmentViewSet",
    "AttendanceRecordViewSet",
    "BibliographyContentViewSet",
    "ClassroomViewSet",
    "CourseViewSet",
    "DisciplineScheduleItemViewSet",
    "DisciplineScheduleStudentStatusViewSet",
    "EnrollmentViewSet",
    "ExaminationAttemptViewSet",
    "ExaminationViewSet",
    "GradeRecordViewSet",
    "LearningContentViewSet",
    "RandomTestViewSet",
    "SkillViewSet",
    "StudentProfileViewSet",
    "TeacherProfileViewSet",
    "ThematicMapContentViewSet",
]
