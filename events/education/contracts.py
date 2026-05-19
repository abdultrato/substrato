from dataclasses import dataclass


@dataclass(frozen=True)
class StudentCreated:
    student_id: int
    tenant_id: int
    user_id: int


@dataclass(frozen=True)
class EnrollmentCompleted:
    enrollment_id: int
    tenant_id: int
    student_id: int
    classroom_id: int


@dataclass(frozen=True)
class GradePublished:
    grade_id: int
    tenant_id: int
    enrollment_id: int
    component: str


@dataclass(frozen=True)
class ExamScheduled:
    exam_id: int
    tenant_id: int
    course_id: int


@dataclass(frozen=True)
class LessonUploaded:
    content_id: int
    tenant_id: int
    course_id: int
    content_type: str
