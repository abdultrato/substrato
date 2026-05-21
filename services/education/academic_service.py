from __future__ import annotations

from django.db import transaction
from django.utils import timezone

from apps.education.models import Enrollment, Examination, GradeRecord, LearningContent, StudentProfile
from events.education.publishers import (
    publish_enrollment_completed,
    publish_exam_scheduled,
    publish_grade_published,
    publish_lesson_uploaded,
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
