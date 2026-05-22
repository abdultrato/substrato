from django.contrib import admin
from django.contrib.auth import get_user_model
from django.contrib.messages import get_messages
from django.db import IntegrityError
import pytest

from apps.education.models import Course
from apps.tenants.models.tenant import Tenant
from infrastructure.admin_integrity_guard import _extract_integrity_hint


@pytest.mark.django_db
def test_extract_integrity_hint_for_not_null_field():
    exc = IntegrityError("NOT NULL constraint failed: clinico_resultadoitem.exam_field_id")
    assert _extract_integrity_hint(exc) == "O campo obrigatório 'exam_field' não foi preenchido."


@pytest.mark.django_db
def test_admin_changeform_integrity_error_redirects_with_message(client, monkeypatch):
    tenant = Tenant.objects.create(
        identifier="tn-admin-integrity",
        name="Tenant Admin Integrity",
        domain="testserver",
        active=True,
    )

    user_model = get_user_model()
    admin_user = user_model.objects.create_superuser(
        username="admin_integrity_guard",
        email="admin_integrity_guard@example.com",
        password="adminpass123",
        tenant=tenant,
    )

    client.defaults["HTTP_HOST"] = tenant.domain
    client.force_login(admin_user)

    model_admin = admin.site._registry[Course]
    admin_cls = model_admin.__class__
    original_changeform_impl = admin_cls._changeform_view

    def _raising_changeform(self, request, object_id=None, form_url="", extra_context=None):
        if request.method == "POST":
            raise IntegrityError("NOT NULL constraint failed: clinico_resultadoitem.exam_field_id")
        return original_changeform_impl(
            self,
            request,
            object_id=object_id,
            form_url=form_url,
            extra_context=extra_context,
        )

    monkeypatch.setattr(admin_cls, "_changeform_view", _raising_changeform)

    url = "/admin/education/course/add/"
    response = client.post(
        url,
        {
            "tenant": tenant.id,
            "name": "Curso Teste",
            "code": "CUR-TST-001",
        },
        follow=False,
    )

    assert response.status_code == 302
    assert response["Location"].endswith(url)

    follow_response = client.get(response["Location"], follow=True)
    assert follow_response.status_code == 200

    messages = [str(msg) for msg in get_messages(follow_response.wsgi_request)]
    assert any("Não foi possível guardar" in msg for msg in messages)
    assert any("campo obrigatório 'exam_field'" in msg for msg in messages)

