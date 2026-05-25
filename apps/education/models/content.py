from __future__ import annotations

from django.core.exceptions import ValidationError
from django.db import models

from apps.education.i18n import education_label
from core.models.base import NoNameCoreModel


class LearningContent(NoNameCoreModel):
    class ContentType(models.TextChoices):
        LESSON = "LESSON", "Lesson"
        DOCUMENT = "DOCUMENT", "Document"
        VIDEO = "VIDEO", "Video"
        LINK = "LINK", "Link"
        BIBLIOGRAPHY = "BIBLIOGRAPHY", "Bibliography"
        THEMATIC_MAP = "THEMATIC_MAP", "Thematic map"

    prefix = "CNT"

    course = models.ForeignKey(
        "education.Course",
        db_column="course_id",
        on_delete=models.PROTECT,
        related_name="contents",
    )
    author = models.ForeignKey(
        "education.TeacherProfile",
        db_column="author_id",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="contents_authored",
    )
    title = models.CharField(db_column="title", max_length=180)
    content_type = models.CharField(
        db_column="content_type",
        max_length=16,
        choices=ContentType.choices,
        default=ContentType.LESSON,
    )
    body = models.TextField(db_column="body", blank=True, default="")
    file_url = models.URLField(db_column="file_url", blank=True, default="")
    external_url = models.URLField(db_column="external_url", blank=True, default="")
    published = models.BooleanField(db_column="published", default=False)

    class Meta:
        db_table = "education_learning_content"
        verbose_name = education_label("Conteúdo de Aprendizagem", "Learning content")
        verbose_name_plural = education_label("Conteúdos de Aprendizagem", "Learning contents")
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["tenant", "content_type"]),
            models.Index(fields=["tenant", "published"]),
        ]

    def clean(self):
        super().clean()

        if not (self.title or "").strip():
            raise ValidationError({"title": "Title is required."})

        if self.course_id and self.tenant_id and self.course.tenant_id != self.tenant_id:
            raise ValidationError({"course": "Course and content must belong to the same tenant."})

        if self.author_id and self.tenant_id and self.author.tenant_id != self.tenant_id:
            raise ValidationError({"author": "Author and content must belong to the same tenant."})

    def __str__(self) -> str:
        return self.title
