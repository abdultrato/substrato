from __future__ import annotations

from django.core.exceptions import ValidationError
from django.db import models

from core.models.base import NoNameCoreModel


class Examination(NoNameCoreModel):
    prefix = "EXM"

    course = models.ForeignKey(
        "education.Course",
        db_column="course_id",
        on_delete=models.PROTECT,
        related_name="examinations",
    )
    classroom = models.ForeignKey(
        "education.Classroom",
        db_column="classroom_id",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="examinations",
    )
    title = models.CharField(db_column="title", max_length=180)
    scheduled_for = models.DateTimeField(db_column="scheduled_for")
    max_score = models.DecimalField(db_column="max_score", max_digits=6, decimal_places=2, default=20)

    class Meta:
        db_table = "education_examination"
        verbose_name = "Examination"
        verbose_name_plural = "Examinations"
        ordering = ["-scheduled_for", "-created_at"]
        indexes = [
            models.Index(fields=["tenant", "scheduled_for"]),
            models.Index(fields=["tenant", "course"]),
        ]

    def clean(self):
        super().clean()

        if not (self.title or "").strip():
            raise ValidationError({"title": "Title is required."})

        if self.max_score <= 0:
            raise ValidationError({"max_score": "Max score must be greater than zero."})

        if self.course_id and self.tenant_id and self.course.tenant_id != self.tenant_id:
            raise ValidationError({"course": "Course and examination must belong to the same tenant."})

        if self.classroom_id and self.tenant_id and self.classroom.tenant_id != self.tenant_id:
            raise ValidationError({"classroom": "Classroom and examination must belong to the same tenant."})

    def __str__(self) -> str:
        return f"{self.title} ({self.scheduled_for:%Y-%m-%d %H:%M})"
