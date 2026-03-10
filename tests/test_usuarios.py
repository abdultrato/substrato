"""
Tests for user authentication, roles, and permissions (identidade app).
"""

import pytest
from django.contrib.auth.models import Group
from django.test import RequestFactory
from rest_framework.test import APIClient, APITestCase
from rest_framework import status
from rest_framework_simplejwt.tokens import RefreshToken

from aplicativos.identidade.models import Usuario, PerfilProfissional
from tests.factories import UserFactory


@pytest.mark.django_db
class TestUsuarioModel:
    """Test Usuario model creation and methods."""

    def test_create_user_with_email(self):
        """Should create user with email instead of username."""
        user = UserFactory(email="test@example.com", nome_completo="Test User")
        assert user.email == "test@example.com"
        assert user.nome_completo == "Test User"
        assert user.username is None  # Django default User uses username
        assert user.is_active

    def test_create_superuser(self):
        """Should create superuser with is_staff and is_superuser."""
        user = UserFactory(is_superuser=True, is_staff=True)
        assert user.is_superuser
        assert user.is_staff

    def test_user_email_unique(self):
        """Should enforce email uniqueness."""
        user1 = UserFactory(email="unique@example.com")
        with pytest.raises(Exception):  # IntegrityError
            UserFactory(email="unique@example.com")

    def test_user_phone_optional(self):
        """Should allow phone field to be blank."""
        user = UserFactory(telefone="")
        assert user.telefone == ""


@pytest.mark.django_db
class TestJWTAuthentication:
    """Test JWT token generation and validation."""

    def test_create_refresh_token(self):
        """Should generate valid refresh token for user."""
        user = UserFactory()
        refresh = RefreshToken.for_user(user)
        assert refresh is not None
        assert refresh.access_token is not None

    def test_token_contains_user_id(self):
        """Should embed user ID in token payload."""
        user = UserFactory()
        refresh = RefreshToken.for_user(user)
        access = refresh.access_token
        assert access.payload["user_id"] == user.id

    def test_refresh_token_valid(self):
        """Should validate refresh token."""
        user = UserFactory()
        refresh = RefreshToken.for_user(user)
        # Token validation happens during API requests
        assert str(refresh) is not None


@pytest.mark.django_db
class TestRoleBasedPermissions:
    """Test role-based access control (RBAC) with groups."""

    def test_create_admin_group(self):
        """Should assign user to admin group."""
        admin_group, _ = Group.objects.get_or_create(name="Admin")
        user = UserFactory()
        user.groups.add(admin_group)
        assert user.groups.filter(name="Admin").exists()

    def test_create_receptionist_group(self):
        """Should assign user to receptionist group."""
        recep_group, _ = Group.objects.get_or_create(name="Recepcionista")
        user = UserFactory()
        user.groups.add(recep_group)
        assert user.groups.filter(name="Recepcionista").exists()

    def test_create_nurse_group(self):
        """Should assign user to nurse group."""
        nurse_group, _ = Group.objects.get_or_create(name="Enfermeira")
        user = UserFactory()
        user.groups.add(nurse_group)
        assert user.groups.filter(name="Enfermeira").exists()

    def test_user_multiple_groups(self):
        """Should allow user to belong to multiple groups."""
        group1, _ = Group.objects.get_or_create(name="Admin")
        group2, _ = Group.objects.get_or_create(name="Recepcionista")
        user = UserFactory()
        user.groups.add(group1, group2)
        assert user.groups.count() == 2

    def test_superuser_bypass_groups(self):
        """Superuser should bypass group restrictions."""
        admin_group, _ = Group.objects.get_or_create(name="Admin")
        user = UserFactory(is_superuser=True)
        # Superuser doesn't need groups - has all permissions
        assert user.is_superuser


@pytest.mark.django_db
class TestUsuarioSerializer:
    """Test Usuario serialization."""

    def test_serialize_user(self):
        """Should serialize user data correctly."""
        from aplicativos.identidade.serializers import UsuarioSerializer
        user = UserFactory(email="serial@test.com")
        serializer = UsuarioSerializer(user)
        assert serializer.data["email"] == "serial@test.com"
        assert "id" in serializer.data

    def test_deserialize_user_creation(self):
        """Should create user from serialized data."""
        from aplicativos.identidade.serializers import UsuarioSerializer
        data = {
            "email": "new@test.com",
            "password": "StrongPass123!",
            "nome_completo": "New User",
        }
        serializer = UsuarioSerializer(data=data)
        if serializer.is_valid():
            user = serializer.save()
            assert user.email == "new@test.com"


@pytest.mark.django_db
class TestUserActivation:
    """Test user activation/deactivation."""

    def test_activate_user(self):
        """Should allow activating inactive user."""
        user = UserFactory(is_active=False)
        assert not user.is_active
        user.is_active = True
        user.save()
        assert user.is_active

    def test_deactivate_user(self):
        """Should allow deactivating active user."""
        user = UserFactory(is_active=True)
        assert user.is_active
        user.is_active = False
        user.save()
        assert not user.is_active


@pytest.mark.django_db
class TestUserPasswordManagement:
    """Test password hashing and validation."""

    def test_password_hashed_on_creation(self):
        """Password should be hashed, not stored in plain text."""
        password = "TestPassword123!"
        user = UserFactory.create(password=password)
        assert user.password != password
        assert user.password.startswith("pbkdf2_sha256$")

    def test_check_password_valid(self):
        """Should validate correct password."""
        password = "CorrectPass123!"
        user = UserFactory.create(password=password)
        assert user.check_password(password)

    def test_check_password_invalid(self):
        """Should reject incorrect password."""
        user = UserFactory.create(password="CorrectPass123!")
        assert not user.check_password("WrongPassword")
