from __future__ import annotations

from django.core.exceptions import ValidationError
from django.db import models

from core.models.base import NoNameCoreModel


class GradeRecord(NoNameCoreModel):
    prefix = "GRD"

    enrollment = models.ForeignKey(
        "education.Enrollment",
        db_column="enrollment_id",
        on_delete=models.PROTECT,
        related_name="grades",
    )
    teacher = models.ForeignKey(
        "education.TeacherProfile",
        db_column="teacher_id",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="grades_given",
    )
    assignment_submission = models.ForeignKey(
        "education.AssignmentSubmission",
        db_column="assignment_submission_id",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="grade_records",
    )
    examination_attempt = models.ForeignKey(
        "education.ExaminationAttempt",
        db_column="examination_attempt_id",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="grade_records",
    )
    component = models.CharField(db_column="component", max_length=120)
    score = models.DecimalField(db_column="score", max_digits=6, decimal_places=2)
    max_score = models.DecimalField(db_column="max_score", max_digits=6, decimal_places=2, default=20)
    weight = models.DecimalField(db_column="weight", max_digits=5, decimal_places=2, default=1)
    published_at = models.DateTimeField(db_column="published_at", null=True, blank=True)

    class Meta:
        db_table = "education_grade_record"
        verbose_name = "Grade"
        verbose_name_plural = "Grades"
        ordering = ["-created_at"]
        constraints = [
            models.UniqueConstraint(
                fields=["tenant", "enrollment", "component"],
                name="education_grade_unique_component_per_enrollment",
            ),
        ]
        indexes = [
            models.Index(fields=["tenant", "published_at"]),
            models.Index(fields=["tenant", "component"]),
        ]

    def clean(self):
        super().clean()

        if self.enrollment_id and self.tenant_id and self.enrollment.tenant_id != self.tenant_id:
            raise ValidationError({"enrollment": "Enrollment and grade must belong to the same tenant."})

        if self.teacher_id and self.tenant_id and self.teacher.tenant_id != self.tenant_id:
            raise ValidationError({"teacher": "Teacher and grade must belong to the same tenant."})

        if self.assignment_submission_id and self.tenant_id and self.assignment_submission.tenant_id != self.tenant_id:
            raise ValidationError({"assignment_submission": "Submission and grade must belong to the same tenant."})

        if self.examination_attempt_id and self.tenant_id and self.examination_attempt.tenant_id != self.tenant_id:
            raise ValidationError({"examination_attempt": "Exam attempt and grade must belong to the same tenant."})

        if self.assignment_submission_id and self.examination_attempt_id:
            raise ValidationError("A grade cannot reference both assignment_submission and examination_attempt.")

        if self.assignment_submission_id and self.assignment_submission.enrollment_id != self.enrollment_id:
            raise ValidationError({"assignment_submission": "Submission enrollment must match grade enrollment."})

        if self.examination_attempt_id and self.examination_attempt.enrollment_id != self.enrollment_id:
            raise ValidationError({"examination_attempt": "Exam attempt enrollment must match grade enrollment."})

        if self.max_score <= 0:
            raise ValidationError({"max_score": "Max score must be greater than zero."})

        if self.score < 0:
            raise ValidationError({"score": "Score cannot be negative."})

        if self.score > self.max_score:
            raise ValidationError({"score": "Score cannot exceed max score."})

    def __str__(self) -> str:
        return f"{self.component}: {self.score}/{self.max_score}"
