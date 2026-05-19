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
