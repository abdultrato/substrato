from __future__ import annotations

from django.core.exceptions import ValidationError
from django.db import models
from django.utils import timezone

from apps.education.models.attendance import AttendanceRecord
from core.models.base import NoNameCoreModel


class DisciplineScheduleItem(NoNameCoreModel):
    class ItemType(models.TextChoices):
        TEST = "TEST", "Test"
        ASSIGNMENT = "ASSIGNMENT", "Assignment"
        THEME = "THEME", "Theme"
        EXERCISE = "EXERCISE", "Exercise"

    class Status(models.TextChoices):
        PLANNED = "PLANNED", "Planned"
        COMPLETED = "COMPLETED", "Completed"
        OVERDUE = "OVERDUE", "Overdue"

    prefix = "SCH"

    course = models.ForeignKey(
        "education.Course",
        db_column="course_id",
        on_delete=models.PROTECT,
        related_name="discipline_schedule_items",
    )
    classroom = models.ForeignKey(
        "education.Classroom",
        db_column="classroom_id",
        on_delete=models.PROTECT,
        related_name="discipline_schedule_items",
    )
    item_type = models.CharField(
        db_column="item_type",
        max_length=16,
        choices=ItemType.choices,
        default=ItemType.THEME,
    )
    title = models.CharField(db_column="title", max_length=180)
    description = models.TextField(db_column="description", blank=True, default="")
    scheduled_date = models.DateField(db_column="scheduled_date")
    requires_attendance = models.BooleanField(db_column="requires_attendance", default=True)
    status = models.CharField(
        db_column="status",
        max_length=16,
        choices=Status.choices,
        default=Status.PLANNED,
    )
    completed_at = models.DateTimeField(db_column="completed_at", null=True, blank=True)
    linked_examination = models.ForeignKey(
        "education.Examination",
        db_column="linked_examination_id",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="discipline_schedule_items",
    )
    linked_assignment = models.ForeignKey(
        "education.Assignment",
        db_column="linked_assignment_id",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="discipline_schedule_items",
    )
    linked_content = models.ForeignKey(
        "education.LearningContent",
        db_column="linked_content_id",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="discipline_schedule_items",
    )
    notes = models.CharField(db_column="notes", max_length=255, blank=True, default="")

    class Meta:
        db_table = "education_discipline_schedule_item"
        verbose_name = "Discipline schedule item"
        verbose_name_plural = "Discipline schedule items"
        ordering = ["scheduled_date", "item_type", "created_at"]
        constraints = [
            models.UniqueConstraint(
                fields=["tenant", "classroom", "item_type", "title", "scheduled_date"],
                name="education_schedule_item_tenant_classroom_type_title_date_uniq",
            ),
        ]
        indexes = [
            models.Index(fields=["tenant", "status"]),
            models.Index(fields=["tenant", "scheduled_date"]),
            models.Index(fields=["tenant", "course"]),
            models.Index(fields=["tenant", "classroom"]),
            models.Index(fields=["tenant", "item_type"]),
        ]

    def clean(self):
        super().clean()

        if not (self.title or "").strip():
            raise ValidationError({"title": "Title is required."})

        if self.course_id and self.tenant_id and self.course.tenant_id != self.tenant_id:
            raise ValidationError({"course": "Course and schedule item must belong to the same tenant."})

        if self.classroom_id and self.tenant_id and self.classroom.tenant_id != self.tenant_id:
            raise ValidationError({"classroom": "Classroom and schedule item must belong to the same tenant."})

        if self.classroom_id and self.course_id and self.classroom.course_id != self.course_id:
            raise ValidationError({"course": "Course must match classroom course."})

        if self.linked_examination_id:
            if self.tenant_id and self.linked_examination.tenant_id != self.tenant_id:
                raise ValidationError({"linked_examination": "Linked examination must belong to the same tenant."})
            if self.linked_examination.course_id != self.course_id:
                raise ValidationError({"linked_examination": "Linked examination must belong to the same course."})

        if self.linked_assignment_id:
            if self.tenant_id and self.linked_assignment.tenant_id != self.tenant_id:
                raise ValidationError({"linked_assignment": "Linked assignment must belong to the same tenant."})
            if self.linked_assignment.course_id != self.course_id:
                raise ValidationError({"linked_assignment": "Linked assignment must belong to the same course."})

        if self.linked_content_id:
            if self.tenant_id and self.linked_content.tenant_id != self.tenant_id:
                raise ValidationError({"linked_content": "Linked content must belong to the same tenant."})
            if self.linked_content.course_id != self.course_id:
                raise ValidationError({"linked_content": "Linked content must belong to the same course."})

        if self.completed_at:
            self.status = self.Status.COMPLETED
        elif self.status == self.Status.COMPLETED:
            self.completed_at = timezone.now()
        elif self.scheduled_date and self.scheduled_date < timezone.localdate():
            self.status = self.Status.OVERDUE
        else:
            self.status = self.Status.PLANNED

    def __str__(self) -> str:
        return f"{self.title} ({self.scheduled_date:%Y-%m-%d})"


