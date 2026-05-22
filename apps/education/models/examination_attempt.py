from __future__ import annotations

from datetime import timedelta

from django.core.exceptions import ValidationError
from django.db import models
from django.utils import timezone

from core.models.base import NoNameCoreModel


class ExaminationAttempt(NoNameCoreModel):
    class Status(models.TextChoices):
        OPENED = "OPENED", "Opened"
        SUBMITTED = "SUBMITTED", "Submitted"
        EXPIRED = "EXPIRED", "Expired"

    prefix = "XAT"

    examination = models.ForeignKey(
        "education.Examination",
        db_column="examination_id",
        on_delete=models.PROTECT,
        related_name="attempts",
    )
    enrollment = models.ForeignKey(
        "education.Enrollment",
        db_column="enrollment_id",
        on_delete=models.PROTECT,
        related_name="examination_attempts",
    )
    student = models.ForeignKey(
        "education.StudentProfile",
        db_column="student_id",
        on_delete=models.PROTECT,
        related_name="examination_attempts",
    )
    status = models.CharField(
        db_column="status",
        max_length=16,
        choices=Status.choices,
        default=Status.OPENED,
    )
    started_at = models.DateTimeField(db_column="started_at", default=timezone.now)
    expires_at = models.DateTimeField(db_column="expires_at")
    submitted_at = models.DateTimeField(db_column="submitted_at", null=True, blank=True)
    time_limit_minutes_snapshot = models.PositiveIntegerField(
        db_column="time_limit_minutes_snapshot",
        default=90,
    )
    max_score_snapshot = models.DecimalField(
        db_column="max_score_snapshot",
        max_digits=6,
        decimal_places=2,
        default=20,
    )
    submission_payload = models.TextField(db_column="submission_payload", blank=True, default="")
    score = models.DecimalField(db_column="score", max_digits=6, decimal_places=2, null=True, blank=True)
    attempt_number = models.PositiveSmallIntegerField(db_column="attempt_number", default=1)
    requires_year_repeat = models.BooleanField(db_column="requires_year_repeat", default=False)
    teacher_feedback = models.TextField(db_column="teacher_feedback", blank=True, default="")
    graded_by = models.ForeignKey(
        "education.TeacherProfile",
        db_column="graded_by_id",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="exam_attempts_graded",
    )
    graded_at = models.DateTimeField(db_column="graded_at", null=True, blank=True)

    class Meta:
        db_table = "education_examination_attempt"
        verbose_name = "Examination attempt"
        verbose_name_plural = "Examination attempts"
        ordering = ["-started_at", "-created_at"]
        constraints = [
            models.UniqueConstraint(
                fields=["tenant", "examination", "student", "attempt_number"],
                name="education_exam_attempt_tenant_exam_student_attempt_uniq",
            ),
        ]
        indexes = [
            models.Index(fields=["tenant", "status"]),
            models.Index(fields=["tenant", "started_at"]),
            models.Index(fields=["tenant", "expires_at"]),
            models.Index(fields=["tenant", "examination"]),
            models.Index(fields=["tenant", "student"]),
            models.Index(fields=["tenant", "attempt_number"]),
        ]

    def clean(self):
        super().clean()

        if self.examination_id and self.tenant_id and self.examination.tenant_id != self.tenant_id:
            raise ValidationError({"examination": "Examination and attempt must belong to the same tenant."})

        if self.enrollment_id and self.tenant_id and self.enrollment.tenant_id != self.tenant_id:
            raise ValidationError({"enrollment": "Enrollment and attempt must belong to the same tenant."})

        if self.student_id and self.tenant_id and self.student.tenant_id != self.tenant_id:
            raise ValidationError({"student": "Student and attempt must belong to the same tenant."})

        if self.graded_by_id and self.tenant_id and self.graded_by.tenant_id != self.tenant_id:
            raise ValidationError({"graded_by": "Teacher and attempt must belong to the same tenant."})

        if self.enrollment_id and self.student_id and self.enrollment.student_id != self.student_id:
            raise ValidationError({"student": "Student must match the enrollment owner."})

        if self.examination_id and self.enrollment_id:
            exam = self.examination
            enrollment = self.enrollment
            if exam.classroom_id and enrollment.classroom_id != exam.classroom_id:
                raise ValidationError({"enrollment": "Enrollment classroom must match examination classroom."})
            if enrollment.classroom and enrollment.classroom.course_id != exam.course_id:
                raise ValidationError({"enrollment": "Enrollment course must match examination course."})

        if self.time_limit_minutes_snapshot <= 0:
            raise ValidationError({"time_limit_minutes_snapshot": "Time limit must be greater than zero."})

        if self.max_score_snapshot <= 0:
            raise ValidationError({"max_score_snapshot": "Max score snapshot must be greater than zero."})

        if self.attempt_number <= 0:
            raise ValidationError({"attempt_number": "Attempt number must be greater than zero."})

        if not self.expires_at and self.started_at:
            self.expires_at = self.started_at + timedelta(minutes=self.time_limit_minutes_snapshot)

        if self.expires_at <= self.started_at:
            raise ValidationError({"expires_at": "Expiration must be after start time."})

        if self.examination_id:
            exam = self.examination
            opens_at = exam.opens_at or exam.scheduled_for
            closes_at = exam.closes_at
            if exam.status == exam.Status.DRAFT:
                raise ValidationError({"examination": "Cannot open attempt for a draft exam."})
            if exam.status == exam.Status.CLOSED:
                raise ValidationError({"examination": "Cannot open attempt for a closed exam."})
            if opens_at and self.started_at < opens_at:
                raise ValidationError({"started_at": "Attempt cannot start before exam open time."})
            if closes_at and self.started_at > closes_at:
                raise ValidationError({"started_at": "Attempt cannot start after exam close time."})
            if closes_at and self.expires_at > closes_at:
                self.expires_at = closes_at
            if self.started_at >= self.expires_at:
                raise ValidationError({"expires_at": "Attempt window has already expired."})

            sibling_attempts = ExaminationAttempt.all_objects.filter(
                tenant_id=self.tenant_id,
                examination_id=self.examination_id,
                student_id=self.student_id,
            )
            if self.pk:
                sibling_attempts = sibling_attempts.exclude(pk=self.pk)

            if sibling_attempts.filter(attempt_number=self.attempt_number).exists():
                raise ValidationError({"attempt_number": "Attempt number already used for this student and examination."})

            if self.attempt_number > exam.max_attempts:
                raise ValidationError({"attempt_number": "Attempt number exceeds the allowed maximum for this examination."})

            if self.attempt_number > 1:
                previous_attempt = sibling_attempts.filter(attempt_number=self.attempt_number - 1).first()
                if previous_attempt is None:
                    raise ValidationError({"attempt_number": "Previous attempt is required before opening the next attempt."})
                if previous_attempt.status != self.Status.SUBMITTED:
                    raise ValidationError(
                        {"attempt_number": "Previous attempt must be submitted before opening a new attempt."}
                    )
                if previous_attempt.score is None:
                    raise ValidationError(
                        {"attempt_number": "Previous attempt score is required to decide if a new attempt is allowed."}
                    )
                if previous_attempt.score >= exam.pass_mark:
                    raise ValidationError({"attempt_number": "New attempt is not allowed after reaching pass mark."})
                if self.started_at.date() <= previous_attempt.started_at.date():
                    raise ValidationError(
                        {"started_at": "Each new attempt must happen on a different day after the previous one."}
                    )

            if exam.exam_type == exam.ExamType.DISCIPLINE_FINAL:
                if self.attempt_number != 1:
                    raise ValidationError({"attempt_number": "Discipline final exam supports a single attempt per stage."})
                stage = exam.discipline_final_stage
                if not stage:
                    raise ValidationError({"examination": "Discipline final exam stage is required."})

                stage_rank = {
                    exam.DisciplineFinalStage.NORMAL: 1,
                    exam.DisciplineFinalStage.RECORRENCIA: 2,
                    exam.DisciplineFinalStage.ESPECIAL: 3,
                }
                current_rank = stage_rank.get(stage, 0)
                if current_rank == 0:
                    raise ValidationError({"examination": "Invalid discipline final stage."})

                same_course_attempts = ExaminationAttempt.all_objects.select_related("examination").filter(
                    tenant_id=self.tenant_id,
                    student_id=self.student_id,
                    examination__course_id=exam.course_id,
                    examination__exam_type=exam.ExamType.DISCIPLINE_FINAL,
                    status=self.Status.SUBMITTED,
                    started_at__year=self.started_at.year,
                )
                if self.pk:
                    same_course_attempts = same_course_attempts.exclude(pk=self.pk)

                if same_course_attempts.filter(examination__discipline_final_stage=stage).exists():
                    raise ValidationError({"examination": "Student already has a submitted attempt for this stage."})

                if same_course_attempts.filter(score__gte=exam.pass_mark).exists():
                    raise ValidationError(
                        {"examination": "Student already passed discipline final and cannot open another stage."}
                    )

                if current_rank > 1:
                    required_stage = exam.DisciplineFinalStage.NORMAL
                    if current_rank == 3:
                        required_stage = exam.DisciplineFinalStage.RECORRENCIA
                    previous_stage_attempt = (
                        same_course_attempts.filter(examination__discipline_final_stage=required_stage)
                        .order_by("-started_at")
                        .first()
                    )
                    if previous_stage_attempt is None:
                        raise ValidationError(
                            {"examination": "Previous discipline final stage must be completed before this stage."}
                        )
                    if previous_stage_attempt.score is None or previous_stage_attempt.score >= exam.pass_mark:
                        raise ValidationError(
                            {"examination": "This stage is only allowed when previous stage score is below pass mark."}
                        )

            if exam.exam_type == exam.ExamType.COURSE_FINAL:
                if self.attempt_number != 1:
                    raise ValidationError({"attempt_number": "Course final exam allows only one attempt per examination."})
                attempt_year = self.started_at.year
                course_final_attempts = ExaminationAttempt.all_objects.select_related("examination").filter(
                    tenant_id=self.tenant_id,
                    student_id=self.student_id,
                    examination__course_id=exam.course_id,
                    examination__exam_type=exam.ExamType.COURSE_FINAL,
                    started_at__year=attempt_year,
                )
                if self.pk:
                    course_final_attempts = course_final_attempts.exclude(pk=self.pk)
                if course_final_attempts.exists():
                    raise ValidationError(
                        {"started_at": "Course final exam allows only one attempt per student in each year."}
                    )

        if self.status == self.Status.SUBMITTED and self.submitted_at is None:
            raise ValidationError({"submitted_at": "Submission time is required for submitted attempts."})

        if self.status == self.Status.OPENED and self.submitted_at is not None:
            raise ValidationError({"submitted_at": "Open attempt cannot have submitted_at."})

        if self.submitted_at and self.submitted_at > self.expires_at:
            raise ValidationError({"submitted_at": "Submission must happen before expiration."})

        if self.status == self.Status.EXPIRED and self.submitted_at is not None:
            raise ValidationError({"submitted_at": "Expired attempt cannot have a submission timestamp."})

        if self.score is not None:
            if self.score < 0:
                raise ValidationError({"score": "Score cannot be negative."})
            if self.score > self.max_score_snapshot:
                raise ValidationError({"score": "Score cannot exceed max score snapshot."})
            if self.status != self.Status.SUBMITTED:
                raise ValidationError({"status": "Score can only be registered for submitted attempts."})

        if self.examination_id and self.examination.exam_type == self.examination.ExamType.COURSE_FINAL:
            self.requires_year_repeat = bool(self.status == self.Status.SUBMITTED and self.score is not None and self.score < self.examination.pass_mark)
        else:
            self.requires_year_repeat = False

        if self.pk:
            previous = ExaminationAttempt.all_objects.filter(pk=self.pk).first()
            if previous:
                immutable_fields = (
                    "examination_id",
                    "enrollment_id",
                    "student_id",
                    "attempt_number",
                    "started_at",
                    "expires_at",
                    "time_limit_minutes_snapshot",
                    "max_score_snapshot",
                )
                for field in immutable_fields:
                    if getattr(previous, field) != getattr(self, field):
                        raise ValidationError("Attempt core payload is immutable after creation.")

                if previous.status == self.Status.SUBMITTED and self.status != self.Status.SUBMITTED:
                    raise ValidationError({"status": "Submitted attempt cannot transition to another status."})
                if previous.status == self.Status.EXPIRED and self.status != self.Status.EXPIRED:
                    raise ValidationError({"status": "Expired attempt cannot transition to another status."})
                if previous.status == self.Status.OPENED and self.status == self.Status.OPENED and previous.submitted_at:
                    raise ValidationError({"status": "Open attempt state is inconsistent."})
                if previous.submitted_at and self.submitted_at != previous.submitted_at:
                    raise ValidationError({"submitted_at": "Submission timestamp is immutable."})

    def __str__(self) -> str:
        return f"{self.examination} / {self.student} ({self.status})"
