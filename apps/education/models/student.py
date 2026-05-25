from __future__ import annotations

from django.conf import settings
from django.core.exceptions import ValidationError
from django.db import models

from apps.education.i18n import education_label
from core.models.base import NoNameCoreModel


class StudentProfile(NoNameCoreModel):
    class Status(models.TextChoices):
        ACTIVE = "ACTIVE", "Active"
        INACTIVE = "INACTIVE", "Inactive"
        SUSPENDED = "SUSPENDED", "Suspended"

    prefix = "STU"

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        db_column="user_id",
        on_delete=models.PROTECT,
        related_name="education_student_profiles",
    )
    student_code = models.CharField(db_column="student_code", max_length=32)
    birth_date = models.DateField(db_column="birth_date", null=True, blank=True)
    guardian_name = models.CharField(db_column="guardian_name", max_length=120, blank=True, default="")
    status = models.CharField(
        db_column="status",
        max_length=16,
        choices=Status.choices,
        default=Status.ACTIVE,
    )
    notes = models.TextField(db_column="notes", blank=True, default="")

    class Meta:
        db_table = "education_student_profile"
        verbose_name = education_label("Estudante", "Student")
        verbose_name_plural = education_label("Estudantes", "Students")
        ordering = ["student_code", "created_at"]
        constraints = [
            models.UniqueConstraint(fields=["tenant", "user"], name="education_student_tenant_user_uniq"),
            models.UniqueConstraint(fields=["tenant", "student_code"], name="education_student_tenant_code_uniq"),
        ]
        indexes = [
            models.Index(fields=["tenant", "status"]),
            models.Index(fields=["tenant", "student_code"]),
        ]

    def clean(self):
        super().clean()
        if not (self.student_code or "").strip():
            raise ValidationError({"student_code": "Student code is required."})

        user_tenant_id = getattr(self.user, "tenant_id", None)
        if self.tenant_id and user_tenant_id and user_tenant_id != self.tenant_id:
            raise ValidationError({"user": "User and student must belong to the same tenant."})

    def __str__(self) -> str:
        code = (self.student_code or "").strip() or self.custom_id
        return f"{code} - {self.user}"
