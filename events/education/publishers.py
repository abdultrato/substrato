from events.base_event import BaseEvent
from events.bus import event_bus


def publish_student_created(*, tenant_id: int, student_id: int, user_id: int) -> None:
    event_bus.publish_after_commit(
        BaseEvent(
            nome="StudentCreated",
            payload={
                "tenant_id": tenant_id,
                "student_id": student_id,
                "user_id": user_id,
            },
        )
    )


def publish_enrollment_completed(*, tenant_id: int, enrollment_id: int, student_id: int, classroom_id: int) -> None:
    event_bus.publish_after_commit(
        BaseEvent(
            nome="EnrollmentCompleted",
            payload={
                "tenant_id": tenant_id,
                "enrollment_id": enrollment_id,
                "student_id": student_id,
                "classroom_id": classroom_id,
            },
        )
    )


def publish_attendance_recorded(
    *,
    tenant_id: int,
    attendance_id: int,
    enrollment_id: int,
    attendance_date: str,
    status: str,
) -> None:
    event_bus.publish_after_commit(
        BaseEvent(
            nome="AttendanceRecorded",
            payload={
                "tenant_id": tenant_id,
                "attendance_id": attendance_id,
                "enrollment_id": enrollment_id,
                "attendance_date": attendance_date,
                "status": status,
            },
        )
    )


def publish_grade_published(*, tenant_id: int, grade_id: int, enrollment_id: int, component: str) -> None:
    event_bus.publish_after_commit(
        BaseEvent(
            nome="GradePublished",
            payload={
                "tenant_id": tenant_id,
                "grade_id": grade_id,
                "enrollment_id": enrollment_id,
                "component": component,
            },
        )
    )


def publish_exam_scheduled(*, tenant_id: int, exam_id: int, course_id: int) -> None:
    event_bus.publish_after_commit(
        BaseEvent(
            nome="ExamScheduled",
            payload={
                "tenant_id": tenant_id,
                "exam_id": exam_id,
                "course_id": course_id,
            },
        )
    )


def publish_random_test_scheduled(
    *,
    tenant_id: int,
    random_test_id: int,
    classroom_id: int,
    student_id: int,
    course_id: int,
    opens_at: str,
) -> None:
    event_bus.publish_after_commit(
        BaseEvent(
            nome="RandomTestScheduled",
            payload={
                "tenant_id": tenant_id,
                "random_test_id": random_test_id,
                "classroom_id": classroom_id,
                "student_id": student_id,
                "course_id": course_id,
                "opens_at": opens_at,
            },
        )
    )


def publish_assignment_published(*, tenant_id: int, assignment_id: int, course_id: int) -> None:
    event_bus.publish_after_commit(
        BaseEvent(
            nome="AssignmentPublished",
            payload={
                "tenant_id": tenant_id,
                "assignment_id": assignment_id,
                "course_id": course_id,
            },
        )
    )


def publish_assignment_submitted(
    *,
    tenant_id: int,
    submission_id: int,
    assignment_id: int,
    student_id: int,
    status: str,
) -> None:
    event_bus.publish_after_commit(
        BaseEvent(
            nome="AssignmentSubmitted",
            payload={
                "tenant_id": tenant_id,
                "submission_id": submission_id,
                "assignment_id": assignment_id,
                "student_id": student_id,
                "status": status,
            },
        )
    )


def publish_exam_attempt_opened(
    *,
    tenant_id: int,
    attempt_id: int,
    exam_id: int,
    student_id: int,
    expires_at: str,
) -> None:
    event_bus.publish_after_commit(
        BaseEvent(
            nome="ExamAttemptOpened",
            payload={
                "tenant_id": tenant_id,
                "attempt_id": attempt_id,
                "exam_id": exam_id,
                "student_id": student_id,
                "expires_at": expires_at,
            },
        )
    )


def publish_exam_attempt_submitted(
    *,
    tenant_id: int,
    attempt_id: int,
    exam_id: int,
    student_id: int,
    submitted_at: str,
) -> None:
    event_bus.publish_after_commit(
        BaseEvent(
            nome="ExamAttemptSubmitted",
            payload={
                "tenant_id": tenant_id,
                "attempt_id": attempt_id,
                "exam_id": exam_id,
                "student_id": student_id,
                "submitted_at": submitted_at,
            },
        )
    )


def publish_exam_attempt_expired(
    *,
    tenant_id: int,
    attempt_id: int,
    exam_id: int,
    student_id: int,
    expired_at: str,
) -> None:
    event_bus.publish_after_commit(
        BaseEvent(
            nome="ExamAttemptExpired",
            payload={
                "tenant_id": tenant_id,
                "attempt_id": attempt_id,
                "exam_id": exam_id,
                "student_id": student_id,
                "expired_at": expired_at,
            },
        )
    )


def publish_lesson_uploaded(*, tenant_id: int, content_id: int, course_id: int, content_type: str) -> None:
    event_bus.publish_after_commit(
        BaseEvent(
            nome="LessonUploaded",
            payload={
                "tenant_id": tenant_id,
                "content_id": content_id,
                "course_id": course_id,
                "content_type": content_type,
            },
        )
    )


def publish_discipline_schedule_item_defined(
    *,
    tenant_id: int,
    schedule_item_id: int,
    course_id: int,
    classroom_id: int,
    item_type: str,
    scheduled_date: str,
    status: str,
) -> None:
    event_bus.publish_after_commit(
        BaseEvent(
            nome="DisciplineScheduleItemDefined",
            payload={
                "tenant_id": tenant_id,
                "schedule_item_id": schedule_item_id,
                "course_id": course_id,
                "classroom_id": classroom_id,
                "item_type": item_type,
                "scheduled_date": scheduled_date,
                "status": status,
            },
        )
    )


def publish_discipline_schedule_student_status_updated(
    *,
    tenant_id: int,
    progress_id: int,
    schedule_item_id: int,
    enrollment_id: int,
    status: str,
) -> None:
    event_bus.publish_after_commit(
        BaseEvent(
            nome="DisciplineScheduleStudentStatusUpdated",
            payload={
                "tenant_id": tenant_id,
                "progress_id": progress_id,
                "schedule_item_id": schedule_item_id,
                "enrollment_id": enrollment_id,
                "status": status,
            },
        )
    )
