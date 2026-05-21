from api.core.filters import SafeFilterSet
from apps.education.models import (
    AttendanceRecord,
    Classroom,
    Course,
    Enrollment,
    Examination,
    GradeRecord,
    LearningContent,
    Skill,
    StudentProfile,
    TeacherProfile,
)


class StudentProfileFilter(SafeFilterSet):
    class Meta:
        model = StudentProfile
        fields = ["user", "student_code", "status", "created_at"]


class TeacherProfileFilter(SafeFilterSet):
    class Meta:
        model = TeacherProfile
        fields = ["user", "teacher_code", "status", "created_at"]


class CourseFilter(SafeFilterSet):
    class Meta:
        model = Course
        fields = ["code", "status", "created_at"]


class ClassroomFilter(SafeFilterSet):
    class Meta:
        model = Classroom
        fields = ["course", "academic_year", "created_at"]


class EnrollmentFilter(SafeFilterSet):
    class Meta:
        model = Enrollment
        fields = ["student", "classroom", "status", "enrolled_on", "created_at"]


class AttendanceRecordFilter(SafeFilterSet):
    class Meta:
        model = AttendanceRecord
        fields = ["enrollment", "attendance_date", "status", "created_at"]


class GradeRecordFilter(SafeFilterSet):
    class Meta:
        model = GradeRecord
        fields = ["enrollment", "teacher", "component", "published_at", "created_at"]


class ExaminationFilter(SafeFilterSet):
    class Meta:
        model = Examination
        fields = ["course", "classroom", "scheduled_for", "created_at"]


class LearningContentFilter(SafeFilterSet):
    class Meta:
        model = LearningContent
        fields = ["course", "author", "content_type", "published", "created_at"]


class SkillFilter(SafeFilterSet):
    class Meta:
        model = Skill
        fields = ["course", "code", "category", "level", "status", "created_at"]


FILTER_MAP = {
    "student": StudentProfileFilter,
    "teacher": TeacherProfileFilter,
    "course": CourseFilter,
    "classroom": ClassroomFilter,
    "enrollment": EnrollmentFilter,
    "attendance": AttendanceRecordFilter,
    "grade": GradeRecordFilter,
    "examination": ExaminationFilter,
    "content": LearningContentFilter,
    "skill": SkillFilter,
}
