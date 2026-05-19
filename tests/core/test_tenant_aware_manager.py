"""Testes para TenantAwareManager e TenantAwareQuerySet"""


from django.test import TestCase
import pytest

from infrastructure.context.tenant import clear_tenant, set_tenant


@pytest.mark.django_db
class TestTenantAwareManagerIntegration(TestCase):
    """Testes de integração do TenantAwareManager"""

    def setUp(self):
        """Setup para testes"""
        clear_tenant()

    def tearDown(self):
        """Cleanup após testes"""
        clear_tenant()

    def test_tenant_aware_manager_imported(self):
        """TenantAwareManager deve ser importável"""
        from core.orm import TenantAwareManager
        assert TenantAwareManager is not None

    def test_tenant_aware_queryset_imported(self):
        """TenantAwareQuerySet deve ser importável"""
        from core.orm import TenantAwareQuerySet
        assert TenantAwareQuerySet is not None

    def test_tenant_context_get_and_set(self):
        """Contexto de tenant deve ser setável e gettável"""
        from apps.tenants.models import Tenant

        # Criar ou pegar um tenant
        tenant = Tenant.objects.first() or Tenant.objects.create(
            name="Test Tenant",
            identifier="test-tenant"
        )

        set_tenant(tenant)
        from infrastructure.context.tenant import get_tenant

        retrieved = get_tenant()
        assert retrieved == tenant
