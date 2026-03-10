"""
Configuração global do pytest
"""
import os
import django
from django.conf import settings

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'plataforma.settings.development')
django.setup()

import pytest
from django.test.utils import setup_test_environment, teardown_test_environment
from django.db import connection
from django.test.runner import DiscoverRunner


@pytest.fixture(scope='session', autouse=True)
def django_db_setup():
    """Setup test database"""
    setup_test_environment()
    runner = DiscoverRunner(verbosity=0, interactive=False, keepdb=False)
    runner.setup_test_environment()
    old_config = runner.setup_databases()
    yield
    runner.teardown_databases(old_config)
    teardown_test_environment()


@pytest.fixture
def django_db_marked(db):
    """Mark test as using database"""
    return db


@pytest.fixture
def api_client():
    """Django REST API client"""
    from rest_framework.test import APIClient
    return APIClient()


@pytest.fixture
def authenticated_client(api_client):
    """API client with authenticated user"""
    from django.contrib.auth.models import User
    user = User.objects.create_user(
        username='testuser',
        email='test@example.com',
        password='testpass123'
    )
    api_client.force_authenticate(user=user)
    return api_client


@pytest.fixture
def sample_user():
    """Create a sample user for testing"""
    from django.contrib.auth.models import User
    return User.objects.create_user(
        username='sampleuser',
        email='sample@example.com',
        password='samplepass123'
    )
