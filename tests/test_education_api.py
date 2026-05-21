import json

from django.contrib.auth import get_user_model
from django.contrib.auth.models import Group
import pytest

from apps.education.models import Classroom, Course, Enrollment, GradeRecord, Skill, StudentProfile, TeacherProfile
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
        "skill_1": skill_1,
        "skill_2": skill_2,
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
