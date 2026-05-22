import json
from datetime import timedelta

from django.contrib.auth import get_user_model
from django.contrib.auth.models import Group
from django.utils import timezone
import pytest

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
    StudentProfile,
)
from apps.tenants.models.tenant import Tenant
from events.bus import event_bus
from security.permissions.rbac import GROUPS


def _response_data(response):
    if hasattr(response, "data"):
        return response.data
    return json.loads(response.content)


def _tenant(identifier: str, domain: str) -> Tenant:
    return Tenant.objects.create(
        identifier=identifier,
        name=f"Tenant {identifier}",
        domain=domain,
        active=True,
    )


def _user(*, tenant: Tenant, username: str, group_name: str):
    user_model = get_user_model()
    user = user_model.objects.create_user(
        username=username,
        email=f"{username}@example.com",
        password="testpass123",
        name=username.replace("_", " ").title(),
        tenant=tenant,
    )
    group, _ = Group.objects.get_or_create(name=group_name)
    user.groups.add(group)
    return user


def _authenticate(api_client, *, tenant: Tenant, user) -> None:
    api_client.defaults["HTTP_HOST"] = tenant.domain
    api_client.force_authenticate(user=user)


def _capture_published_events(monkeypatch):
    captured = []
    monkeypatch.setattr(event_bus, "publish_after_commit", lambda event: captured.append(event))
    return captured


def _base_school_scope(*, tenant: Tenant):
    student_user = _user(tenant=tenant, username="student_events", group_name=GROUPS["ESTUDANTE"])
    student = StudentProfile.objects.create(
        tenant=tenant,
        user=student_user,
        student_code="STU-EVT-001",
    )
    course = Course.objects.create(
        tenant=tenant,
        name="Matematica Aplicada",
        code="CRS-EVT-001",
        status=Course.Status.ACTIVE,
    )
    classroom = Classroom.objects.create(
        tenant=tenant,
        name="10A",
        course=course,
        academic_year="2026",
        capacity=35,
    )
    enrollment = Enrollment.objects.create(
        tenant=tenant,
        student=student,
        classroom=classroom,
        status=Enrollment.Status.PENDING,
    )
    return {
        "student_user": student_user,
        "student": student,
        "course": course,
        "classroom": classroom,
        "enrollment": enrollment,
    }


@pytest.mark.django_db
def test_student_create_emits_student_created_event(api_client, monkeypatch):
    tenant = _tenant("tn-edu-evt-student", "edu-evt-student.local")
    director = _user(tenant=tenant, username="director_evt_student", group_name=GROUPS["DIRETOR_ESCOLA"])
    student_user = _user(tenant=tenant, username="student_evt_target", group_name=GROUPS["ESTUDANTE"])
    _authenticate(api_client, tenant=tenant, user=director)

    captured = _capture_published_events(monkeypatch)
    response = api_client.post(
        "/api/v1/education/student/",
        {
            "user": student_user.id,
            "student_code": "STU-EVT-NEW-001",
            "status": StudentProfile.Status.ACTIVE,
        },
        format="json",
    )

    assert response.status_code == 201, _response_data(response)
    created_id = _response_data(response)["id"]
    student_events = [event for event in captured if event.nome == "StudentCreated"]
    assert len(student_events) == 1
    assert student_events[0].payload["tenant_id"] == tenant.id
    assert student_events[0].payload["student_id"] == created_id
    assert student_events[0].payload["user_id"] == student_user.id


