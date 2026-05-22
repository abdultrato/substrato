from __future__ import annotations

from django.core.exceptions import ValidationError
from django.db import models
from django.utils import timezone

from core.models.base import NoNameCoreModel


class Assignment(NoNameCoreModel):
    class WorkCategory(models.TextChoices):
        MANDATORY = "MANDATORY", "Mandatory"
        HYGIENIC = "HYGIENIC", "Hygienic"
        OPTIONAL = "OPTIONAL", "Optional"

    class Status(models.TextChoices):
        DRAFT = "DRAFT", "Draft"
        PUBLISHED = "PUBLISHED", "Published"
        CLOSED = "CLOSED", "Closed"

    prefix = "ASG"

    course = models.ForeignKey(
        "education.Course",
        db_column="course_id",
        on_delete=models.PROTECT,
        related_name="assignments",
    )
    classroom = models.ForeignKey(
        "education.Classroom",
        db_column="classroom_id",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="assignments",
    )
    teacher = models.ForeignKey(
        "education.TeacherProfile",
        db_column="teacher_id",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="assignments_created",
    )
    title = models.CharField(db_column="title", max_length=180)
    instructions = models.TextField(db_column="instructions", blank=True, default="")
    opens_at = models.DateTimeField(db_column="opens_at", null=True, blank=True)
    due_at = models.DateTimeField(db_column="due_at")
    work_category = models.CharField(
        db_column="work_category",
        max_length=16,
        choices=WorkCategory.choices,
        default=WorkCategory.MANDATORY,
    )
    max_score = models.DecimalField(db_column="max_score", max_digits=6, decimal_places=2, default=20)
    status = models.CharField(
        db_column="status",
        max_length=16,
        choices=Status.choices,
        default=Status.DRAFT,
    )
    allow_late_submission = models.BooleanField(db_column="allow_late_submission", default=False)
    allow_multiple_submissions = models.BooleanField(db_column="allow_multiple_submissions", default=False)
    max_submissions = models.PositiveIntegerField(db_column="max_submissions", default=1)
    published_at = models.DateTimeField(db_column="published_at", null=True, blank=True)

    class Meta:
        db_table = "education_assignment"
        verbose_name = "Assignment"
        verbose_name_plural = "Assignments"
        ordering = ["due_at", "-created_at"]
        constraints = [
            models.UniqueConstraint(
                fields=["tenant", "classroom", "title", "due_at"],
                name="education_assignment_tenant_classroom_title_due_uniq",
            ),
        ]
        indexes = [
            models.Index(fields=["tenant", "status"]),
            models.Index(fields=["tenant", "due_at"]),
            models.Index(fields=["tenant", "work_category"]),
            models.Index(fields=["tenant", "course"]),
            models.Index(fields=["tenant", "classroom"]),
        ]

    def clean(self):
        super().clean()

        if not (self.title or "").strip():
            raise ValidationError({"title": "Title is required."})

        if self.max_score <= 0:
            raise ValidationError({"max_score": "Max score must be greater than zero."})

        if self.max_submissions <= 0:
            raise ValidationError({"max_submissions": "Max submissions must be at least one."})

        if not self.allow_multiple_submissions and self.max_submissions != 1:
            raise ValidationError(
                {"max_submissions": "Max submissions must be 1 when multiple submissions are disabled."}
            )

        if self.opens_at and self.due_at and self.due_at <= self.opens_at:
            raise ValidationError({"due_at": "Due date must be after opens_at."})

        if self.course_id and self.tenant_id and self.course.tenant_id != self.tenant_id:
            raise ValidationError({"course": "Course and assignment must belong to the same tenant."})

        if self.classroom_id and self.tenant_id and self.classroom.tenant_id != self.tenant_id:
            raise ValidationError({"classroom": "Classroom and assignment must belong to the same tenant."})

        if self.teacher_id and self.tenant_id and self.teacher.tenant_id != self.tenant_id:
            raise ValidationError({"teacher": "Teacher and assignment must belong to the same tenant."})

        if self.status == self.Status.PUBLISHED and self.published_at is None:
            self.published_at = timezone.now()

        if self.status == self.Status.DRAFT and self.published_at is not None:
            raise ValidationError({"status": "Draft assignment cannot have published_at set."})

    def __str__(self) -> str:
        return f"{self.title} ({self.due_at:%Y-%m-%d %H:%M})"


