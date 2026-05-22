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
    DisciplineScheduleItem,
    DisciplineScheduleStudentStatus,
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
from apps.tenants.models.tenant import Tenant


def _response_data(response):
    if hasattr(response, "data"):
        return response.data
    return json.loads(response.content)


def _items(response):
    payload = _response_data(response)
    if isinstance(payload, list):
        return payload
    if isinstance(payload, dict) and isinstance(payload.get("results"), list):
        return payload["results"]
    return []


def _tenant(identifier: str, domain: str):
    return Tenant.objects.create(
        identifier=identifier,
        name=f"Tenant {identifier}",
        domain=domain,
        active=True,
    )


def _user(*, tenant: Tenant, username: str, role_group: str):
    user_model = get_user_model()
    user = user_model.objects.create_user(
        username=username,
        email=f"{username}@example.com",
        password="testpass123",
        name=username.replace("_", " ").title(),
        tenant=tenant,
    )
    group, _ = Group.objects.get_or_create(name=role_group)
    user.groups.add(group)
    return user


def _authenticate(api_client, *, tenant: Tenant, user):
    api_client.defaults["HTTP_HOST"] = tenant.domain
    api_client.force_authenticate(user=user)


def _seed_scope(tenant: Tenant):
    now = timezone.now()
    teacher_user_1 = _user(tenant=tenant, username="teacher_one", role_group="Professor")
    teacher_user_2 = _user(tenant=tenant, username="teacher_two", role_group="Professor")
    student_user_1 = _user(tenant=tenant, username="student_one", role_group="Estudante")
    student_user_2 = _user(tenant=tenant, username="student_two", role_group="Estudante")

    teacher_1 = TeacherProfile.objects.create(
        tenant=tenant,
        user=teacher_user_1,
        teacher_code="TCH-001",
        specialty="Math",
    )
    teacher_2 = TeacherProfile.objects.create(
        tenant=tenant,
        user=teacher_user_2,
        teacher_code="TCH-002",
        specialty="Science",
    )

    student_1 = StudentProfile.objects.create(
        tenant=tenant,
        user=student_user_1,
        student_code="STU-001",
    )
    student_2 = StudentProfile.objects.create(
        tenant=tenant,
        user=student_user_2,
        student_code="STU-002",
    )

    course_1 = Course.objects.create(
        tenant=tenant,
        name="Mathematics",
        code="CRS-MATH",
        status=Course.Status.ACTIVE,
    )
    course_2 = Course.objects.create(
        tenant=tenant,
        name="Science",
        code="CRS-SCI",
        status=Course.Status.ACTIVE,
    )

    classroom_1 = Classroom.objects.create(
        tenant=tenant,
        name="Class A",
        course=course_1,
        homeroom_teacher=teacher_1,
        academic_year="2026",
        capacity=30,
    )
    classroom_2 = Classroom.objects.create(
        tenant=tenant,
        name="Class B",
        course=course_2,
        homeroom_teacher=teacher_2,
        academic_year="2026",
        capacity=30,
    )

    enrollment_1 = Enrollment.objects.create(
        tenant=tenant,
        student=student_1,
        classroom=classroom_1,
        status=Enrollment.Status.ACTIVE,
    )
    enrollment_2 = Enrollment.objects.create(
        tenant=tenant,
        student=student_2,
        classroom=classroom_2,
        status=Enrollment.Status.ACTIVE,
    )

    grade_1 = GradeRecord.objects.create(
        tenant=tenant,
        enrollment=enrollment_1,
        teacher=teacher_1,
        component="Exam 1",
        score=16,
        max_score=20,
    )
    grade_2 = GradeRecord.objects.create(
        tenant=tenant,
        enrollment=enrollment_2,
        teacher=teacher_2,
        component="Exam 1",
        score=14,
        max_score=20,
    )
    lesson_1 = LearningContent.objects.create(
        tenant=tenant,
        course=course_1,
        author=teacher_1,
        title="Álgebra linear",
        content_type=LearningContent.ContentType.LESSON,
        body="Matriz e determinantes.",
        published=True,
    )
    lesson_2 = LearningContent.objects.create(
        tenant=tenant,
        course=course_2,
        author=teacher_2,
        title="Química orgânica",
        content_type=LearningContent.ContentType.LESSON,
        body="Ligações covalentes.",
        published=True,
    )

    skill_1 = Skill.objects.create(
        tenant=tenant,
        course=course_1,
        code="SKL-001",
        name="Raciocínio lógico",
        category=Skill.Category.COGNITIVE,
        level=Skill.Level.FOUNDATION,
        status=Skill.Status.ACTIVE,
    )
    skill_2 = Skill.objects.create(
        tenant=tenant,
        course=course_2,
        code="SKL-002",
        name="Leitura científica",
        category=Skill.Category.TECHNICAL,
        level=Skill.Level.INTERMEDIATE,
        status=Skill.Status.ACTIVE,
    )
    assignment_1 = Assignment.objects.create(
        tenant=tenant,
        course=course_1,
        classroom=classroom_1,
        teacher=teacher_1,
        title="Trabalho de Álgebra",
        instructions="Resolver os exercícios 1 a 10.",
        opens_at=now - timedelta(hours=1),
        due_at=now + timedelta(days=2),
        max_score=20,
        status=Assignment.Status.PUBLISHED,
        allow_late_submission=False,
        allow_multiple_submissions=False,
        max_submissions=1,
        published_at=now - timedelta(hours=1),
    )
    assignment_2 = Assignment.objects.create(
        tenant=tenant,
        course=course_2,
        classroom=classroom_2,
        teacher=teacher_2,
        title="Trabalho de Química",
        instructions="Ficha prática.",
        opens_at=now - timedelta(hours=1),
        due_at=now + timedelta(days=2),
        max_score=20,
        status=Assignment.Status.PUBLISHED,
        allow_late_submission=False,
        allow_multiple_submissions=False,
        max_submissions=1,
        published_at=now - timedelta(hours=1),
    )
    submission_1 = AssignmentSubmission.objects.create(
        tenant=tenant,
        assignment=assignment_1,
        enrollment=enrollment_1,
        student=student_1,
        attempt_number=1,
        submitted_at=now - timedelta(minutes=10),
        status=AssignmentSubmission.Status.SUBMITTED,
        content_text="Respostas do estudante 1",
        max_score_snapshot=20,
    )
    submission_2 = AssignmentSubmission.objects.create(
        tenant=tenant,
        assignment=assignment_2,
        enrollment=enrollment_2,
        student=student_2,
        attempt_number=1,
        submitted_at=now - timedelta(minutes=10),
        status=AssignmentSubmission.Status.SUBMITTED,
        content_text="Respostas do estudante 2",
        max_score_snapshot=20,
    )
    exam_1 = Examination.objects.create(
        tenant=tenant,
        course=course_1,
        classroom=classroom_1,
        title="Exame Matemática",
        scheduled_for=now - timedelta(minutes=20),
        opens_at=now - timedelta(minutes=20),
        closes_at=now + timedelta(hours=2),
        duration_minutes=90,
        max_attempts=1,
        status=Examination.Status.PUBLISHED,
        published_at=now - timedelta(hours=2),
        max_score=20,
    )
    exam_2 = Examination.objects.create(
        tenant=tenant,
        course=course_2,
        classroom=classroom_2,
        title="Exame Química",
        scheduled_for=now - timedelta(minutes=20),
        opens_at=now - timedelta(minutes=20),
        closes_at=now + timedelta(hours=2),
        duration_minutes=90,
        max_attempts=1,
        status=Examination.Status.PUBLISHED,
        published_at=now - timedelta(hours=2),
        max_score=20,
    )
    exam_attempt_1 = ExaminationAttempt.objects.create(
        tenant=tenant,
        examination=exam_1,
        enrollment=enrollment_1,
        student=student_1,
        status=ExaminationAttempt.Status.SUBMITTED,
        started_at=now - timedelta(minutes=30),
        expires_at=now + timedelta(minutes=60),
        submitted_at=now - timedelta(minutes=5),
        time_limit_minutes_snapshot=90,
        max_score_snapshot=20,
        submission_payload="Respostas do exame 1",
    )
    exam_attempt_2 = ExaminationAttempt.objects.create(
        tenant=tenant,
        examination=exam_2,
        enrollment=enrollment_2,
        student=student_2,
        status=ExaminationAttempt.Status.SUBMITTED,
        started_at=now - timedelta(minutes=30),
        expires_at=now + timedelta(minutes=60),
        submitted_at=now - timedelta(minutes=5),
        time_limit_minutes_snapshot=90,
        max_score_snapshot=20,
        submission_payload="Respostas do exame 2",
    )
    random_test_1 = RandomTest.objects.create(
        tenant=tenant,
        course=course_1,
        classroom=classroom_1,
        enrollment=enrollment_1,
        student=student_1,
        teacher=teacher_1,
        title="Teste aleatório A",
        scheduled_for=now + timedelta(days=1),
        opens_at=now + timedelta(days=1),
        closes_at=now + timedelta(days=1, hours=1),
        duration_minutes=45,
        question_count=12,
        status=RandomTest.Status.SCHEDULED,
    )
    random_test_2 = RandomTest.objects.create(
        tenant=tenant,
        course=course_2,
        classroom=classroom_2,
        enrollment=enrollment_2,
        student=student_2,
        teacher=teacher_2,
        title="Teste aleatório B",
        scheduled_for=now + timedelta(days=1),
        opens_at=now + timedelta(days=1),
        closes_at=now + timedelta(days=1, hours=1),
        duration_minutes=45,
        question_count=12,
        status=RandomTest.Status.SCHEDULED,
    )

    return {
        "teacher_user_1": teacher_user_1,
        "teacher_user_2": teacher_user_2,
        "student_user_1": student_user_1,
        "student_user_2": student_user_2,
        "teacher_1": teacher_1,
        "teacher_2": teacher_2,
        "student_1": student_1,
        "student_2": student_2,
        "course_1": course_1,
        "course_2": course_2,
        "classroom_1": classroom_1,
        "classroom_2": classroom_2,
        "enrollment_1": enrollment_1,
        "enrollment_2": enrollment_2,
        "grade_1": grade_1,
        "grade_2": grade_2,
        "lesson_1": lesson_1,
        "lesson_2": lesson_2,
        "skill_1": skill_1,
        "skill_2": skill_2,
        "assignment_1": assignment_1,
        "assignment_2": assignment_2,
        "submission_1": submission_1,
        "submission_2": submission_2,
        "exam_1": exam_1,
        "exam_2": exam_2,
        "exam_attempt_1": exam_attempt_1,
        "exam_attempt_2": exam_attempt_2,
        "random_test_1": random_test_1,
        "random_test_2": random_test_2,
    }


