from api.core.filters import SafeFilterSet
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
    RandomTest,
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
        fields = [
            "enrollment",
            "teacher",
            "assignment_submission",
            "examination_attempt",
            "component",
            "published_at",
            "created_at",
        ]


class ExaminationFilter(SafeFilterSet):
    class Meta:
        model = Examination
        fields = [
            "course",
            "classroom",
            "exam_type",
            "discipline_final_stage",
            "test_slot",
            "scheduled_for",
            "created_at",
        ]


class AssignmentFilter(SafeFilterSet):
    class Meta:
        model = Assignment
        fields = ["course", "classroom", "teacher", "status", "work_category", "due_at", "created_at"]


class AssignmentSubmissionFilter(SafeFilterSet):
    class Meta:
        model = AssignmentSubmission
        fields = ["assignment", "enrollment", "student", "status", "submitted_at", "created_at"]


class ExaminationAttemptFilter(SafeFilterSet):
    class Meta:
        model = ExaminationAttempt
        fields = [
            "examination",
            "enrollment",
            "student",
            "status",
            "attempt_number",
            "requires_year_repeat",
            "started_at",
            "created_at",
        ]


class LearningContentFilter(SafeFilterSet):
    class Meta:
        model = LearningContent
        fields = ["course", "author", "content_type", "published", "created_at"]


class SkillFilter(SafeFilterSet):
    class Meta:
        model = Skill
        fields = ["course", "code", "category", "level", "status", "created_at"]


class RandomTestFilter(SafeFilterSet):
    class Meta:
        model = RandomTest
        fields = [
            "course",
            "classroom",
            "enrollment",
            "student",
            "teacher",
            "status",
            "scheduled_for",
            "opens_at",
            "created_at",
        ]


FILTER_MAP = {
    "student": StudentProfileFilter,
    "teacher": TeacherProfileFilter,
    "course": CourseFilter,
    "classroom": ClassroomFilter,
    "enrollment": EnrollmentFilter,
    "attendance": AttendanceRecordFilter,
    "grade": GradeRecordFilter,
    "assessment": GradeRecordFilter,
    "examination": ExaminationFilter,
    "assignment": AssignmentFilter,
    "submission": AssignmentSubmissionFilter,
    "exam_attempt": ExaminationAttemptFilter,
    "examination_attempt": ExaminationAttemptFilter,
    "content": LearningContentFilter,
    "lesson": LearningContentFilter,
    "bibliography": LearningContentFilter,
    "thematic_map": LearningContentFilter,
    "skill": SkillFilter,
    "random_test": RandomTestFilter,
    "randomtest": RandomTestFilter,
}
