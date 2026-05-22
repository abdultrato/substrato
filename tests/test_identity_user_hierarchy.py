from __future__ import annotations

import json

from django.contrib.auth import get_user_model
from django.contrib.auth.models import Group
import pytest

from apps.tenants.models.tenant import Tenant
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


@pytest.mark.django_db
def test_director_can_deactivate_non_admin_users(api_client):
    tenant = _tenant("tn-dir-hierarchy", "dir-hierarchy.local")
    director = _user(tenant=tenant, username="director_hierarchy", group_name=GROUPS["DIRETOR_ESCOLA"])
    teacher = _user(tenant=tenant, username="teacher_hierarchy", group_name=GROUPS["PROFESSOR"])

    _authenticate(api_client, tenant=tenant, user=director)
    response = api_client.delete(f"/api/v1/identity/user/{teacher.id}/")

    assert response.status_code == 200, _response_data(response)
    teacher.refresh_from_db()
    assert teacher.is_active is False


@pytest.mark.django_db
def test_deputy_cannot_manage_director(api_client):
    tenant = _tenant("tn-deputy-hierarchy", "deputy-hierarchy.local")
    deputy = _user(
        tenant=tenant,
        username="deputy_hierarchy",
        group_name=GROUPS["DIRETOR_ADJUNTO_PEDAGOGICO"],
    )
    director = _user(tenant=tenant, username="director_target", group_name=GROUPS["DIRETOR_ESCOLA"])

    _authenticate(api_client, tenant=tenant, user=deputy)
    response = api_client.delete(f"/api/v1/identity/user/{director.id}/")

    # get_queryset already excludes directors for deputy profiles.
    assert response.status_code in {403, 404}
    director.refresh_from_db()
    assert director.is_active is True


@pytest.mark.django_db
def test_professor_only_lists_student_users(api_client):
    tenant = _tenant("tn-prof-list", "prof-list.local")
    professor = _user(tenant=tenant, username="prof_list", group_name=GROUPS["PROFESSOR"])
    student = _user(tenant=tenant, username="student_list", group_name=GROUPS["ESTUDANTE"])
    _user(tenant=tenant, username="director_list", group_name=GROUPS["DIRETOR_ESCOLA"])

    _authenticate(api_client, tenant=tenant, user=professor)
    response = api_client.get("/api/v1/identity/user/")

    assert response.status_code == 200, _response_data(response)
    payload = _response_data(response)
    rows = payload["results"] if isinstance(payload, dict) and "results" in payload else payload
    ids = {row["id"] for row in rows}
    assert student.id in ids
    assert professor.id not in ids


@pytest.mark.django_db
def test_professor_can_create_student_but_not_teacher_user(api_client):
    tenant = _tenant("tn-prof-create", "prof-create.local")
    professor = _user(tenant=tenant, username="prof_create", group_name=GROUPS["PROFESSOR"])
    student_group, _ = Group.objects.get_or_create(name=GROUPS["ESTUDANTE"])
    teacher_group, _ = Group.objects.get_or_create(name=GROUPS["PROFESSOR"])

    _authenticate(api_client, tenant=tenant, user=professor)

    response_ok = api_client.post(
        "/api/v1/identity/user/",
        {
            "username": "new_student_by_prof",
            "name": "Novo Estudante",
            "email": "new_student_by_prof@example.com",
            "password": "testpass123",
            "groups": [student_group.id],
        },
        format="json",
    )
    assert response_ok.status_code == 201, _response_data(response_ok)
    created_id = _response_data(response_ok)["id"]
    created_user = get_user_model().objects.get(id=created_id)
    assert created_user.groups.filter(name=GROUPS["ESTUDANTE"]).exists()

    response_blocked = api_client.post(
        "/api/v1/identity/user/",
        {
            "username": "new_teacher_by_prof",
            "name": "Novo Professor",
            "email": "new_teacher_by_prof@example.com",
            "password": "testpass123",
            "groups": [teacher_group.id],
        },
        format="json",
    )
    assert response_blocked.status_code == 400