@pytest.mark.django_db
def test_student_group_only_sees_own_profile_and_academic_records(api_client):
    tenant = _tenant("tn-edu-student", "edu-student.local")
    scope = _seed_scope(tenant)
    schedule_1 = DisciplineScheduleItem.objects.create(
        tenant=tenant,
        course=scope["course_1"],
        classroom=scope["classroom_1"],
        item_type=DisciplineScheduleItem.ItemType.THEME,
        title="Tema 1",
        scheduled_date=timezone.localdate() + timedelta(days=1),
        requires_attendance=True,
    )
    schedule_2 = DisciplineScheduleItem.objects.create(
        tenant=tenant,
        course=scope["course_2"],
        classroom=scope["classroom_2"],
        item_type=DisciplineScheduleItem.ItemType.THEME,
        title="Tema 2",
        scheduled_date=timezone.localdate() + timedelta(days=1),
        requires_attendance=True,
    )
    progress_1 = DisciplineScheduleStudentStatus.objects.create(
        tenant=tenant,
        schedule_item=schedule_1,
        enrollment=scope["enrollment_1"],
    )
    DisciplineScheduleStudentStatus.objects.create(
        tenant=tenant,
        schedule_item=schedule_2,
        enrollment=scope["enrollment_2"],
    )
    _authenticate(api_client, tenant=tenant, user=scope["student_user_1"])

    response = api_client.get("/api/v1/education/student/")
    assert response.status_code == 200, _response_data(response)
    assert {item["id"] for item in _items(response)} == {scope["student_1"].id}

    response = api_client.get("/api/v1/education/enrollment/")
    assert response.status_code == 200, _response_data(response)
    assert {item["id"] for item in _items(response)} == {scope["enrollment_1"].id}

    response = api_client.get("/api/v1/education/grade/")
    assert response.status_code == 200, _response_data(response)
    assert {item["id"] for item in _items(response)} == {scope["grade_1"].id}

    response = api_client.get("/api/v1/education/assessment/")
    assert response.status_code == 200, _response_data(response)
    assert {item["id"] for item in _items(response)} == {scope["grade_1"].id}

    response = api_client.get("/api/v1/education/lesson/")
    assert response.status_code == 200, _response_data(response)
    assert {item["id"] for item in _items(response)} == {scope["lesson_1"].id}

    response = api_client.get("/api/v1/education/bibliography/")
    assert response.status_code == 200, _response_data(response)
    assert _items(response) == []

    response = api_client.get("/api/v1/education/thematic_map/")
    assert response.status_code == 200, _response_data(response)
    assert _items(response) == []

    response = api_client.get("/api/v1/education/assignment/")
    assert response.status_code == 200, _response_data(response)
    assert {item["id"] for item in _items(response)} == {scope["assignment_1"].id}

    response = api_client.get("/api/v1/education/submission/")
    assert response.status_code == 200, _response_data(response)
    assert {item["id"] for item in _items(response)} == {scope["submission_1"].id}

    response = api_client.get("/api/v1/education/exam_attempt/")
    assert response.status_code == 200, _response_data(response)
    assert {item["id"] for item in _items(response)} == {scope["exam_attempt_1"].id}

    response = api_client.get("/api/v1/education/skill/")
    assert response.status_code == 200, _response_data(response)
    assert {item["id"] for item in _items(response)} == {scope["skill_1"].id}

    response = api_client.get("/api/v1/education/random_test/")
    assert response.status_code == 200, _response_data(response)
    assert {item["id"] for item in _items(response)} == {scope["random_test_1"].id}

    response = api_client.get("/api/v1/education/discipline_schedule/")
    assert response.status_code == 200, _response_data(response)
    assert {item["id"] for item in _items(response)} == {schedule_1.id}

    response = api_client.get("/api/v1/education/schedule_progress/")
    assert response.status_code == 200, _response_data(response)
    assert {item["id"] for item in _items(response)} == {progress_1.id}


