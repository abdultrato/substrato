import json
from datetime import timedelta

from django.contrib.auth import get_user_model
from django.contrib.auth.models import Group
from django.utils import timezone
import pytest

from apps.education.models import (
    Assignment,
    AssignmentSubmission,
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
    }


@pytest.mark.django_db
def test_student_group_only_sees_own_profile_and_academic_records(api_client):
    tenant = _tenant("tn-edu-student", "edu-student.local")
    scope = _seed_scope(tenant)
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


@pytest.mark.django_db
def test_teacher_group_only_sees_owned_scope(api_client):
    tenant = _tenant("tn-edu-teacher", "edu-teacher.local")
    scope = _seed_scope(tenant)
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
def test_student_exam_attempt_is_single_use_and_cannot_reopen(api_client):
    tenant = _tenant("tn-edu-exam-attempt", "edu-exam-attempt.local")
    scope = _seed_scope(tenant)
    _authenticate(api_client, tenant=tenant, user=scope["student_user_1"])

    exam = Examination.objects.create(
        tenant=tenant,
        course=scope["course_1"],
        classroom=scope["classroom_1"],
        title="Exame online único",
        scheduled_for=timezone.now() - timedelta(minutes=10),
        opens_at=timezone.now() - timedelta(minutes=10),
        closes_at=timezone.now() + timedelta(hours=2),
        duration_minutes=60,
        max_attempts=1,
        status=Examination.Status.PUBLISHED,
        published_at=timezone.now() - timedelta(hours=1),
        max_score=20,
    )

    response_create = api_client.post(
        "/api/v1/education/exam_attempt/",
        {
            "examination": exam.id,
            "enrollment": scope["enrollment_1"].id,
            "student": scope["student_1"].id,
            "submission_payload": "Início da prova",
        },
        format="json",
    )
    assert response_create.status_code == 201, _response_data(response_create)
    attempt_id = _response_data(response_create)["id"]

    response_submit = api_client.patch(
        f"/api/v1/education/exam_attempt/{attempt_id}/",
        {"status": ExaminationAttempt.Status.SUBMITTED, "submitted_at": timezone.now().isoformat()},
        format="json",
    )
    assert response_submit.status_code == 200, _response_data(response_submit)

    response_reopen = api_client.patch(
        f"/api/v1/education/exam_attempt/{attempt_id}/",
        {"status": ExaminationAttempt.Status.OPENED},
        format="json",
    )
    assert response_reopen.status_code == 400, _response_data(response_reopen)

    response_repeat = api_client.post(
        "/api/v1/education/exam_attempt/",
        {
            "examination": exam.id,
            "enrollment": scope["enrollment_1"].id,
            "student": scope["student_1"].id,
            "submission_payload": "Tentativa repetida",
        },
        format="json",
    )
    assert response_repeat.status_code == 400, _response_data(response_repeat)
