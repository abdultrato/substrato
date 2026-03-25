from django.contrib.auth import get_user_model
from django.db import IntegrityError
import pytest


@pytest.mark.django_db
def test_user_creation_main_fields():
    User = get_user_model()
    from apps.tenants.models.tenant import Tenant

    tenant = Tenant.objects.create(identifier="tn-id", name="Tenant ID")
    user = User.objects.create_user(
        username="user1",
        email="user1@example.com",
        password="pwd123",
        phone="123",
        name="User One",
        tenant=tenant,
    )
    assert user.pk
    assert user.email == "user1@example.com"
    assert user.check_password("pwd123")


@pytest.mark.django_db
def test_user_email_is_unique():
    User = get_user_model()
    from apps.tenants.models.tenant import Tenant

    tenant = Tenant.objects.create(identifier="tn-id2", name="Tenant ID2")
    User.objects.create_user(username="u1", email="dup@example.com", password="x", tenant=tenant)
    with pytest.raises(IntegrityError):
        User.objects.create_user(username="u2", email="dup@example.com", password="y", tenant=tenant)