@pytest.mark.django_db
def test_teacher_group_only_sees_owned_scope(api_client):
    tenant = _tenant("tn-edu-teacher", "edu-teacher.local")
    scope = _seed_scope(tenant)
    schedule_1 = DisciplineScheduleItem.objects.create(
        tenant=tenant,
        course=scope["course_1"],
        classroom=scope["classroom_1"],
        item_type=DisciplineScheduleItem.ItemType.THEME,
        title="Tema 1",
        scheduled_date=timezone.localdate() + timedelta(days=1),
        requires_attendance=True,
    )
    schedule_2 = DisciplineScheduleItem.objects.create(
        tenant=tenant,
        course=scope["course_2"],
        classroom=scope["classroom_2"],
        item_type=DisciplineScheduleItem.ItemType.THEME,
        title="Tema 2",
        scheduled_date=timezone.localdate() + timedelta(days=1),
        requires_attendance=True,
    )
    progress_1 = DisciplineScheduleStudentStatus.objects.create(
        tenant=tenant,
        schedule_item=schedule_1,
        enrollment=scope["enrollment_1"],
    )
    DisciplineScheduleStudentStatus.objects.create(
        tenant=tenant,
        schedule_item=schedule_2,
        enrollment=scope["enrollment_2"],
    )
    _authenticate(api_client, tenant=tenant, user=scope["teacher_user_1"])

    response = api_client.get("/api/v1/education/teacher/")
    assert response.status_code == 200, _response_data(response)
    assert {item["id"] for item in _items(response)} == {scope["teacher_1"].id}

    response = api_client.get("/api/v1/education/classroom/")
    assert response.status_code == 200, _response_data(response)
    assert {item["id"] for item in _items(response)} == {scope["classroom_1"].id}

    response = api_client.get("/api/v1/education/course/")
    assert response.status_code == 200, _response_data(response)
    assert {item["id"] for item in _items(response)} == {scope["course_1"].id}

    response = api_client.get("/api/v1/education/enrollment/")
    assert response.status_code == 200, _response_data(response)
    assert {item["id"] for item in _items(response)} == {scope["enrollment_1"].id}

    response = api_client.get("/api/v1/education/grade/")
    assert response.status_code == 200, _response_data(response)
    assert {item["id"] for item in _items(response)} == {scope["grade_1"].id}

    response = api_client.get("/api/v1/education/assessment/")
    assert response.status_code == 200, _response_data(response)
    assert {item["id"] for item in _items(response)} == {scope["grade_1"].id}

    response = api_client.get("/api/v1/education/lesson/")
    assert response.status_code == 200, _response_data(response)
    assert {item["id"] for item in _items(response)} == {scope["lesson_1"].id}

    response = api_client.get("/api/v1/education/bibliography/")
    assert response.status_code == 200, _response_data(response)
    assert _items(response) == []

    response = api_client.get("/api/v1/education/thematic_map/")
    assert response.status_code == 200, _response_data(response)
    assert _items(response) == []

    response = api_client.get("/api/v1/education/assignment/")
    assert response.status_code == 200, _response_data(response)
    assert {item["id"] for item in _items(response)} == {scope["assignment_1"].id}

    response = api_client.get("/api/v1/education/submission/")
    assert response.status_code == 200, _response_data(response)
    assert {item["id"] for item in _items(response)} == {scope["submission_1"].id}

    response = api_client.get("/api/v1/education/exam_attempt/")
    assert response.status_code == 200, _response_data(response)
    assert {item["id"] for item in _items(response)} == {scope["exam_attempt_1"].id}

    response = api_client.get("/api/v1/education/skill/")
    assert response.status_code == 200, _response_data(response)
    assert {item["id"] for item in _items(response)} == {scope["skill_1"].id}

    response = api_client.get("/api/v1/education/random_test/")
    assert response.status_code == 200, _response_data(response)
    assert {item["id"] for item in _items(response)} == {scope["random_test_1"].id}

    response = api_client.get("/api/v1/education/discipline_schedule/")
    assert response.status_code == 200, _response_data(response)
    assert {item["id"] for item in _items(response)} == {schedule_1.id}

    response = api_client.get("/api/v1/education/schedule_progress/")
    assert response.status_code == 200, _response_data(response)
    assert {item["id"] for item in _items(response)} == {progress_1.id}


