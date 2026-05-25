from __future__ import annotations

from datetime import datetime, time, timedelta

from django.core.exceptions import ValidationError
from django.db import transaction
from django.utils import timezone

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
    StudentProfile,
    TeacherProfile,
)
from events.education.publishers import (
    publish_assignment_published,
    publish_assignment_submitted,
    publish_attendance_recorded,
    publish_discipline_schedule_item_defined,
    publish_discipline_schedule_student_status_updated,
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
        AcademicService.refresh_schedule_progress_for_attendance(attendance=attendance)
        return attendance

    @staticmethod
    @transaction.atomic
    def record_classroom_roll_call(
        *,
        tenant,
        classroom: Classroom,
        attendance_date,
        present_student_ids: list[int],
        late_student_ids: list[int] | None = None,
        notes: str = "",
    ) -> list[AttendanceRecord]:
        if tenant is None:
            raise ValidationError({"tenant": "Authenticated tenant is required."})

        late_student_ids = late_student_ids or []
        present_set = {int(student_id) for student_id in present_student_ids}
        late_set = {int(student_id) for student_id in late_student_ids}
        overlap = present_set.intersection(late_set)
        if overlap:
            raise ValidationError({"late_student_ids": f"Students cannot be both present and late: {sorted(overlap)}"})

        enrollments = list(
            Enrollment.objects.select_related("student").filter(
                tenant=tenant,
                classroom=classroom,
                status=Enrollment.Status.ACTIVE,
            )
        )
        if not enrollments:
            raise ValidationError({"classroom": "No active enrollments found for this classroom."})

        enrolled_student_ids = {enrollment.student_id for enrollment in enrollments}
        invalid_present = sorted(present_set - enrolled_student_ids)
        invalid_late = sorted(late_set - enrolled_student_ids)
        if invalid_present:
            raise ValidationError({"present_student_ids": f"Students not enrolled in this classroom: {invalid_present}"})
        if invalid_late:
            raise ValidationError({"late_student_ids": f"Students not enrolled in this classroom: {invalid_late}"})

        records: list[AttendanceRecord] = []
        for enrollment in enrollments:
            if enrollment.student_id in late_set:
                status_value = AttendanceRecord.Status.LATE
            elif enrollment.student_id in present_set:
                status_value = AttendanceRecord.Status.PRESENT
            else:
                status_value = AttendanceRecord.Status.ABSENT

            record, created = AttendanceRecord.all_objects.get_or_create(
                tenant=tenant,
                enrollment=enrollment,
                attendance_date=attendance_date,
                defaults={"status": status_value, "notes": notes or ""},
            )
            changed = created or record.status != status_value or (record.notes or "") != (notes or "")
            if changed:
                record.status = status_value
                record.notes = notes or ""
                record = AcademicService.record_attendance(attendance=record)
            else:
                AcademicService.refresh_schedule_progress_for_attendance(attendance=record)
            records.append(record)
        return records

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
    def schedule_discipline_item(*, item: DisciplineScheduleItem) -> DisciplineScheduleItem:
        item.full_clean()
        item.save()
        publish_discipline_schedule_item_defined(
            tenant_id=item.tenant_id,
            schedule_item_id=item.id,
            course_id=item.course_id,
            classroom_id=item.classroom_id,
            item_type=item.item_type,
            scheduled_date=item.scheduled_date.isoformat(),
            status=item.status,
        )
        AcademicService.sync_schedule_progress_for_item(schedule_item=item)
        return item

    @staticmethod
    @transaction.atomic
    def sync_schedule_progress_for_item(*, schedule_item: DisciplineScheduleItem) -> list[DisciplineScheduleStudentStatus]:
        enrollments = Enrollment.objects.filter(
            tenant_id=schedule_item.tenant_id,
            classroom_id=schedule_item.classroom_id,
            status=Enrollment.Status.ACTIVE,
        ).all()
        updated: list[DisciplineScheduleStudentStatus] = []
        for enrollment in enrollments:
            progress = AcademicService.sync_schedule_progress_for_enrollment(schedule_item=schedule_item, enrollment=enrollment)
            updated.append(progress)
        return updated

    @staticmethod
    @transaction.atomic
    def sync_schedule_progress_for_enrollment(
        *, schedule_item: DisciplineScheduleItem, enrollment: Enrollment
    ) -> DisciplineScheduleStudentStatus:
        progress, _ = DisciplineScheduleStudentStatus.all_objects.get_or_create(
            tenant_id=schedule_item.tenant_id,
            schedule_item=schedule_item,
            enrollment=enrollment,
            defaults={"completion_marked": False},
        )
        progress.full_clean()
        progress.save()
        publish_discipline_schedule_student_status_updated(
            tenant_id=progress.tenant_id,
            progress_id=progress.id,
            schedule_item_id=progress.schedule_item_id,
            enrollment_id=progress.enrollment_id,
            status=progress.status,
        )
        return progress

    @staticmethod
    @transaction.atomic
    def refresh_schedule_progress_for_attendance(*, attendance: AttendanceRecord) -> None:
        schedule_items = DisciplineScheduleItem.objects.filter(
            tenant_id=attendance.tenant_id,
            classroom_id=attendance.enrollment.classroom_id,
            scheduled_date=attendance.attendance_date,
            requires_attendance=True,
        ).all()
        for schedule_item in schedule_items:
            AcademicService.sync_schedule_progress_for_enrollment(
                schedule_item=schedule_item,
                enrollment=attendance.enrollment,
            )

    @staticmethod
    @transaction.atomic
    def create_full_discipline_schedule(
        *,
        tenant,
        course: Course,
        classroom: Classroom,
        test_dates: list,
        assignment_dates: list,
        themes: list[dict],
        exercise_dates: list,
        notes: str = "",
    ) -> list[DisciplineScheduleItem]:
        if tenant is None:
            raise ValidationError({"tenant": "Authenticated tenant is required."})

        if classroom.course_id != course.id:
            raise ValidationError({"course": "Course must match classroom course."})

        now = timezone.now()
        created: list[DisciplineScheduleItem] = []

        unique_test_dates = list(dict.fromkeys(test_dates))
        for index, test_date in enumerate(unique_test_dates, start=1):
            starts_at = timezone.make_aware(datetime.combine(test_date, time(hour=9, minute=0)))
            closes_at = starts_at + timedelta(hours=2)
            exam = Examination(
                tenant=tenant,
                course=course,
                classroom=classroom,
                title=f"Teste {index} - {course.name}",
                exam_type=Examination.ExamType.TEST,
                test_slot=index,
                scheduled_for=starts_at,
                opens_at=starts_at,
                closes_at=closes_at,
                duration_minutes=90,
                max_attempts=3,
                pass_mark=10,
                status=Examination.Status.PUBLISHED,
                published_at=now,
                max_score=20,
            )
            exam = AcademicService.schedule_examination(exam=exam)
            item = DisciplineScheduleItem(
                tenant=tenant,
                course=course,
                classroom=classroom,
                item_type=DisciplineScheduleItem.ItemType.TEST,
                title=f"Teste {index}",
                description=f"Teste avaliativo {index} da disciplina.",
                scheduled_date=test_date,
                requires_attendance=True,
                linked_examination=exam,
                notes=notes or "",
            )
            created.append(AcademicService.schedule_discipline_item(item=item))

        unique_assignment_dates = list(dict.fromkeys(assignment_dates))
        for index, assignment_date in enumerate(unique_assignment_dates, start=1):
            due_at = timezone.make_aware(datetime.combine(assignment_date, time(hour=23, minute=59)))
            opens_at = due_at - timedelta(days=7)
            assignment = Assignment(
                tenant=tenant,
                course=course,
                classroom=classroom,
                title=f"Trabalho {index} - {course.name}",
                instructions=f"Trabalho {index} com prazo definido no cronograma.",
                opens_at=opens_at,
                due_at=due_at,
                work_category=Assignment.WorkCategory.MANDATORY,
                max_score=20,
                status=Assignment.Status.PUBLISHED,
                allow_late_submission=False,
                allow_multiple_submissions=False,
                max_submissions=1,
                published_at=now,
            )
            assignment = AcademicService.publish_assignment(assignment=assignment)
            item = DisciplineScheduleItem(
                tenant=tenant,
                course=course,
                classroom=classroom,
                item_type=DisciplineScheduleItem.ItemType.ASSIGNMENT,
                title=f"Trabalho {index}",
                description=f"Trabalho programado {index} da disciplina.",
                scheduled_date=assignment_date,
                requires_attendance=False,
                linked_assignment=assignment,
                notes=notes or "",
            )
            created.append(AcademicService.schedule_discipline_item(item=item))

        for theme in themes:
            item = DisciplineScheduleItem(
                tenant=tenant,
                course=course,
                classroom=classroom,
                item_type=DisciplineScheduleItem.ItemType.THEME,
                title=theme["title"],
                description=theme.get("description", ""),
                scheduled_date=theme["scheduled_date"],
                requires_attendance=True,
                notes=notes or "",
            )
            created.append(AcademicService.schedule_discipline_item(item=item))

        unique_exercise_dates = list(dict.fromkeys(exercise_dates))
        for index, exercise_date in enumerate(unique_exercise_dates, start=1):
            item = DisciplineScheduleItem(
                tenant=tenant,
                course=course,
                classroom=classroom,
                item_type=DisciplineScheduleItem.ItemType.EXERCISE,
                title=f"Resolução de Exercícios {index}",
                description="Sessão de resolução orientada pelo professor.",
                scheduled_date=exercise_date,
                requires_attendance=True,
                notes=notes or "",
            )
            created.append(AcademicService.schedule_discipline_item(item=item))

        return created

    @staticmethod
    @transaction.atomic
    def mark_schedule_item_completed(*, schedule_item: DisciplineScheduleItem) -> DisciplineScheduleItem:
        schedule_item.status = DisciplineScheduleItem.Status.COMPLETED
        if schedule_item.completed_at is None:
            schedule_item.completed_at = timezone.now()
        return AcademicService.schedule_discipline_item(item=schedule_item)

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
