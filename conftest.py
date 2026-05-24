"""Configuração global do pytest."""

import os
from pathlib import Path

import django
from django.conf import settings
from django.contrib.auth import get_user_model
from django.db.backends.base.creation import BaseDatabaseCreation
import pytest

import sitecustomize  # noqa: F401

# Setup Django (pytest-django will manage DB lifecycle)
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "plataforma.settings.development")


def _skip_test_db_serialize(self):
    return ""


BaseDatabaseCreation.serialize_db_to_string = _skip_test_db_serialize

django.setup()


def _ensure_static_root_dir() -> None:
    static_root = getattr(settings, "STATIC_ROOT", None)
    if not static_root:
        return
    Path(static_root).mkdir(parents=True, exist_ok=True)


_ensure_static_root_dir()


@pytest.fixture
def api_client():
    """Django REST API client"""
    from rest_framework.test import APIClient

    return APIClient()


@pytest.fixture
def authenticated_client(api_client):
    """API client with authenticated user"""
    User = get_user_model()
    user = User.objects.create_user(
        username="testuser",
        email="test@example.com",
        password="testpass123",
        name="Test User",
    )
    api_client.force_authenticate(user=user)
    return api_client


@pytest.fixture
def sample_user():
    """Create a sample user for testing"""
    User = get_user_model()
    return User.objects.create_user(
        username="sampleuser",
        email="sample@example.com",
        password="samplepass123",
        name="Sample User",
    )