@pytest.mark.django_db
def test_director_can_schedule_random_tests_for_whole_classroom(api_client):
    tenant = _tenant("tn-edu-random-class", "edu-random-class.local")
    scope = _seed_scope(tenant)
    director = _user(tenant=tenant, username="director_random_tests", role_group="Diretor da Escola")
    _authenticate(api_client, tenant=tenant, user=director)

    response = api_client.post(
        "/api/v1/education/random_test/schedule_for_classroom/",
        {
            "classroom": scope["classroom_1"].id,
            "scheduled_for": (timezone.now() + timedelta(days=2)).isoformat(),
            "duration_minutes": 50,
            "question_count": 20,
            "title_template": "Teste surpresa - {student_code}",
            "notes": "Agendamento automático por turma.",
        },
        format="json",
    )

    assert response.status_code == 201, _response_data(response)
    payload = _response_data(response)
    assert payload["count"] == 1
    created_id = payload["results"][0]["id"]
    created = RandomTest.objects.get(id=created_id, tenant=tenant)
    assert created.classroom_id == scope["classroom_1"].id
    assert created.student_id == scope["student_1"].id
    assert created.enrollment_id == scope["enrollment_1"].id
    assert created.duration_minutes == 50
    assert created.question_count == 20


@pytest.mark.django_db
def test_teacher_can_schedule_random_test_for_selected_student_in_assigned_classroom(api_client):
    tenant = _tenant("tn-edu-random-student", "edu-random-student.local")
    scope = _seed_scope(tenant)
    _authenticate(api_client, tenant=tenant, user=scope["teacher_user_1"])

    response = api_client.post(
        "/api/v1/education/random_test/schedule_for_classroom/",
        {
            "classroom": scope["classroom_1"].id,
            "student_ids": [scope["student_1"].id],
            "scheduled_for": (timezone.now() + timedelta(days=3)).isoformat(),
            "duration_minutes": 40,
            "question_count": 10,
            "title_template": "Teste individual - {student_code}",
        },
        format="json",
    )

    assert response.status_code == 201, _response_data(response)
    payload = _response_data(response)
    assert payload["count"] == 1
    created = RandomTest.objects.get(id=payload["results"][0]["id"], tenant=tenant)
    assert created.teacher_id == scope["teacher_1"].id
    assert created.student_id == scope["student_1"].id


@pytest.mark.django_db
def test_teacher_cannot_schedule_random_test_for_unassigned_classroom(api_client):
    tenant = _tenant("tn-edu-random-forbidden", "edu-random-forbidden.local")
    scope = _seed_scope(tenant)
    _authenticate(api_client, tenant=tenant, user=scope["teacher_user_1"])

    response = api_client.post(
        "/api/v1/education/random_test/schedule_for_classroom/",
        {
            "classroom": scope["classroom_2"].id,
            "scheduled_for": (timezone.now() + timedelta(days=3)).isoformat(),
            "duration_minutes": 40,
            "question_count": 10,
            "title_template": "Teste fora de escopo",
        },
        format="json",
    )

    assert response.status_code == 400, _response_data(response)


