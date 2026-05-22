from __future__ import annotations

from uuid import uuid4

from django.core.exceptions import ValidationError
from django.db import models

from core.models.base import NoNameCoreModel


class RandomTest(NoNameCoreModel):
    class Status(models.TextChoices):
        SCHEDULED = "SCHEDULED", "Scheduled"
        OPENED = "OPENED", "Opened"
        COMPLETED = "COMPLETED", "Completed"
        EXPIRED = "EXPIRED", "Expired"
        CANCELLED = "CANCELLED", "Cancelled"

    prefix = "RDT"

    course = models.ForeignKey(
        "education.Course",
        db_column="course_id",
        on_delete=models.PROTECT,
        related_name="random_tests",
    )
    classroom = models.ForeignKey(
        "education.Classroom",
        db_column="classroom_id",
        on_delete=models.PROTECT,
        related_name="random_tests",
    )
    enrollment = models.ForeignKey(
        "education.Enrollment",
        db_column="enrollment_id",
        on_delete=models.PROTECT,
        related_name="random_tests",
    )
    student = models.ForeignKey(
        "education.StudentProfile",
        db_column="student_id",
        on_delete=models.PROTECT,
        related_name="random_tests",
    )
    teacher = models.ForeignKey(
        "education.TeacherProfile",
        db_column="teacher_id",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="random_tests",
    )
    title = models.CharField(db_column="title", max_length=180)
    scheduled_for = models.DateTimeField(db_column="scheduled_for")
    opens_at = models.DateTimeField(db_column="opens_at", null=True, blank=True)
    closes_at = models.DateTimeField(db_column="closes_at", null=True, blank=True)
    duration_minutes = models.PositiveIntegerField(db_column="duration_minutes", default=45)
    question_count = models.PositiveIntegerField(db_column="question_count", default=15)
    random_seed = models.CharField(db_column="random_seed", max_length=64, blank=True, default="")
    status = models.CharField(
        db_column="status",
        max_length=16,
        choices=Status.choices,
        default=Status.SCHEDULED,
    )
    notes = models.TextField(db_column="notes", blank=True, default="")

    class Meta:
        db_table = "education_random_test"
        verbose_name = "Random test"
        verbose_name_plural = "Random tests"
        ordering = ["-opens_at", "-scheduled_for", "-created_at"]
        constraints = [
            models.UniqueConstraint(
                fields=["tenant", "enrollment", "opens_at"],
                name="education_random_test_tenant_enrollment_open_uniq",
            ),
        ]
        indexes = [
            models.Index(fields=["tenant", "status"]),
            models.Index(fields=["tenant", "classroom"]),
            models.Index(fields=["tenant", "student"]),
            models.Index(fields=["tenant", "teacher"]),
            models.Index(fields=["tenant", "scheduled_for"]),
            models.Index(fields=["tenant", "opens_at"]),
        ]

    def clean(self):
        super().clean()

        if not (self.title or "").strip():
            raise ValidationError({"title": "Title is required."})

        if self.duration_minutes <= 0:
            raise ValidationError({"duration_minutes": "Duration must be greater than zero."})

        if self.question_count <= 0:
            raise ValidationError({"question_count": "Question count must be greater than zero."})

        if self.opens_at is None:
            self.opens_at = self.scheduled_for

        if self.scheduled_for != self.opens_at:
            self.scheduled_for = self.opens_at

        if self.closes_at and self.closes_at <= self.opens_at:
            raise ValidationError({"closes_at": "Close time must be after opens_at."})

        if self.course_id and self.tenant_id and self.course.tenant_id != self.tenant_id:
            raise ValidationError({"course": "Course and random test must belong to the same tenant."})

        if self.classroom_id and self.tenant_id and self.classroom.tenant_id != self.tenant_id:
            raise ValidationError({"classroom": "Classroom and random test must belong to the same tenant."})

        if self.enrollment_id and self.tenant_id and self.enrollment.tenant_id != self.tenant_id:
            raise ValidationError({"enrollment": "Enrollment and random test must belong to the same tenant."})

        if self.student_id and self.tenant_id and self.student.tenant_id != self.tenant_id:
            raise ValidationError({"student": "Student and random test must belong to the same tenant."})

        if self.teacher_id and self.tenant_id and self.teacher.tenant_id != self.tenant_id:
            raise ValidationError({"teacher": "Teacher and random test must belong to the same tenant."})

        if self.classroom_id and self.course_id and self.classroom.course_id != self.course_id:
            raise ValidationError({"course": "Course must match classroom course."})

        if self.enrollment_id and self.student_id and self.enrollment.student_id != self.student_id:
            raise ValidationError({"student": "Student must match the enrollment owner."})

        if self.enrollment_id and self.classroom_id and self.enrollment.classroom_id != self.classroom_id:
            raise ValidationError({"enrollment": "Enrollment classroom must match random test classroom."})

        if self.enrollment_id and self.course_id:
            enrollment_course_id = getattr(getattr(self.enrollment, "classroom", None), "course_id", None)
            if enrollment_course_id and enrollment_course_id != self.course_id:
                raise ValidationError({"enrollment": "Enrollment course must match random test course."})

        if not (self.random_seed or "").strip():
            self.random_seed = uuid4().hex

    def __str__(self) -> str:
        return f"{self.title} - {self.student} ({self.opens_at:%Y-%m-%d %H:%M})"
