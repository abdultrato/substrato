"""
Configuração global do pytest
"""
import os
import django
import pytest
from django.contrib.auth import get_user_model

# Setup Django (pytest-django will manage DB lifecycle)
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "plataforma.settings.development")
django.setup()


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
        nome="Test User",
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
        nome="Sample User",
    )