class AssignmentSubmission(NoNameCoreModel):
    class Status(models.TextChoices):
        SUBMITTED = "SUBMITTED", "Submitted"
        LATE = "LATE", "Late"
        GRADED = "GRADED", "Graded"

    prefix = "SBM"

    assignment = models.ForeignKey(
        "education.Assignment",
        db_column="assignment_id",
        on_delete=models.PROTECT,
        related_name="submissions",
    )
    enrollment = models.ForeignKey(
        "education.Enrollment",
        db_column="enrollment_id",
        on_delete=models.PROTECT,
        related_name="assignment_submissions",
    )
    student = models.ForeignKey(
        "education.StudentProfile",
        db_column="student_id",
        on_delete=models.PROTECT,
        related_name="assignment_submissions",
    )
    attempt_number = models.PositiveIntegerField(db_column="attempt_number", default=1)
    submitted_at = models.DateTimeField(db_column="submitted_at", default=timezone.now)
    status = models.CharField(
        db_column="status",
        max_length=16,
        choices=Status.choices,
        default=Status.SUBMITTED,
    )
    content_text = models.TextField(db_column="content_text", blank=True, default="")
    attachment_url = models.URLField(db_column="attachment_url", blank=True, default="")
    max_score_snapshot = models.DecimalField(db_column="max_score_snapshot", max_digits=6, decimal_places=2, default=20)
    score = models.DecimalField(db_column="score", max_digits=6, decimal_places=2, null=True, blank=True)
    teacher_feedback = models.TextField(db_column="teacher_feedback", blank=True, default="")
    graded_by = models.ForeignKey(
        "education.TeacherProfile",
        db_column="graded_by_id",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="submissions_graded",
    )
    graded_at = models.DateTimeField(db_column="graded_at", null=True, blank=True)

    class Meta:
        db_table = "education_assignment_submission"
        verbose_name = "Assignment submission"
        verbose_name_plural = "Assignment submissions"
        ordering = ["-submitted_at", "-created_at"]
        constraints = [
            models.UniqueConstraint(
                fields=["tenant", "assignment", "student", "attempt_number"],
                name="education_assignment_submission_tenant_assignment_student_attempt_uniq",
            ),
        ]
        indexes = [
            models.Index(fields=["tenant", "status"]),
            models.Index(fields=["tenant", "submitted_at"]),
            models.Index(fields=["tenant", "assignment"]),
            models.Index(fields=["tenant", "student"]),
        ]

    def clean(self):
        super().clean()

        if self.assignment_id and self.tenant_id and self.assignment.tenant_id != self.tenant_id:
            raise ValidationError({"assignment": "Assignment and submission must belong to the same tenant."})

        if self.enrollment_id and self.tenant_id and self.enrollment.tenant_id != self.tenant_id:
            raise ValidationError({"enrollment": "Enrollment and submission must belong to the same tenant."})

        if self.student_id and self.tenant_id and self.student.tenant_id != self.tenant_id:
            raise ValidationError({"student": "Student and submission must belong to the same tenant."})

        if self.graded_by_id and self.tenant_id and self.graded_by.tenant_id != self.tenant_id:
            raise ValidationError({"graded_by": "Teacher and submission must belong to the same tenant."})

        if self.enrollment_id and self.student_id and self.enrollment.student_id != self.student_id:
            raise ValidationError({"student": "Student must match submission enrollment."})

        if self.attempt_number <= 0:
            raise ValidationError({"attempt_number": "Attempt number must be at least one."})

        if self.max_score_snapshot <= 0:
            raise ValidationError({"max_score_snapshot": "Max score snapshot must be greater than zero."})

        if self.assignment_id:
            assignment = self.assignment
            if not self.pk and assignment.status != Assignment.Status.PUBLISHED:
                raise ValidationError({"assignment": "Assignment must be published before submission."})

            if self.submitted_at and assignment.opens_at and self.submitted_at < assignment.opens_at:
                raise ValidationError({"submitted_at": "Submission cannot happen before opens_at."})

            if self.submitted_at and self.submitted_at > assignment.due_at:
                if not assignment.allow_late_submission:
                    raise ValidationError({"submitted_at": "Submission deadline has expired for this assignment."})
                if self.status == self.Status.SUBMITTED:
                    self.status = self.Status.LATE

            max_submissions = assignment.max_submissions or 1
            if self.attempt_number > max_submissions:
                raise ValidationError({"attempt_number": "Attempt number exceeds assignment max submissions."})

            existing_attempts = AssignmentSubmission.all_objects.filter(
                tenant_id=self.tenant_id,
                assignment_id=self.assignment_id,
                student_id=self.student_id,
            )
            if self.pk:
                existing_attempts = existing_attempts.exclude(pk=self.pk)
            existing_count = existing_attempts.count()

            if not self.pk:
                if not assignment.allow_multiple_submissions and existing_count > 0:
                    raise ValidationError({"assignment": "Multiple submissions are disabled for this assignment."})
                expected_attempt = existing_count + 1
                if self.attempt_number != expected_attempt:
                    raise ValidationError({"attempt_number": f"Attempt number must be {expected_attempt}."})

        if self.status == self.Status.LATE and self.assignment_id and not self.assignment.allow_late_submission:
            raise ValidationError({"status": "Late status is not allowed for this assignment."})

        if self.score is not None:
            if self.score < 0:
                raise ValidationError({"score": "Score cannot be negative."})
            if self.score > self.max_score_snapshot:
                raise ValidationError({"score": "Score cannot exceed max score snapshot."})
            if self.status != self.Status.GRADED:
                self.status = self.Status.GRADED

        if self.status == self.Status.GRADED and self.score is None:
            raise ValidationError({"score": "Score is required when status is graded."})

        if self.pk:
            previous = AssignmentSubmission.all_objects.filter(pk=self.pk).first()
            if previous:
                immutable_fields = (
                    "assignment_id",
                    "enrollment_id",
                    "student_id",
                    "attempt_number",
                    "submitted_at",
                    "content_text",
                    "attachment_url",
                    "max_score_snapshot",
                )
                for field in immutable_fields:
                    if getattr(previous, field) != getattr(self, field):
                        raise ValidationError("Submission payload is immutable after creation.")

                if previous.status == self.Status.GRADED and self.status != self.Status.GRADED:
                    raise ValidationError({"status": "Graded submission cannot revert to another status."})

    def __str__(self) -> str:
        return f"{self.assignment} / {self.student} (#{self.attempt_number})"