@pytest.mark.django_db
def test_enrollment_create_active_emits_enrollment_completed_event(api_client, monkeypatch):
    tenant = _tenant("tn-edu-evt-enrollment", "edu-evt-enrollment.local")
    director = _user(tenant=tenant, username="director_evt_enrollment", group_name=GROUPS["DIRETOR_ESCOLA"])
    scope = _base_school_scope(tenant=tenant)
    extra_student_user = _user(tenant=tenant, username="student_events_extra", group_name=GROUPS["ESTUDANTE"])
    extra_student = StudentProfile.objects.create(
        tenant=tenant,
        user=extra_student_user,
        student_code="STU-EVT-002",
    )
    _authenticate(api_client, tenant=tenant, user=director)

    captured = _capture_published_events(monkeypatch)
    response = api_client.post(
        "/api/v1/education/enrollment/",
        {
            "student": extra_student.id,
            "classroom": scope["classroom"].id,
            "status": Enrollment.Status.ACTIVE,
            "enrolled_on": "2026-02-01",
        },
        format="json",
    )

    assert response.status_code == 201, _response_data(response)
    enrollment_id = _response_data(response)["id"]
    enrollment_events = [event for event in captured if event.nome == "EnrollmentCompleted"]
    assert len(enrollment_events) == 1
    assert enrollment_events[0].payload["tenant_id"] == tenant.id
    assert enrollment_events[0].payload["enrollment_id"] == enrollment_id
    assert enrollment_events[0].payload["student_id"] == extra_student.id
    assert enrollment_events[0].payload["classroom_id"] == scope["classroom"].id


@pytest.mark.django_db
def test_attendance_create_emits_attendance_recorded_event(api_client, monkeypatch):
    tenant = _tenant("tn-edu-evt-attendance", "edu-evt-attendance.local")
    director = _user(tenant=tenant, username="director_evt_attendance", group_name=GROUPS["DIRETOR_ESCOLA"])
    scope = _base_school_scope(tenant=tenant)
    _authenticate(api_client, tenant=tenant, user=director)

    captured = _capture_published_events(monkeypatch)
    response = api_client.post(
        "/api/v1/education/attendance/",
        {
            "enrollment": scope["enrollment"].id,
            "attendance_date": "2026-06-11",
            "status": AttendanceRecord.Status.PRESENT,
            "notes": "Presença confirmada",
        },
        format="json",
    )

    assert response.status_code == 201, _response_data(response)
    attendance_id = _response_data(response)["id"]
    attendance_events = [event for event in captured if event.nome == "AttendanceRecorded"]
    assert len(attendance_events) == 1
    assert attendance_events[0].payload["tenant_id"] == tenant.id
    assert attendance_events[0].payload["attendance_id"] == attendance_id
    assert attendance_events[0].payload["enrollment_id"] == scope["enrollment"].id
    assert attendance_events[0].payload["attendance_date"] == "2026-06-11"
    assert attendance_events[0].payload["status"] == AttendanceRecord.Status.PRESENT


@pytest.mark.django_db
def test_grade_publish_transition_emits_grade_published_event(api_client, monkeypatch):
    tenant = _tenant("tn-edu-evt-grade", "edu-evt-grade.local")
    director = _user(tenant=tenant, username="director_evt_grade", group_name=GROUPS["DIRETOR_ESCOLA"])
    scope = _base_school_scope(tenant=tenant)
    grade = GradeRecord.objects.create(
        tenant=tenant,
        enrollment=scope["enrollment"],
        component="Teste 1",
        score=16,
        max_score=20,
    )
    _authenticate(api_client, tenant=tenant, user=director)

    captured = _capture_published_events(monkeypatch)
    response = api_client.patch(
        f"/api/v1/education/grade/{grade.id}/",
        {"published_at": "2026-06-10T08:00:00+02:00"},
        format="json",
    )

    assert response.status_code == 200, _response_data(response)
    grade_events = [event for event in captured if event.nome == "GradePublished"]
    assert len(grade_events) == 1
    assert grade_events[0].payload["tenant_id"] == tenant.id
    assert grade_events[0].payload["grade_id"] == grade.id
    assert grade_events[0].payload["enrollment_id"] == scope["enrollment"].id
    assert grade_events[0].payload["component"] == "Teste 1"