class DisciplineScheduleStudentStatus(NoNameCoreModel):
    class Status(models.TextChoices):
        PENDING = "PENDING", "Pending"
        SUCCESS = "SUCCESS", "Success"
        OVERDUE = "OVERDUE", "Overdue"

    prefix = "SSP"

    schedule_item = models.ForeignKey(
        "education.DisciplineScheduleItem",
        db_column="schedule_item_id",
        on_delete=models.CASCADE,
        related_name="student_progress",
    )
    enrollment = models.ForeignKey(
        "education.Enrollment",
        db_column="enrollment_id",
        on_delete=models.PROTECT,
        related_name="discipline_schedule_progress",
    )
    status = models.CharField(
        db_column="status",
        max_length=16,
        choices=Status.choices,
        default=Status.PENDING,
    )
    completion_marked = models.BooleanField(db_column="completion_marked", default=False)
    completed_at = models.DateTimeField(db_column="completed_at", null=True, blank=True)
    attendance_status_snapshot = models.CharField(db_column="attendance_status_snapshot", max_length=16, blank=True, default="")
    notes = models.CharField(db_column="notes", max_length=255, blank=True, default="")

    class Meta:
        db_table = "education_discipline_schedule_student_status"
        verbose_name = "Discipline schedule student status"
        verbose_name_plural = "Discipline schedule student statuses"
        ordering = ["schedule_item__scheduled_date", "enrollment_id", "created_at"]
        constraints = [
            models.UniqueConstraint(
                fields=["tenant", "schedule_item", "enrollment"],
                name="education_schedule_student_status_tenant_item_enrollment_uniq",
            ),
        ]
        indexes = [
            models.Index(fields=["tenant", "status"]),
            models.Index(fields=["tenant", "schedule_item"]),
            models.Index(fields=["tenant", "enrollment"]),
        ]

    def clean(self):
        super().clean()

        if self.schedule_item_id and self.tenant_id and self.schedule_item.tenant_id != self.tenant_id:
            raise ValidationError({"schedule_item": "Schedule item and student status must belong to the same tenant."})

        if self.enrollment_id and self.tenant_id and self.enrollment.tenant_id != self.tenant_id:
            raise ValidationError({"enrollment": "Enrollment and student status must belong to the same tenant."})

        if self.schedule_item_id and self.enrollment_id:
            if self.enrollment.classroom_id != self.schedule_item.classroom_id:
                raise ValidationError({"enrollment": "Enrollment classroom must match schedule classroom."})
            enrollment_course_id = getattr(getattr(self.enrollment, "classroom", None), "course_id", None)
            if enrollment_course_id != self.schedule_item.course_id:
                raise ValidationError({"enrollment": "Enrollment course must match schedule course."})

        attendance_status = ""
        if self.enrollment_id and self.schedule_item_id and self.tenant_id:
            attendance_status = (
                AttendanceRecord.all_objects.filter(
                    tenant_id=self.tenant_id,
                    enrollment_id=self.enrollment_id,
                    attendance_date=self.schedule_item.scheduled_date,
                )
                .values_list("status", flat=True)
                .first()
                or ""
            )
        self.attendance_status_snapshot = attendance_status

        if self.completion_marked:
            self.status = self.Status.SUCCESS
            if self.completed_at is None:
                self.completed_at = timezone.now()
        else:
            self.completed_at = None
            if self.schedule_item.requires_attendance and attendance_status == AttendanceRecord.Status.ABSENT:
                self.status = self.Status.OVERDUE
            elif self.schedule_item.status == DisciplineScheduleItem.Status.COMPLETED:
                self.status = self.Status.SUCCESS
            elif self.schedule_item.status == DisciplineScheduleItem.Status.OVERDUE:
                self.status = self.Status.OVERDUE
            else:
                self.status = self.Status.PENDING

    def __str__(self) -> str:
        return f"{self.schedule_item} / {self.enrollment} ({self.status})"
