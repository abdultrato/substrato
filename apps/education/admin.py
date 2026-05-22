from django.contrib import admin

from apps.education.models import (
    Assignment,
    AssignmentSubmission,
    AttendanceRecord,
    Classroom,
    Course,
    Enrollment,
    Examination,
    ExaminationAttempt,
    GradeRecord,
    LearningContent,
    Skill,
    StudentProfile,
    TeacherProfile,
)


@admin.register(StudentProfile)
class StudentProfileAdmin(admin.ModelAdmin):
    list_display = ("custom_id", "student_code", "user", "status", "tenant")
    list_filter = ("status", "tenant")
    search_fields = ("student_code", "user__username", "user__name", "custom_id")


@admin.register(TeacherProfile)
class TeacherProfileAdmin(admin.ModelAdmin):
    list_display = ("custom_id", "teacher_code", "user", "status", "tenant")
    list_filter = ("status", "tenant")
    search_fields = ("teacher_code", "user__username", "user__name", "custom_id")


@admin.register(Course)
class CourseAdmin(admin.ModelAdmin):
    list_display = ("custom_id", "code", "name", "status", "tenant")
    list_filter = ("status", "tenant")
    search_fields = ("code", "name", "custom_id")


@admin.register(Classroom)
class ClassroomAdmin(admin.ModelAdmin):
    list_display = ("custom_id", "name", "course", "academic_year", "tenant")
    list_filter = ("academic_year", "tenant")
    search_fields = ("name", "course__name", "custom_id")


@admin.register(Enrollment)
class EnrollmentAdmin(admin.ModelAdmin):
    list_display = ("custom_id", "student", "classroom", "status", "enrolled_on", "tenant")
    list_filter = ("status", "tenant")
    search_fields = ("custom_id", "student__student_code", "classroom__name")


@admin.register(AttendanceRecord)
class AttendanceRecordAdmin(admin.ModelAdmin):
    list_display = ("custom_id", "enrollment", "attendance_date", "status", "tenant")
    list_filter = ("status", "tenant")
    search_fields = ("custom_id", "enrollment__student__student_code")


@admin.register(GradeRecord)
class GradeRecordAdmin(admin.ModelAdmin):
    list_display = ("custom_id", "enrollment", "component", "score", "max_score", "tenant")
    list_filter = ("tenant",)
    search_fields = ("custom_id", "component", "enrollment__student__student_code")


@admin.register(Examination)
class ExaminationAdmin(admin.ModelAdmin):
    list_display = ("custom_id", "title", "course", "scheduled_for", "tenant")
    list_filter = ("tenant",)
    search_fields = ("custom_id", "title", "course__name")


@admin.register(Assignment)
class AssignmentAdmin(admin.ModelAdmin):
    list_display = ("custom_id", "title", "course", "classroom", "due_at", "status", "tenant")
    list_filter = ("status", "tenant")
    search_fields = ("custom_id", "title", "course__name", "classroom__name")


@admin.register(AssignmentSubmission)
class AssignmentSubmissionAdmin(admin.ModelAdmin):
    list_display = ("custom_id", "assignment", "student", "attempt_number", "status", "submitted_at", "tenant")
    list_filter = ("status", "tenant")
    search_fields = ("custom_id", "assignment__title", "student__student_code")


@admin.register(ExaminationAttempt)
class ExaminationAttemptAdmin(admin.ModelAdmin):
    list_display = ("custom_id", "examination", "student", "status", "started_at", "submitted_at", "tenant")
    list_filter = ("status", "tenant")
    search_fields = ("custom_id", "examination__title", "student__student_code")


@admin.register(LearningContent)
class LearningContentAdmin(admin.ModelAdmin):
    list_display = ("custom_id", "title", "course", "content_type", "published", "tenant")
    list_filter = ("content_type", "published", "tenant")
    search_fields = ("custom_id", "title", "course__name")


@admin.register(Skill)
class SkillAdmin(admin.ModelAdmin):
    list_display = ("custom_id", "code", "name", "course", "category", "level", "status", "tenant")
    list_filter = ("category", "level", "status", "tenant")
    search_fields = ("custom_id", "code", "name", "course__name")
