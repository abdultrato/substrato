from __future__ import annotations

from django.core.exceptions import ValidationError
from django.db import models
from django.utils import timezone

from apps.education.i18n import education_label
from core.models.base import NoNameCoreModel


class Examination(NoNameCoreModel):
    class Status(models.TextChoices):
        DRAFT = "DRAFT", "Draft"
        PUBLISHED = "PUBLISHED", "Published"
        CLOSED = "CLOSED", "Closed"

    class ExamType(models.TextChoices):
        REGULAR = "REGULAR", "Regular"
        TEST = "TEST", "Test"
        DISCIPLINE_FINAL = "DISCIPLINE_FINAL", "Discipline final"
        COURSE_FINAL = "COURSE_FINAL", "Course final"

    class DisciplineFinalStage(models.TextChoices):
        NORMAL = "NORMAL", "Normal"
        RECORRENCIA = "RECORRENCIA", "Recorrencia"
        ESPECIAL = "ESPECIAL", "Especial"

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
    exam_type = models.CharField(
        db_column="exam_type",
        max_length=24,
        choices=ExamType.choices,
        default=ExamType.REGULAR,
    )
    discipline_final_stage = models.CharField(
        db_column="discipline_final_stage",
        max_length=16,
        choices=DisciplineFinalStage.choices,
        null=True,
        blank=True,
    )
    test_slot = models.PositiveSmallIntegerField(db_column="test_slot", null=True, blank=True)
    pass_mark = models.DecimalField(db_column="pass_mark", max_digits=6, decimal_places=2, default=10)
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
        verbose_name = education_label("Exame", "Examination")
        verbose_name_plural = education_label("Exames", "Examinations")
        ordering = ["-opens_at", "-scheduled_for", "-created_at"]
        indexes = [
            models.Index(fields=["tenant", "scheduled_for"]),
            models.Index(fields=["tenant", "opens_at"]),
            models.Index(fields=["tenant", "closes_at"]),
            models.Index(fields=["tenant", "status"]),
            models.Index(fields=["tenant", "course"]),
            models.Index(fields=["tenant", "exam_type"]),
        ]

    def clean(self):
        super().clean()

        if not (self.title or "").strip():
            raise ValidationError({"title": "Title is required."})

        if self.max_score <= 0:
            raise ValidationError({"max_score": "Max score must be greater than zero."})

        if self.pass_mark <= 0:
            raise ValidationError({"pass_mark": "Pass mark must be greater than zero."})
        if self.pass_mark > self.max_score:
            raise ValidationError({"pass_mark": "Pass mark cannot exceed max score."})

        if self.duration_minutes <= 0:
            raise ValidationError({"duration_minutes": "Duration must be greater than zero."})

        if self.max_attempts <= 0:
            raise ValidationError({"max_attempts": "Max attempts must be at least one."})

        if self.exam_type == self.ExamType.REGULAR:
            self.test_slot = None
            self.discipline_final_stage = None
        elif self.exam_type == self.ExamType.TEST:
            if self.max_attempts != 3:
                self.max_attempts = 3
            if self.test_slot is None:
                self.test_slot = 1
            if self.test_slot < 1 or self.test_slot > 3:
                raise ValidationError({"test_slot": "Test slot must be between 1 and 3."})
            self.discipline_final_stage = None
        elif self.exam_type == self.ExamType.DISCIPLINE_FINAL:
            if self.max_attempts != 1:
                self.max_attempts = 1
            self.test_slot = None
            if not self.discipline_final_stage:
                raise ValidationError(
                    {"discipline_final_stage": "Discipline final exam must define stage (normal, recorrencia, especial)."}
                )
        elif self.exam_type == self.ExamType.COURSE_FINAL:
            if self.max_attempts != 1:
                self.max_attempts = 1
            self.test_slot = None
            self.discipline_final_stage = None
        else:
            raise ValidationError({"exam_type": "Invalid examination type."})

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

        if self.classroom_id and self.course_id and self.classroom.course_id != self.course_id:
            raise ValidationError({"course": "Course must match classroom course."})

        if self.tenant_id and self.course_id:
            base_qs = Examination.all_objects.filter(tenant_id=self.tenant_id, course_id=self.course_id, exam_type=self.exam_type)
            if self.classroom_id:
                base_qs = base_qs.filter(classroom_id=self.classroom_id)
            if self.pk:
                base_qs = base_qs.exclude(pk=self.pk)

            if (
                self.exam_type == self.ExamType.TEST
                and self.test_slot is not None
                and base_qs.filter(test_slot=self.test_slot).exists()
            ):
                raise ValidationError({"test_slot": "Each discipline/classroom can only have one test per slot (1, 2, 3)."})

            if (
                self.exam_type == self.ExamType.DISCIPLINE_FINAL
                and self.discipline_final_stage
                and base_qs.filter(discipline_final_stage=self.discipline_final_stage).exists()
            ):
                raise ValidationError(
                    {"discipline_final_stage": "Each discipline/classroom can only have one final exam for each stage."}
                )

        if self.status == self.Status.PUBLISHED and self.published_at is None:
            self.published_at = timezone.now()

        if self.status == self.Status.DRAFT and self.published_at is not None:
            raise ValidationError({"status": "Draft examination cannot have published_at set."})

    def __str__(self) -> str:
        return f"{self.title} ({self.opens_at:%Y-%m-%d %H:%M})"
