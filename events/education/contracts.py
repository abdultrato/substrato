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
class AttendanceRecorded:
    attendance_id: int
    tenant_id: int
    enrollment_id: int
    attendance_date: str
    status: str


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
class AssignmentPublished:
    assignment_id: int
    tenant_id: int
    course_id: int


@dataclass(frozen=True)
class AssignmentSubmitted:
    submission_id: int
    tenant_id: int
    assignment_id: int
    student_id: int
    status: str


@dataclass(frozen=True)
class ExamAttemptOpened:
    attempt_id: int
    tenant_id: int
    exam_id: int
    student_id: int
    expires_at: str


@dataclass(frozen=True)
class ExamAttemptSubmitted:
    attempt_id: int
    tenant_id: int
    exam_id: int
    student_id: int
    submitted_at: str


@dataclass(frozen=True)
class ExamAttemptExpired:
    attempt_id: int
    tenant_id: int
    exam_id: int
    student_id: int
    expired_at: str


@dataclass(frozen=True)
class LessonUploaded:
    content_id: int
    tenant_id: int
    course_id: int
    content_type: str