@pytest.mark.django_db
def test_director_can_create_full_plan_and_roll_call_marks_absence_as_overdue(api_client):
    tenant = _tenant("tn-edu-schedule-plan", "edu-schedule-plan.local")
    scope = _seed_scope(tenant)
    director = _user(tenant=tenant, username="director_schedule_plan", role_group="Diretor da Escola")
    _authenticate(api_client, tenant=tenant, user=director)

    schedule_date = timezone.localdate() + timedelta(days=1)
    response_plan = api_client.post(
        "/api/v1/education/discipline_schedule/create_full_plan/",
        {
            "course": scope["course_1"].id,
            "classroom": scope["classroom_1"].id,
            "test_dates": [schedule_date.isoformat()],
            "assignment_dates": [schedule_date.isoformat()],
            "exercise_dates": [schedule_date.isoformat()],
            "themes": [
                {
                    "title": "Tema 1",
                    "scheduled_date": schedule_date.isoformat(),
                    "description": "Introdução à unidade",
                }
            ],
            "notes": "Plano trimestral",
        },
        format="json",
    )

    assert response_plan.status_code == 201, _response_data(response_plan)
    payload = _response_data(response_plan)
    assert payload["count"] >= 4
    created_ids = {item["id"] for item in payload["results"]}

    attendance_bound_item = DisciplineScheduleItem.objects.filter(
        tenant=tenant,
        id__in=created_ids,
        scheduled_date=schedule_date,
        requires_attendance=True,
    ).first()
    assert attendance_bound_item is not None

    response_roll_call = api_client.post(
        "/api/v1/education/attendance/roll_call/",
        {
            "classroom": scope["classroom_1"].id,
            "attendance_date": schedule_date.isoformat(),
            "present_student_ids": [],
            "late_student_ids": [],
            "notes": "Estudante ausente",
        },
        format="json",
    )

    assert response_roll_call.status_code == 200, _response_data(response_roll_call)
    attendance = AttendanceRecord.objects.get(
        tenant=tenant,
        enrollment=scope["enrollment_1"],
        attendance_date=schedule_date,
    )
    assert attendance.status == AttendanceRecord.Status.ABSENT

    progress = DisciplineScheduleStudentStatus.objects.get(
        tenant=tenant,
        schedule_item=attendance_bound_item,
        enrollment=scope["enrollment_1"],
    )
    assert progress.status == DisciplineScheduleStudentStatus.Status.OVERDUE
    assert progress.attendance_status_snapshot == AttendanceRecord.Status.ABSENT


@pytest.mark.django_db
def test_schedule_progress_can_be_marked_success_and_item_can_be_completed(api_client):
    tenant = _tenant("tn-edu-schedule-actions", "edu-schedule-actions.local")
    scope = _seed_scope(tenant)
    director = _user(tenant=tenant, username="director_schedule_actions", role_group="Diretor da Escola")
    _authenticate(api_client, tenant=tenant, user=director)

    schedule_date = timezone.localdate() + timedelta(days=2)
    response_create = api_client.post(
        "/api/v1/education/discipline_schedule/",
        {
            "course": scope["course_1"].id,
            "classroom": scope["classroom_1"].id,
            "item_type": DisciplineScheduleItem.ItemType.THEME,
            "title": "Tema de revisão",
            "description": "Revisão geral da matéria",
            "scheduled_date": schedule_date.isoformat(),
            "requires_attendance": False,
            "notes": "Planeamento semanal",
        },
        format="json",
    )
    assert response_create.status_code == 201, _response_data(response_create)
    schedule_item_id = _response_data(response_create)["id"]

    progress = DisciplineScheduleStudentStatus.objects.get(
        tenant=tenant,
        schedule_item_id=schedule_item_id,
        enrollment=scope["enrollment_1"],
    )
    assert progress.status == DisciplineScheduleStudentStatus.Status.PENDING

    response_mark_success = api_client.post(
        f"/api/v1/education/schedule_progress/{progress.id}/mark_success/",
        {},
        format="json",
    )
    assert response_mark_success.status_code == 200, _response_data(response_mark_success)
    progress.refresh_from_db()
    assert progress.completion_marked is True
    assert progress.status == DisciplineScheduleStudentStatus.Status.SUCCESS

    response_mark_item = api_client.post(
        f"/api/v1/education/discipline_schedule/{schedule_item_id}/mark_completed/",
        {},
        format="json",
    )
    assert response_mark_item.status_code == 200, _response_data(response_mark_item)
    schedule_item = DisciplineScheduleItem.objects.get(id=schedule_item_id, tenant=tenant)
    assert schedule_item.status == DisciplineScheduleItem.Status.COMPLETED
    assert schedule_item.completed_at is not None


@pytest.mark.django_db
def test_student_cannot_create_teacher_profile(api_client):
    tenant = _tenant("tn-edu-rbac", "edu-rbac.local")
    scope = _seed_scope(tenant)
    _authenticate(api_client, tenant=tenant, user=scope["student_user_1"])

    payload = {
        "user": scope["student_user_2"].id,
        "teacher_code": "TCH-777",
        "specialty": "Blocked by RBAC",
    }
    response = api_client.post("/api/v1/education/teacher/", payload, format="json")

    assert response.status_code == 403


@pytest.mark.django_db
def test_teacher_create_forces_request_tenant_even_with_payload_tenant(api_client):
    tenant_main = _tenant("tn-edu-main", "edu-main.local")
    tenant_other = _tenant("tn-edu-other", "edu-other.local")

    teacher_user = _user(tenant=tenant_main, username="teacher_main", role_group="Professor")
    target_user = get_user_model().objects.create_user(
        username="teacher_target",
        email="teacher_target@example.com",
        password="testpass123",
        name="Teacher Target",
        tenant=tenant_main,
    )
    _authenticate(api_client, tenant=tenant_main, user=teacher_user)

    response = api_client.post(
        "/api/v1/education/teacher/",
        {
            "tenant": tenant_other.id,
            "user": target_user.id,
            "teacher_code": "TCH-NEW-1",
            "specialty": "Physics",
        },
        format="json",
    )

    assert response.status_code == 201, _response_data(response)
    created = TeacherProfile.objects.get(id=_response_data(response)["id"])
    assert created.tenant_id == tenant_main.id


@pytest.mark.django_db
def test_tenant_host_mismatch_is_denied_for_education_routes(api_client):
    tenant_main = _tenant("tn-edu-authz-main", "edu-authz-main.local")
    tenant_other = _tenant("tn-edu-authz-other", "edu-authz-other.local")
    _seed_scope(tenant_main)

    teacher_user = _user(tenant=tenant_main, username="teacher_mismatch", role_group="Professor")
    api_client.defaults["HTTP_HOST"] = tenant_other.domain
    api_client.force_authenticate(user=teacher_user)

    response = api_client.get("/api/v1/education/course/")
    assert response.status_code == 403