@pytest.mark.django_db
def test_examination_create_emits_exam_scheduled_event(api_client, monkeypatch):
    tenant = _tenant("tn-edu-evt-exam", "edu-evt-exam.local")
    director = _user(tenant=tenant, username="director_evt_exam", group_name=GROUPS["DIRETOR_ESCOLA"])
    scope = _base_school_scope(tenant=tenant)
    _authenticate(api_client, tenant=tenant, user=director)

    captured = _capture_published_events(monkeypatch)
    response = api_client.post(
        "/api/v1/education/examination/",
        {
            "title": "Exame Trimestral",
            "course": scope["course"].id,
            "classroom": scope["classroom"].id,
            "scheduled_for": "2026-06-12T09:00:00+02:00",
            "max_score": "20.00",
        },
        format="json",
    )

    assert response.status_code == 201, _response_data(response)
    exam_id = _response_data(response)["id"]
    exam_events = [event for event in captured if event.nome == "ExamScheduled"]
    assert len(exam_events) == 1
    assert exam_events[0].payload["tenant_id"] == tenant.id
    assert exam_events[0].payload["exam_id"] == exam_id
    assert exam_events[0].payload["course_id"] == scope["course"].id
    assert Examination.objects.filter(id=exam_id, tenant=tenant).exists()


@pytest.mark.django_db
def test_random_test_create_emits_random_test_scheduled_event(api_client, monkeypatch):
    tenant = _tenant("tn-edu-evt-random-test", "edu-evt-random-test.local")
    director = _user(tenant=tenant, username="director_evt_random_test", group_name=GROUPS["DIRETOR_ESCOLA"])
    scope = _base_school_scope(tenant=tenant)
    _authenticate(api_client, tenant=tenant, user=director)

    captured = _capture_published_events(monkeypatch)
    response = api_client.post(
        "/api/v1/education/random_test/",
        {
            "course": scope["course"].id,
            "classroom": scope["classroom"].id,
            "enrollment": scope["enrollment"].id,
            "student": scope["student"].id,
            "title": "Teste relâmpago",
            "scheduled_for": "2026-06-12T09:30:00+02:00",
            "duration_minutes": 35,
            "question_count": 10,
        },
        format="json",
    )

    assert response.status_code == 201, _response_data(response)
    random_test_id = _response_data(response)["id"]
    random_test_events = [event for event in captured if event.nome == "RandomTestScheduled"]
    assert len(random_test_events) == 1
    assert random_test_events[0].payload["tenant_id"] == tenant.id
    assert random_test_events[0].payload["random_test_id"] == random_test_id
    assert random_test_events[0].payload["classroom_id"] == scope["classroom"].id
    assert random_test_events[0].payload["student_id"] == scope["student"].id
    assert random_test_events[0].payload["course_id"] == scope["course"].id
    assert RandomTest.objects.filter(id=random_test_id, tenant=tenant).exists()


@pytest.mark.django_db
def test_learning_content_publish_transition_emits_lesson_uploaded_event(api_client, monkeypatch):
    tenant = _tenant("tn-edu-evt-content", "edu-evt-content.local")
    director = _user(tenant=tenant, username="director_evt_content", group_name=GROUPS["DIRETOR_ESCOLA"])
    scope = _base_school_scope(tenant=tenant)
    content = LearningContent.objects.create(
        tenant=tenant,
        course=scope["course"],
        title="Introducao",
        content_type=LearningContent.ContentType.LESSON,
        body="Material inicial",
        published=False,
    )
    _authenticate(api_client, tenant=tenant, user=director)

    captured = _capture_published_events(monkeypatch)
    response = api_client.patch(
        f"/api/v1/education/content/{content.id}/",
        {"published": True},
        format="json",
    )

    assert response.status_code == 200, _response_data(response)
    content_events = [event for event in captured if event.nome == "LessonUploaded"]
    assert len(content_events) == 1
    assert content_events[0].payload["tenant_id"] == tenant.id
    assert content_events[0].payload["content_id"] == content.id
    assert content_events[0].payload["course_id"] == scope["course"].id
    assert content_events[0].payload["content_type"] == LearningContent.ContentType.LESSON


