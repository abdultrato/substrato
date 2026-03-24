from django.contrib.auth import get_user_model
from django.db import IntegrityError
import pytest


@pytest.mark.django_db
def test_usuario_criacao_campos_principais():
    User = get_user_model()
    from apps.tenants.models.tenant import Tenant

    tenant = Tenant.objects.create(identificador="tn-id", nome="Tenant ID")
    user = User.objects.create_user(
        username="user1",
        email="user1@example.com",
        password="pwd123",
        telefone="123",
        nome="User One",
        inquilino=tenant,
    )
    assert user.pk
    assert user.email == "user1@example.com"
    assert user.check_password("pwd123")


@pytest.mark.django_db
def test_usuario_email_unico():
    User = get_user_model()
    from apps.tenants.models.tenant import Tenant

    tenant = Tenant.objects.create(identificador="tn-id2", nome="Tenant ID2")
    User.objects.create_user(username="u1", email="dup@example.com", password="x", inquilino=tenant)
    with pytest.raises(IntegrityError):
        User.objects.create_user(username="u2", email="dup@example.com", password="y", inquilino=tenant)
