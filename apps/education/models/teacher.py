from __future__ import annotations

from django.conf import settings
from django.core.exceptions import ValidationError
from django.db import models

from core.models.base import NoNameCoreModel


class TeacherProfile(NoNameCoreModel):
    class Status(models.TextChoices):
        ACTIVE = "ACTIVE", "Active"
        INACTIVE = "INACTIVE", "Inactive"

    prefix = "TCH"

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        db_column="user_id",
        on_delete=models.PROTECT,
        related_name="education_teacher_profiles",
    )
    teacher_code = models.CharField(db_column="teacher_code", max_length=32)
    specialty = models.CharField(db_column="specialty", max_length=120, blank=True, default="")
    status = models.CharField(
        db_column="status",
        max_length=16,
        choices=Status.choices,
        default=Status.ACTIVE,
    )

    class Meta:
        db_table = "education_teacher_profile"
        verbose_name = "Teacher"
        verbose_name_plural = "Teachers"
        ordering = ["teacher_code", "created_at"]
        constraints = [
            models.UniqueConstraint(fields=["tenant", "user"], name="education_teacher_tenant_user_uniq"),
            models.UniqueConstraint(fields=["tenant", "teacher_code"], name="education_teacher_tenant_code_uniq"),
        ]
        indexes = [
            models.Index(fields=["tenant", "status"]),
            models.Index(fields=["tenant", "teacher_code"]),
        ]

    def clean(self):
        super().clean()
        if not (self.teacher_code or "").strip():
            raise ValidationError({"teacher_code": "Teacher code is required."})

        user_tenant_id = getattr(self.user, "tenant_id", None)
        if self.tenant_id and user_tenant_id and user_tenant_id != self.tenant_id:
            raise ValidationError({"user": "User and teacher must belong to the same tenant."})

    def __str__(self) -> str:
        code = (self.teacher_code or "").strip() or self.custom_id
        return f"{code} - {self.user}"
