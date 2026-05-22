from __future__ import annotations

from datetime import timedelta

from django.core.exceptions import ValidationError
from django.db import transaction
from django.utils import timezone

from apps.education.models import (
    Assignment,
    AssignmentSubmission,
    AttendanceRecord,
    Enrollment,
    Examination,
    ExaminationAttempt,
    GradeRecord,
    LearningContent,
    RandomTest,
    StudentProfile,
    TeacherProfile,
)
from events.education.publishers import (
    publish_assignment_published,
    publish_assignment_submitted,
    publish_attendance_recorded,
    publish_enrollment_completed,
    publish_exam_attempt_expired,
    publish_exam_attempt_opened,
    publish_exam_attempt_submitted,
    publish_exam_scheduled,
    publish_grade_published,
    publish_lesson_uploaded,
    publish_random_test_scheduled,
    publish_student_created,
)


class AcademicService:
    """Orquestra fluxos académicos sem acoplamento direto a outros domínios."""

    @staticmethod
    @transaction.atomic
    def register_student(*, student: StudentProfile) -> StudentProfile:
        student.full_clean()
        student.save()
        publish_student_created(
            tenant_id=student.tenant_id,
            student_id=student.id,
            user_id=student.user_id,
        )
        return student

    @staticmethod
    @transaction.atomic
    def activate_enrollment(*, enrollment: Enrollment) -> Enrollment:
        enrollment.status = Enrollment.Status.ACTIVE
        if not enrollment.enrolled_on:
            enrollment.enrolled_on = timezone.localdate()
        enrollment.full_clean()
        enrollment.save()
        publish_enrollment_completed(
            tenant_id=enrollment.tenant_id,
            enrollment_id=enrollment.id,
            student_id=enrollment.student_id,
            classroom_id=enrollment.classroom_id,
        )
        return enrollment

    @staticmethod
    @transaction.atomic
    def record_attendance(*, attendance: AttendanceRecord) -> AttendanceRecord:
        attendance.full_clean()
        attendance.save()
        publish_attendance_recorded(
            tenant_id=attendance.tenant_id,
            attendance_id=attendance.id,
            enrollment_id=attendance.enrollment_id,
            attendance_date=attendance.attendance_date.isoformat(),
            status=attendance.status,
        )
        return attendance

    @staticmethod
    @transaction.atomic
    def publish_grade(*, grade: GradeRecord) -> GradeRecord:
        if grade.published_at is None:
            grade.published_at = timezone.now()
        grade.full_clean()
        grade.save()
        publish_grade_published(
            tenant_id=grade.tenant_id,
            grade_id=grade.id,
            enrollment_id=grade.enrollment_id,
            component=grade.component,
        )
        return grade

    @staticmethod
    @transaction.atomic
    def schedule_examination(*, exam: Examination) -> Examination:
        exam.full_clean()
        exam.save()
        publish_exam_scheduled(
            tenant_id=exam.tenant_id,
            exam_id=exam.id,
            course_id=exam.course_id,
        )
        return exam

    @staticmethod
    @transaction.atomic
    def schedule_random_test(*, random_test: RandomTest) -> RandomTest:
        random_test.full_clean()
        random_test.save()
        publish_random_test_scheduled(
            tenant_id=random_test.tenant_id,
            random_test_id=random_test.id,
            classroom_id=random_test.classroom_id,
            student_id=random_test.student_id,
            course_id=random_test.course_id,
            opens_at=(random_test.opens_at or random_test.scheduled_for).isoformat(),
        )
        return random_test

    @staticmethod
    @transaction.atomic
    def schedule_random_tests_for_classroom(
        *,
        tenant,
        classroom,
        course,
        scheduled_for,
        opens_at,
        closes_at,
        duration_minutes: int,
        question_count: int,
        title_template: str,
        student_ids: list[int],
        only_active_enrollments: bool,
        notes: str,
        teacher: TeacherProfile | None = None,
    ) -> list[RandomTest]:
        if tenant is None:
            raise ValidationError({"tenant": "Authenticated tenant is required."})

        enrollments_qs = Enrollment.objects.select_related("student", "classroom", "classroom__course").filter(
            tenant=tenant,
            classroom=classroom,
        )
        if only_active_enrollments:
            enrollments_qs = enrollments_qs.filter(status=Enrollment.Status.ACTIVE)
        if student_ids:
            enrollments_qs = enrollments_qs.filter(student_id__in=student_ids)

        enrollments = list(enrollments_qs)
        if not enrollments:
            raise ValidationError({"classroom": "No matching enrollments found for the selected classroom."})

        if student_ids:
            found_student_ids = {item.student_id for item in enrollments}
            missing = [sid for sid in student_ids if sid not in found_student_ids]
            if missing:
                raise ValidationError({"student_ids": f"Students not enrolled in this classroom: {missing}"})

        created: list[RandomTest] = []
        for enrollment in enrollments:
            student = enrollment.student
            try:
                title = title_template.format(
                    student_id=student.id,
                    student_code=student.student_code,
                    enrollment_id=enrollment.id,
                    classroom_id=classroom.id,
                )
            except Exception:
                title = title_template

            random_test = RandomTest(
                tenant=tenant,
                course=course,
                classroom=classroom,
                enrollment=enrollment,
                student=student,
                teacher=teacher,
                title=title,
                scheduled_for=scheduled_for,
                opens_at=opens_at,
                closes_at=closes_at,
                duration_minutes=duration_minutes,
                question_count=question_count,
                notes=notes or "",
            )
            created.append(AcademicService.schedule_random_test(random_test=random_test))

        return created

    @staticmethod
    @transaction.atomic
    def publish_assignment(*, assignment: Assignment) -> Assignment:
        if assignment.status != Assignment.Status.PUBLISHED:
            assignment.status = Assignment.Status.PUBLISHED
        if assignment.published_at is None:
            assignment.published_at = timezone.now()
        assignment.full_clean()
        assignment.save()
        publish_assignment_published(
            tenant_id=assignment.tenant_id,
            assignment_id=assignment.id,
            course_id=assignment.course_id,
        )
        return assignment

    @staticmethod
    @transaction.atomic
    def register_assignment_submission(*, submission: AssignmentSubmission) -> AssignmentSubmission:
        if submission.submitted_at is None:
            submission.submitted_at = timezone.now()
        if submission.max_score_snapshot <= 0:
            submission.max_score_snapshot = submission.assignment.max_score
        if submission.attempt_number <= 0:
            existing = AssignmentSubmission.all_objects.filter(
                tenant_id=submission.tenant_id,
                assignment_id=submission.assignment_id,
                student_id=submission.student_id,
            )
            if submission.pk:
                existing = existing.exclude(pk=submission.pk)
            submission.attempt_number = existing.count() + 1
        submission.full_clean()
        submission.save()
        publish_assignment_submitted(
            tenant_id=submission.tenant_id,
            submission_id=submission.id,
            assignment_id=submission.assignment_id,
            student_id=submission.student_id,
            status=submission.status,
        )
        return submission

    @staticmethod
    @transaction.atomic
    def open_exam_attempt(*, attempt: ExaminationAttempt) -> ExaminationAttempt:
        if attempt.started_at is None:
            attempt.started_at = timezone.now()
        if attempt.time_limit_minutes_snapshot <= 0:
            attempt.time_limit_minutes_snapshot = attempt.examination.duration_minutes
        if attempt.max_score_snapshot <= 0:
            attempt.max_score_snapshot = attempt.examination.max_score
        if attempt.attempt_number <= 0:
            existing = ExaminationAttempt.all_objects.filter(
                tenant_id=attempt.tenant_id,
                examination_id=attempt.examination_id,
                student_id=attempt.student_id,
            )
            if attempt.pk:
                existing = existing.exclude(pk=attempt.pk)
            attempt.attempt_number = existing.count() + 1
        if not attempt.expires_at:
            expires_at = attempt.started_at + timedelta(minutes=attempt.time_limit_minutes_snapshot)
            if attempt.examination.closes_at and expires_at > attempt.examination.closes_at:
                expires_at = attempt.examination.closes_at
            attempt.expires_at = expires_at
        if not attempt.status:
            attempt.status = ExaminationAttempt.Status.OPENED
        attempt.full_clean()
        attempt.save()
        publish_exam_attempt_opened(
            tenant_id=attempt.tenant_id,
            attempt_id=attempt.id,
            exam_id=attempt.examination_id,
            student_id=attempt.student_id,
            expires_at=attempt.expires_at.isoformat(),
        )
        return attempt

    @staticmethod
    @transaction.atomic
    def submit_exam_attempt(*, attempt: ExaminationAttempt) -> ExaminationAttempt:
        if attempt.status != ExaminationAttempt.Status.SUBMITTED:
            attempt.status = ExaminationAttempt.Status.SUBMITTED
        if attempt.submitted_at is None:
            attempt.submitted_at = timezone.now()
        attempt.full_clean()
        attempt.save()
        publish_exam_attempt_submitted(
            tenant_id=attempt.tenant_id,
            attempt_id=attempt.id,
            exam_id=attempt.examination_id,
            student_id=attempt.student_id,
            submitted_at=attempt.submitted_at.isoformat(),
        )
        return attempt

    @staticmethod
    @transaction.atomic
    def expire_exam_attempt(*, attempt: ExaminationAttempt) -> ExaminationAttempt:
        if attempt.status == ExaminationAttempt.Status.SUBMITTED:
            return attempt
        attempt.status = ExaminationAttempt.Status.EXPIRED
        attempt.submitted_at = None
        attempt.full_clean()
        attempt.save()
        publish_exam_attempt_expired(
            tenant_id=attempt.tenant_id,
            attempt_id=attempt.id,
            exam_id=attempt.examination_id,
            student_id=attempt.student_id,
            expired_at=attempt.expires_at.isoformat(),
        )
        return attempt

    @staticmethod
    @transaction.atomic
    def publish_learning_content(*, content: LearningContent) -> LearningContent:
        content.published = True
        content.full_clean()
        content.save()
        publish_lesson_uploaded(
            tenant_id=content.tenant_id,
            content_id=content.id,
            course_id=content.course_id,
            content_type=content.content_type,
        )
        return content