@pytest.mark.django_db
def test_assignment_publish_transition_emits_assignment_published_event(api_client, monkeypatch):
    tenant = _tenant("tn-edu-evt-assignment", "edu-evt-assignment.local")
    director = _user(tenant=tenant, username="director_evt_assignment", group_name=GROUPS["DIRETOR_ESCOLA"])
    scope = _base_school_scope(tenant=tenant)
    assignment = Assignment.objects.create(
        tenant=tenant,
        course=scope["course"],
        classroom=scope["classroom"],
        title="Projeto Integrador",
        instructions="Entregar ficheiro final.",
        opens_at=timezone.now() - timedelta(hours=2),
        due_at=timezone.now() + timedelta(days=1),
        status=Assignment.Status.DRAFT,
        max_score=20,
    )
    _authenticate(api_client, tenant=tenant, user=director)

    captured = _capture_published_events(monkeypatch)
    response = api_client.patch(
        f"/api/v1/education/assignment/{assignment.id}/",
        {"status": Assignment.Status.PUBLISHED},
        format="json",
    )

    assert response.status_code == 200, _response_data(response)
    assignment_events = [event for event in captured if event.nome == "AssignmentPublished"]
    assert len(assignment_events) == 1
    assert assignment_events[0].payload["tenant_id"] == tenant.id
    assert assignment_events[0].payload["assignment_id"] == assignment.id
    assert assignment_events[0].payload["course_id"] == scope["course"].id


@pytest.mark.django_db
def test_assignment_submission_create_emits_assignment_submitted_event(api_client, monkeypatch):
    tenant = _tenant("tn-edu-evt-submission", "edu-evt-submission.local")
    director = _user(tenant=tenant, username="director_evt_submission", group_name=GROUPS["DIRETOR_ESCOLA"])
    scope = _base_school_scope(tenant=tenant)
    assignment = Assignment.objects.create(
        tenant=tenant,
        course=scope["course"],
        classroom=scope["classroom"],
        title="Ficha 2",
        instructions="Resolver exercícios.",
        opens_at=timezone.now() - timedelta(hours=1),
        due_at=timezone.now() + timedelta(days=1),
        status=Assignment.Status.PUBLISHED,
        max_score=20,
        published_at=timezone.now() - timedelta(hours=1),
    )
    _authenticate(api_client, tenant=tenant, user=director)

    captured = _capture_published_events(monkeypatch)
    response = api_client.post(
        "/api/v1/education/submission/",
        {
            "assignment": assignment.id,
            "enrollment": scope["enrollment"].id,
            "student": scope["student"].id,
            "content_text": "Entrega inicial",
        },
        format="json",
    )

    assert response.status_code == 201, _response_data(response)
    submission_id = _response_data(response)["id"]
    submission_events = [event for event in captured if event.nome == "AssignmentSubmitted"]
    assert len(submission_events) == 1
    assert submission_events[0].payload["tenant_id"] == tenant.id
    assert submission_events[0].payload["submission_id"] == submission_id
    assert submission_events[0].payload["assignment_id"] == assignment.id
    assert submission_events[0].payload["student_id"] == scope["student"].id