@pytest.mark.django_db
def test_skill_create_forces_request_tenant_and_accepts_aliases(api_client):
    tenant_main = _tenant("tn-edu-skill-main", "edu-skill-main.local")
    tenant_other = _tenant("tn-edu-skill-other", "edu-skill-other.local")
    director_user = _user(tenant=tenant_main, username="director_skill_main", role_group="Diretor da Escola")
    course = Course.objects.create(
        tenant=tenant_main,
        name="Física Aplicada",
        code="CRS-PHY",
        status=Course.Status.ACTIVE,
    )
    _authenticate(api_client, tenant=tenant_main, user=director_user)

    response = api_client.post(
        "/api/v1/education/skill/",
        {
            "tenant": tenant_other.id,
            "curso": course.id,
            "codigo": "SKL-PHY-01",
            "nome_skill": "Resolução de problemas",
            "categoria": Skill.Category.COGNITIVE,
            "nivel": Skill.Level.INTERMEDIATE,
            "estado": Skill.Status.ACTIVE,
            "descricao": "Aplicar análise vetorial em exercícios.",
        },
        format="json",
    )

    assert response.status_code == 201, _response_data(response)
    created = Skill.objects.get(id=_response_data(response)["id"])
    assert created.tenant_id == tenant_main.id
    assert created.course_id == course.id
    assert created.code == "SKL-PHY-01"
    assert created.name == "Resolução De Problemas"


@pytest.mark.django_db
def test_assessment_and_lesson_alias_endpoints_accept_alias_payloads(api_client):
    tenant = _tenant("tn-edu-alias-contracts", "edu-alias-contracts.local")
    director_user = _user(tenant=tenant, username="director_alias_contracts", role_group="Diretor da Escola")
    scope = _seed_scope(tenant)
    _authenticate(api_client, tenant=tenant, user=director_user)

    response_assessment = api_client.post(
        "/api/v1/education/assessment/",
        {
            "matricula": scope["enrollment_1"].id,
            "professor": scope["teacher_1"].id,
            "assessment": "Projeto Final",
            "assessment_score": "18.50",
            "assessment_max_score": "20.00",
            "assessment_weight": "1.25",
        },
        format="json",
    )
    assert response_assessment.status_code == 201, _response_data(response_assessment)

    created_assessment = GradeRecord.objects.get(id=_response_data(response_assessment)["id"])
    assert created_assessment.component == "Projeto Final"
    assert str(created_assessment.score) == "18.50"
    assert str(created_assessment.max_score) == "20.00"
    assert str(created_assessment.weight) == "1.25"

    response_lesson = api_client.post(
        "/api/v1/education/lesson/",
        {
            "lesson_title": "Trigonometria prática",
            "lesson_type": LearningContent.ContentType.LESSON,
            "lesson_body": "Razões trigonométricas no triângulo retângulo.",
            "lesson_course": scope["course_1"].id,
            "lesson_author": scope["teacher_1"].id,
            "lesson_published": True,
        },
        format="json",
    )
    assert response_lesson.status_code == 201, _response_data(response_lesson)

    created_lesson = LearningContent.objects.get(id=_response_data(response_lesson)["id"])
    assert created_lesson.title == "Trigonometria prática"
    assert created_lesson.content_type == LearningContent.ContentType.LESSON
    assert created_lesson.course_id == scope["course_1"].id
    assert created_lesson.author_id == scope["teacher_1"].id


@pytest.mark.django_db
def test_bibliography_and_thematic_map_endpoints_force_content_type_and_scope(api_client):
    tenant = _tenant("tn-edu-content-modules", "edu-content-modules.local")
    director_user = _user(tenant=tenant, username="director_content_modules", role_group="Diretor da Escola")
    scope = _seed_scope(tenant)
    _authenticate(api_client, tenant=tenant, user=director_user)

    bibliography = LearningContent.objects.create(
        tenant=tenant,
        course=scope["course_1"],
        author=scope["teacher_1"],
        title="Bibliografia de Matemática",
        content_type=LearningContent.ContentType.BIBLIOGRAPHY,
        body="Livro A, Capítulo 1 a 3.",
        published=True,
    )
    thematic_map = LearningContent.objects.create(
        tenant=tenant,
        course=scope["course_1"],
        author=scope["teacher_1"],
        title="Mapa Temático de Matemática",
        content_type=LearningContent.ContentType.THEMATIC_MAP,
        body="Unidade 1, Unidade 2 e Unidade 3.",
        published=True,
    )

    response_bibliography = api_client.get("/api/v1/education/bibliography/")
    assert response_bibliography.status_code == 200, _response_data(response_bibliography)
    assert {item["id"] for item in _items(response_bibliography)} == {bibliography.id}

    response_thematic_map = api_client.get("/api/v1/education/thematic_map/")
    assert response_thematic_map.status_code == 200, _response_data(response_thematic_map)
    assert {item["id"] for item in _items(response_thematic_map)} == {thematic_map.id}

    response_create_bibliography = api_client.post(
        "/api/v1/education/bibliography/",
        {
            "lesson_title": "Bibliografia adicional",
            "lesson_type": LearningContent.ContentType.LESSON,
            "lesson_body": "Livro B, capítulo 4.",
            "lesson_course": scope["course_1"].id,
            "lesson_author": scope["teacher_1"].id,
            "lesson_published": False,
        },
        format="json",
    )
    assert response_create_bibliography.status_code == 201, _response_data(response_create_bibliography)
    created_bibliography = LearningContent.objects.get(id=_response_data(response_create_bibliography)["id"])
    assert created_bibliography.content_type == LearningContent.ContentType.BIBLIOGRAPHY

    response_create_thematic_map = api_client.post(
        "/api/v1/education/thematic_map/",
        {
            "thematic_map_title": "Mapa Trimestral",
            "thematic_map_type": LearningContent.ContentType.DOCUMENT,
            "thematic_map_body": "Cronologia semanal por unidade.",
            "thematic_map_course": scope["course_1"].id,
            "thematic_map_author": scope["teacher_1"].id,
            "thematic_map_published": True,
        },
        format="json",
    )
    assert response_create_thematic_map.status_code == 201, _response_data(response_create_thematic_map)
    created_thematic_map = LearningContent.objects.get(id=_response_data(response_create_thematic_map)["id"])
    assert created_thematic_map.content_type == LearningContent.ContentType.THEMATIC_MAP


