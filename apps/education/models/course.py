from __future__ import annotations

from django.core.exceptions import ValidationError
from django.db import models

from core.models.base import CoreModel


class Course(CoreModel):
    class Status(models.TextChoices):
        DRAFT = "DRAFT", "Draft"
        ACTIVE = "ACTIVE", "Active"
        ARCHIVED = "ARCHIVED", "Archived"

    prefix = "CRS"

    code = models.CharField(db_column="code", max_length=32)
    description = models.TextField(db_column="description", blank=True, default="")
    workload_hours = models.PositiveIntegerField(db_column="workload_hours", default=0)
    status = models.CharField(
        db_column="status",
        max_length=16,
        choices=Status.choices,
        default=Status.ACTIVE,
    )

    class Meta:
        db_table = "education_course"
        verbose_name = "Course"
        verbose_name_plural = "Courses"
        ordering = ["name", "created_at"]
        constraints = [
            models.UniqueConstraint(fields=["tenant", "code"], name="education_course_tenant_code_uniq"),
            models.UniqueConstraint(fields=["tenant", "name"], name="education_course_tenant_name_uniq"),
        ]
        indexes = [
            models.Index(fields=["tenant", "status"]),
            models.Index(fields=["tenant", "code"]),
        ]

    def clean(self):
        super().clean()
        if not (self.code or "").strip():
            raise ValidationError({"code": "Course code is required."})

    def __str__(self) -> str:
        return f"{self.code} - {self.name}"
