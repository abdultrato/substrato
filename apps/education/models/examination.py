from __future__ import annotations

from django.core.exceptions import ValidationError
from django.db import models
from django.utils import timezone

from core.models.base import NoNameCoreModel


class Examination(NoNameCoreModel):
    class Status(models.TextChoices):
        DRAFT = "DRAFT", "Draft"
        PUBLISHED = "PUBLISHED", "Published"
        CLOSED = "CLOSED", "Closed"

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
    opens_at = models.DateTimeField(db_column="opens_at", null=True, blank=True)
    closes_at = models.DateTimeField(db_column="closes_at", null=True, blank=True)
    duration_minutes = models.PositiveIntegerField(db_column="duration_minutes", default=90)
    max_attempts = models.PositiveIntegerField(db_column="max_attempts", default=1)
    status = models.CharField(
        db_column="status",
        max_length=16,
        choices=Status.choices,
        default=Status.DRAFT,
    )
    published_at = models.DateTimeField(db_column="published_at", null=True, blank=True)
    max_score = models.DecimalField(db_column="max_score", max_digits=6, decimal_places=2, default=20)

    class Meta:
        db_table = "education_examination"
        verbose_name = "Examination"
        verbose_name_plural = "Examinations"
        ordering = ["-opens_at", "-scheduled_for", "-created_at"]
        indexes = [
            models.Index(fields=["tenant", "scheduled_for"]),
            models.Index(fields=["tenant", "opens_at"]),
            models.Index(fields=["tenant", "closes_at"]),
            models.Index(fields=["tenant", "status"]),
            models.Index(fields=["tenant", "course"]),
        ]

    def clean(self):
        super().clean()

        if not (self.title or "").strip():
            raise ValidationError({"title": "Title is required."})

        if self.max_score <= 0:
            raise ValidationError({"max_score": "Max score must be greater than zero."})

        if self.duration_minutes <= 0:
            raise ValidationError({"duration_minutes": "Duration must be greater than zero."})

        if self.max_attempts <= 0:
            raise ValidationError({"max_attempts": "Max attempts must be at least one."})
        if self.max_attempts != 1:
            raise ValidationError({"max_attempts": "Online examination currently supports a single irreversible attempt."})

        if self.opens_at is None:
            self.opens_at = self.scheduled_for

        if self.scheduled_for != self.opens_at:
            self.scheduled_for = self.opens_at

        if self.closes_at and self.closes_at <= self.opens_at:
            raise ValidationError({"closes_at": "Close time must be after opens_at."})

        if self.course_id and self.tenant_id and self.course.tenant_id != self.tenant_id:
            raise ValidationError({"course": "Course and examination must belong to the same tenant."})

        if self.classroom_id and self.tenant_id and self.classroom.tenant_id != self.tenant_id:
            raise ValidationError({"classroom": "Classroom and examination must belong to the same tenant."})

        if self.status == self.Status.PUBLISHED and self.published_at is None:
            self.published_at = timezone.now()

        if self.status == self.Status.DRAFT and self.published_at is not None:
            raise ValidationError({"status": "Draft examination cannot have published_at set."})

    def __str__(self) -> str:
        return f"{self.title} ({self.opens_at:%Y-%m-%d %H:%M})"