@pytest.mark.django_db
def test_student_submission_rejects_expired_assignment_deadline(api_client):
    tenant = _tenant("tn-edu-deadline", "edu-deadline.local")
    scope = _seed_scope(tenant)
    _authenticate(api_client, tenant=tenant, user=scope["student_user_1"])

    expired_assignment = Assignment.objects.create(
        tenant=tenant,
        course=scope["course_1"],
        classroom=scope["classroom_1"],
        teacher=scope["teacher_1"],
        title="Trabalho expirado",
        instructions="Entrega encerrada.",
        opens_at=timezone.now() - timedelta(days=3),
        due_at=timezone.now() - timedelta(hours=1),
        max_score=20,
        status=Assignment.Status.PUBLISHED,
        allow_late_submission=False,
        allow_multiple_submissions=False,
        max_submissions=1,
        published_at=timezone.now() - timedelta(days=2),
    )

    response = api_client.post(
        "/api/v1/education/submission/",
        {
            "assignment": expired_assignment.id,
            "enrollment": scope["enrollment_1"].id,
            "student": scope["student_1"].id,
            "content_text": "Resposta fora do prazo",
        },
        format="json",
    )

    assert response.status_code == 400, _response_data(response)


@pytest.mark.django_db
def test_test_exam_allows_three_attempts_only_after_failure_and_on_different_days(api_client):
    tenant = _tenant("tn-edu-exam-attempt", "edu-exam-attempt.local")
    scope = _seed_scope(tenant)
    _authenticate(api_client, tenant=tenant, user=scope["student_user_1"])

    exam = Examination.objects.create(
        tenant=tenant,
        course=scope["course_1"],
        classroom=scope["classroom_1"],
        title="Teste avaliativo 1",
        exam_type=Examination.ExamType.TEST,
        test_slot=1,
        scheduled_for=timezone.now() - timedelta(days=5),
        opens_at=timezone.now() - timedelta(days=5),
        closes_at=timezone.now() + timedelta(days=10),
        duration_minutes=60,
        max_attempts=3,
        pass_mark=10,
        status=Examination.Status.PUBLISHED,
        published_at=timezone.now() - timedelta(days=6),
        max_score=20,
    )

    first_started_at = timezone.now() - timedelta(days=2)
    response_create = api_client.post(
        "/api/v1/education/exam_attempt/",
        {
            "examination": exam.id,
            "enrollment": scope["enrollment_1"].id,
            "student": scope["student_1"].id,
            "started_at": first_started_at.isoformat(),
            "submission_payload": "Início da prova",
            "status": ExaminationAttempt.Status.SUBMITTED,
            "submitted_at": (first_started_at + timedelta(minutes=50)).isoformat(),
            "score": "8.00",
        },
        format="json",
    )
    assert response_create.status_code == 201, _response_data(response_create)
    attempt_id = _response_data(response_create)["id"]

    response_reopen = api_client.patch(
        f"/api/v1/education/exam_attempt/{attempt_id}/",
        {"status": ExaminationAttempt.Status.OPENED},
        format="json",
    )
    assert response_reopen.status_code == 400, _response_data(response_reopen)

    response_repeat_same_day = api_client.post(
        "/api/v1/education/exam_attempt/",
        {
            "examination": exam.id,
            "enrollment": scope["enrollment_1"].id,
            "student": scope["student_1"].id,
            "attempt_number": 2,
            "started_at": first_started_at.isoformat(),
            "submission_payload": "Tentativa no mesmo dia",
        },
        format="json",
    )
    assert response_repeat_same_day.status_code == 400, _response_data(response_repeat_same_day)

    second_started_at = first_started_at + timedelta(days=1)
    response_second = api_client.post(
        "/api/v1/education/exam_attempt/",
        {
            "examination": exam.id,
            "enrollment": scope["enrollment_1"].id,
            "student": scope["student_1"].id,
            "attempt_number": 2,
            "started_at": second_started_at.isoformat(),
            "submission_payload": "Segunda tentativa",
            "status": ExaminationAttempt.Status.SUBMITTED,
            "submitted_at": (second_started_at + timedelta(minutes=45)).isoformat(),
            "score": "9.50",
        },
        format="json",
    )
    assert response_second.status_code == 201, _response_data(response_second)

    third_started_at = second_started_at + timedelta(days=1)
    response_third = api_client.post(
        "/api/v1/education/exam_attempt/",
        {
            "examination": exam.id,
            "enrollment": scope["enrollment_1"].id,
            "student": scope["student_1"].id,
            "attempt_number": 3,
            "started_at": third_started_at.isoformat(),
            "submission_payload": "Terceira tentativa",
            "status": ExaminationAttempt.Status.SUBMITTED,
            "submitted_at": (third_started_at + timedelta(minutes=40)).isoformat(),
            "score": "10.00",
        },
        format="json",
    )
    assert response_third.status_code == 201, _response_data(response_third)

    response_fourth = api_client.post(
        "/api/v1/education/exam_attempt/",
        {
            "examination": exam.id,
            "enrollment": scope["enrollment_1"].id,
            "student": scope["student_1"].id,
            "attempt_number": 4,
            "started_at": (third_started_at + timedelta(days=1)).isoformat(),
            "submission_payload": "Quarta tentativa",
        },
        format="json",
    )
    assert response_fourth.status_code == 400, _response_data(response_fourth)