@pytest.mark.django_db
def test_exam_attempt_open_and_submit_emit_domain_events(api_client, monkeypatch):
    tenant = _tenant("tn-edu-evt-exam-attempt", "edu-evt-exam-attempt.local")
    director = _user(tenant=tenant, username="director_evt_attempt", group_name=GROUPS["DIRETOR_ESCOLA"])
    scope = _base_school_scope(tenant=tenant)
    exam = Examination.objects.create(
        tenant=tenant,
        course=scope["course"],
        classroom=scope["classroom"],
        title="Prova online",
        scheduled_for=timezone.now() - timedelta(minutes=15),
        opens_at=timezone.now() - timedelta(minutes=15),
        closes_at=timezone.now() + timedelta(hours=1),
        duration_minutes=60,
        max_attempts=1,
        status=Examination.Status.PUBLISHED,
        published_at=timezone.now() - timedelta(hours=1),
        max_score=20,
    )
    _authenticate(api_client, tenant=tenant, user=director)

    captured = _capture_published_events(monkeypatch)
    response_create = api_client.post(
        "/api/v1/education/exam_attempt/",
        {
            "examination": exam.id,
            "enrollment": scope["enrollment"].id,
            "student": scope["student"].id,
            "submission_payload": "Resolução parcial",
        },
        format="json",
    )

    assert response_create.status_code == 201, _response_data(response_create)
    attempt_id = _response_data(response_create)["id"]
    opened_events = [event for event in captured if event.nome == "ExamAttemptOpened"]
    assert len(opened_events) == 1
    assert opened_events[0].payload["tenant_id"] == tenant.id
    assert opened_events[0].payload["attempt_id"] == attempt_id
    assert opened_events[0].payload["exam_id"] == exam.id
    assert opened_events[0].payload["student_id"] == scope["student"].id

    response_submit = api_client.patch(
        f"/api/v1/education/exam_attempt/{attempt_id}/",
        {"status": ExaminationAttempt.Status.SUBMITTED, "submitted_at": timezone.now().isoformat()},
        format="json",
    )

    assert response_submit.status_code == 200, _response_data(response_submit)
    submitted_events = [event for event in captured if event.nome == "ExamAttemptSubmitted"]
    assert len(submitted_events) == 1
    assert submitted_events[0].payload["tenant_id"] == tenant.id
    assert submitted_events[0].payload["attempt_id"] == attempt_id
    assert submitted_events[0].payload["exam_id"] == exam.id
    assert submitted_events[0].payload["student_id"] == scope["student"].id


@pytest.mark.django_db
def test_exam_attempt_expire_emits_domain_event(api_client, monkeypatch):
    tenant = _tenant("tn-edu-evt-expire-attempt", "edu-evt-expire-attempt.local")
    director = _user(tenant=tenant, username="director_evt_expire_attempt", group_name=GROUPS["DIRETOR_ESCOLA"])
    scope = _base_school_scope(tenant=tenant)
    exam = Examination.objects.create(
        tenant=tenant,
        course=scope["course"],
        classroom=scope["classroom"],
        title="Prova curta",
        scheduled_for=timezone.now() - timedelta(minutes=10),
        opens_at=timezone.now() - timedelta(minutes=10),
        closes_at=timezone.now() + timedelta(minutes=30),
        duration_minutes=20,
        max_attempts=1,
        status=Examination.Status.PUBLISHED,
        published_at=timezone.now() - timedelta(hours=1),
        max_score=20,
    )
    _authenticate(api_client, tenant=tenant, user=director)

    captured = _capture_published_events(monkeypatch)
    response_create = api_client.post(
        "/api/v1/education/exam_attempt/",
        {
            "examination": exam.id,
            "enrollment": scope["enrollment"].id,
            "student": scope["student"].id,
            "submission_payload": "Tentativa em aberto",
        },
        format="json",
    )

    assert response_create.status_code == 201, _response_data(response_create)
    attempt_id = _response_data(response_create)["id"]

    response_expire = api_client.patch(
        f"/api/v1/education/exam_attempt/{attempt_id}/",
        {"status": ExaminationAttempt.Status.EXPIRED},
        format="json",
    )
    assert response_expire.status_code == 200, _response_data(response_expire)

    expired_events = [event for event in captured if event.nome == "ExamAttemptExpired"]
    assert len(expired_events) == 1
    assert expired_events[0].payload["tenant_id"] == tenant.id
    assert expired_events[0].payload["attempt_id"] == attempt_id
    assert expired_events[0].payload["exam_id"] == exam.id
    assert expired_events[0].payload["student_id"] == scope["student"].id
