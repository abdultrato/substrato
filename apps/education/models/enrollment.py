from __future__ import annotations

from django.core.exceptions import ValidationError
from django.db import models
from django.utils import timezone

from apps.education.i18n import education_label
from core.models.base import NoNameCoreModel


class Enrollment(NoNameCoreModel):
    class Status(models.TextChoices):
        PENDING = "PENDING", "Pending"
        ACTIVE = "ACTIVE", "Active"
        TRANSFERRED = "TRANSFERRED", "Transferred"
        COMPLETED = "COMPLETED", "Completed"
        CANCELLED = "CANCELLED", "Cancelled"

    prefix = "ENR"

    student = models.ForeignKey(
        "education.StudentProfile",
        db_column="student_id",
        on_delete=models.PROTECT,
        related_name="enrollments",
    )
    classroom = models.ForeignKey(
        "education.Classroom",
        db_column="classroom_id",
        on_delete=models.PROTECT,
        related_name="enrollments",
    )
    status = models.CharField(
        db_column="status",
        max_length=16,
        choices=Status.choices,
        default=Status.PENDING,
    )
    enrolled_on = models.DateField(db_column="enrolled_on", default=timezone.localdate)
    closed_on = models.DateField(db_column="closed_on", null=True, blank=True)

    class Meta:
        db_table = "education_enrollment"
        verbose_name = education_label("Matrícula", "Enrollment")
        verbose_name_plural = education_label("Matrículas", "Enrollments")
        ordering = ["-enrolled_on", "-created_at"]
        constraints = [
            models.UniqueConstraint(
                fields=["tenant", "student", "classroom"],
                name="education_enrollment_tenant_student_classroom_uniq",
            ),
        ]
        indexes = [
            models.Index(fields=["tenant", "status"]),
            models.Index(fields=["tenant", "enrolled_on"]),
        ]

    def clean(self):
        super().clean()

        if self.student_id and self.tenant_id and self.student.tenant_id != self.tenant_id:
            raise ValidationError({"student": "Student and enrollment must belong to the same tenant."})

        if self.classroom_id and self.tenant_id and self.classroom.tenant_id != self.tenant_id:
            raise ValidationError({"classroom": "Classroom and enrollment must belong to the same tenant."})

        if self.closed_on and self.enrolled_on and self.closed_on < self.enrolled_on:
            raise ValidationError({"closed_on": "Closed date cannot be before enrolled date."})

    def __str__(self) -> str:
        return f"{self.student} -> {self.classroom} ({self.status})"