@pytest.mark.django_db
def test_discipline_final_stages_require_failing_previous_stage(api_client):
    tenant = _tenant("tn-edu-discipline-final", "edu-discipline-final.local")
    scope = _seed_scope(tenant)
    _authenticate(api_client, tenant=tenant, user=scope["student_user_1"])

    now = timezone.now()
    normal_exam = Examination.objects.create(
        tenant=tenant,
        course=scope["course_1"],
        classroom=scope["classroom_1"],
        title="Exame Final Normal",
        exam_type=Examination.ExamType.DISCIPLINE_FINAL,
        discipline_final_stage=Examination.DisciplineFinalStage.NORMAL,
        scheduled_for=now - timedelta(days=5),
        opens_at=now - timedelta(days=5),
        closes_at=now + timedelta(days=15),
        duration_minutes=60,
        max_attempts=1,
        pass_mark=10,
        status=Examination.Status.PUBLISHED,
        published_at=now - timedelta(days=6),
        max_score=20,
    )
    recurr_exam = Examination.objects.create(
        tenant=tenant,
        course=scope["course_1"],
        classroom=scope["classroom_1"],
        title="Exame Final de Recorrência",
        exam_type=Examination.ExamType.DISCIPLINE_FINAL,
        discipline_final_stage=Examination.DisciplineFinalStage.RECORRENCIA,
        scheduled_for=now - timedelta(days=2),
        opens_at=now - timedelta(days=2),
        closes_at=now + timedelta(days=20),
        duration_minutes=60,
        max_attempts=1,
        pass_mark=10,
        status=Examination.Status.PUBLISHED,
        published_at=now - timedelta(days=3),
        max_score=20,
    )

    response_recurr_without_normal = api_client.post(
        "/api/v1/education/exam_attempt/",
        {
            "examination": recurr_exam.id,
            "enrollment": scope["enrollment_1"].id,
            "student": scope["student_1"].id,
            "status": ExaminationAttempt.Status.SUBMITTED,
            "submitted_at": (now - timedelta(days=1)).isoformat(),
            "score": "9.00",
        },
        format="json",
    )
    assert response_recurr_without_normal.status_code == 400, _response_data(response_recurr_without_normal)

    response_normal = api_client.post(
        "/api/v1/education/exam_attempt/",
        {
            "examination": normal_exam.id,
            "enrollment": scope["enrollment_1"].id,
            "student": scope["student_1"].id,
            "status": ExaminationAttempt.Status.SUBMITTED,
            "submitted_at": (now - timedelta(days=1)).isoformat(),
            "score": "8.50",
        },
        format="json",
    )
    assert response_normal.status_code == 201, _response_data(response_normal)

    response_recurr_with_failure = api_client.post(
        "/api/v1/education/exam_attempt/",
        {
            "examination": recurr_exam.id,
            "enrollment": scope["enrollment_1"].id,
            "student": scope["student_1"].id,
            "status": ExaminationAttempt.Status.SUBMITTED,
            "submitted_at": timezone.now().isoformat(),
            "score": "12.00",
        },
        format="json",
    )
    assert response_recurr_with_failure.status_code == 201, _response_data(response_recurr_with_failure)


@pytest.mark.django_db
def test_course_final_is_one_attempt_per_year_and_marks_repeat_when_below_ten(api_client):
    tenant = _tenant("tn-edu-course-final", "edu-course-final.local")
    scope = _seed_scope(tenant)
    _authenticate(api_client, tenant=tenant, user=scope["student_user_1"])

    now = timezone.now()
    this_year_exam = Examination.objects.create(
        tenant=tenant,
        course=scope["course_1"],
        classroom=scope["classroom_1"],
        title="Exame Final do Curso",
        exam_type=Examination.ExamType.COURSE_FINAL,
        scheduled_for=now - timedelta(days=10),
        opens_at=now - timedelta(days=10),
        closes_at=now + timedelta(days=30),
        duration_minutes=90,
        max_attempts=1,
        pass_mark=10,
        status=Examination.Status.PUBLISHED,
        published_at=now - timedelta(days=11),
        max_score=20,
    )

    response_first = api_client.post(
        "/api/v1/education/exam_attempt/",
        {
            "examination": this_year_exam.id,
            "enrollment": scope["enrollment_1"].id,
            "student": scope["student_1"].id,
            "status": ExaminationAttempt.Status.SUBMITTED,
            "submitted_at": (now - timedelta(days=1)).isoformat(),
            "score": "9.00",
        },
        format="json",
    )
    assert response_first.status_code == 201, _response_data(response_first)
    first_attempt = ExaminationAttempt.objects.get(id=_response_data(response_first)["id"])
    assert first_attempt.requires_year_repeat is True

    same_year_exam = Examination.objects.create(
        tenant=tenant,
        course=scope["course_1"],
        classroom=scope["classroom_1"],
        title="Exame Final do Curso (mesmo ano)",
        exam_type=Examination.ExamType.COURSE_FINAL,
        scheduled_for=now - timedelta(days=2),
        opens_at=now - timedelta(days=2),
        closes_at=now + timedelta(days=60),
        duration_minutes=90,
        max_attempts=1,
        pass_mark=10,
        status=Examination.Status.PUBLISHED,
        published_at=now - timedelta(days=3),
        max_score=20,
    )

    response_same_year = api_client.post(
        "/api/v1/education/exam_attempt/",
        {
            "examination": same_year_exam.id,
            "enrollment": scope["enrollment_1"].id,
            "student": scope["student_1"].id,
            "status": ExaminationAttempt.Status.SUBMITTED,
            "submitted_at": timezone.now().isoformat(),
            "score": "11.00",
        },
        format="json",
    )
    assert response_same_year.status_code == 400, _response_data(response_same_year)
