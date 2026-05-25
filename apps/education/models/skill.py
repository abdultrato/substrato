from __future__ import annotations

from django.core.exceptions import ValidationError
from django.db import models

from apps.education.i18n import education_label
from core.models.base import CoreModel


class Skill(CoreModel):
    class Status(models.TextChoices):
        ACTIVE = "ACTIVE", "Active"
        ARCHIVED = "ARCHIVED", "Archived"

    class Category(models.TextChoices):
        TECHNICAL = "TECHNICAL", "Technical"
        COGNITIVE = "COGNITIVE", "Cognitive"
        SOCIOEMOTIONAL = "SOCIOEMOTIONAL", "Socioemotional"
        LANGUAGE = "LANGUAGE", "Language"

    class Level(models.TextChoices):
        FOUNDATION = "FOUNDATION", "Foundation"
        INTERMEDIATE = "INTERMEDIATE", "Intermediate"
        ADVANCED = "ADVANCED", "Advanced"

    prefix = "SKL"

    course = models.ForeignKey(
        "education.Course",
        db_column="course_id",
        on_delete=models.PROTECT,
        related_name="skills",
    )
    code = models.CharField(db_column="code", max_length=32)
    category = models.CharField(
        db_column="category",
        max_length=24,
        choices=Category.choices,
        default=Category.TECHNICAL,
    )
    level = models.CharField(
        db_column="level",
        max_length=24,
        choices=Level.choices,
        default=Level.FOUNDATION,
    )
    description = models.TextField(db_column="description", blank=True, default="")
    status = models.CharField(
        db_column="status",
        max_length=16,
        choices=Status.choices,
        default=Status.ACTIVE,
    )

    class Meta:
        db_table = "education_skill"
        verbose_name = education_label("Competência", "Skill")
        verbose_name_plural = education_label("Competências", "Skills")
        ordering = ["name", "created_at"]
        constraints = [
            models.UniqueConstraint(fields=["tenant", "course", "code"], name="education_skill_tenant_course_code_uniq"),
            models.UniqueConstraint(fields=["tenant", "course", "name"], name="education_skill_tenant_course_name_uniq"),
        ]
        indexes = [
            models.Index(fields=["tenant", "status"]),
            models.Index(fields=["tenant", "course"]),
            models.Index(fields=["tenant", "code"]),
        ]

    def clean(self):
        super().clean()
        if not (self.code or "").strip():
            raise ValidationError({"code": "Skill code is required."})

        if self.course_id and self.tenant_id and self.course.tenant_id != self.tenant_id:
            raise ValidationError({"course": "Course and skill must belong to the same tenant."})

    def __str__(self) -> str:
        return f"{self.code} - {self.name}"
