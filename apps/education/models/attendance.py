from __future__ import annotations

from django.core.exceptions import ValidationError
from django.db import models

from core.models.base import NoNameCoreModel


class AttendanceRecord(NoNameCoreModel):
    class Status(models.TextChoices):
        PRESENT = "PRESENT", "Present"
        ABSENT = "ABSENT", "Absent"
        LATE = "LATE", "Late"
        EXCUSED = "EXCUSED", "Excused"

    prefix = "ATT"

    enrollment = models.ForeignKey(
        "education.Enrollment",
        db_column="enrollment_id",
        on_delete=models.PROTECT,
        related_name="attendance",
    )
    attendance_date = models.DateField(db_column="attendance_date")
    status = models.CharField(db_column="status", max_length=16, choices=Status.choices, default=Status.PRESENT)
    notes = models.CharField(db_column="notes", max_length=255, blank=True, default="")

    class Meta:
        db_table = "education_attendance_record"
        verbose_name = "Attendance"
        verbose_name_plural = "Attendance"
        ordering = ["-attendance_date", "-created_at"]
        constraints = [
            models.UniqueConstraint(
                fields=["tenant", "enrollment", "attendance_date"],
                name="education_attendance_unique_day_per_enrollment",
            ),
        ]
        indexes = [
            models.Index(fields=["tenant", "attendance_date"]),
            models.Index(fields=["tenant", "status"]),
        ]

    def clean(self):
        super().clean()
        if self.enrollment_id and self.tenant_id and self.enrollment.tenant_id != self.tenant_id:
            raise ValidationError({"enrollment": "Enrollment and attendance must belong to the same tenant."})

    def __str__(self) -> str:
        return f"{self.enrollment} - {self.attendance_date} ({self.status})"
