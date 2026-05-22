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
                fields=["tenant", "examination", "student"],
                name="education_exam_attempt_tenant_exam_student_uniq",
            ),
        ]
        indexes = [
            models.Index(fields=["tenant", "status"]),
            models.Index(fields=["tenant", "started_at"]),
            models.Index(fields=["tenant", "expires_at"]),
            models.Index(fields=["tenant", "examination"]),
            models.Index(fields=["tenant", "student"]),
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

        if self.pk:
            previous = ExaminationAttempt.all_objects.filter(pk=self.pk).first()
            if previous:
                immutable_fields = (
                    "examination_id",
                    "enrollment_id",
                    "student_id",
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
