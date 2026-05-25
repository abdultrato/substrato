from __future__ import annotations

from django.core.exceptions import ValidationError
from django.db import models

from apps.education.i18n import education_label
from core.models.base import CoreModel


class Classroom(CoreModel):
    prefix = "CLS"

    course = models.ForeignKey(
        "education.Course",
        db_column="course_id",
        on_delete=models.PROTECT,
        related_name="classrooms",
    )
    homeroom_teacher = models.ForeignKey(
        "education.TeacherProfile",
        db_column="homeroom_teacher_id",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="homeroom_classrooms",
    )
    academic_year = models.CharField(db_column="academic_year", max_length=16)
    capacity = models.PositiveIntegerField(db_column="capacity", default=40)

    class Meta:
        db_table = "education_classroom"
        verbose_name = education_label("Turma", "Classroom")
        verbose_name_plural = education_label("Turmas", "Classrooms")
        ordering = ["academic_year", "name"]
        constraints = [
            models.UniqueConstraint(
                fields=["tenant", "course", "name", "academic_year"],
                name="education_classroom_unique_name_per_year",
            ),
        ]
        indexes = [
            models.Index(fields=["tenant", "academic_year"]),
            models.Index(fields=["tenant", "course"]),
        ]

    def clean(self):
        super().clean()
        if self.capacity <= 0:
            raise ValidationError({"capacity": "Classroom capacity must be greater than zero."})

        if self.course_id and self.tenant_id and self.course.tenant_id != self.tenant_id:
            raise ValidationError({"course": "Course and classroom must belong to the same tenant."})

        if self.homeroom_teacher_id and self.tenant_id and self.homeroom_teacher.tenant_id != self.tenant_id:
            raise ValidationError({"homeroom_teacher": "Teacher and classroom must belong to the same tenant."})

    def __str__(self) -> str:
        return f"{self.name} ({self.academic_year})"
