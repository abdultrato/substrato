from django.contrib import admin
from django.contrib.auth import get_user_model
from django.test import RequestFactory
import pytest

from apps.tenants.models.tenant import Tenant
from tasks.generate_pdf.pdf_admin_mixin import SimplePDFAdminMixin
from tasks.generate_pdf.pdf_registry import PDF_GENERATORS_REGISTRY


def _simple_pdf_admin_entries():
    entries = []
    for model, model_admin in admin.site._registry.items():
        if isinstance(model_admin, SimplePDFAdminMixin):
            entries.append((model, model_admin))
    return entries


def _tenant():
    return Tenant.objects.create(
        identifier="tn-pdf-admin-registry",
        name="Tenant PDF Admin Registry",
        domain="pdf-admin-registry.local",
        active=True,
    )


def _superuser(tenant: Tenant):
    user_model = get_user_model()
    user = user_model.objects.create_user(
        username="admin_pdf_registry",
        email="admin-pdf-registry@example.com",
        password="testpass123",
        tenant=tenant,
    )
    user.is_staff = True
    user.is_superuser = True
    user.save(update_fields=["is_staff", "is_superuser"])
    return user


@pytest.mark.django_db
def test_simple_pdf_admin_models_have_resolved_generators():
    missing = []
    entries = _simple_pdf_admin_entries()
    assert entries, "Nenhum ModelAdmin com SimplePDFAdminMixin encontrado."

    for model, _model_admin in entries:
        key = f"{model._meta.app_label}.{model._meta.model_name}"
        generator = PDF_GENERATORS_REGISTRY.get(key)
        if generator is None:
            missing.append(key)

    assert not missing, f"ModelAdmin sem gerador de PDF resolvido: {missing}"


def test_simple_pdf_admin_models_resolve_expected_specific_generators():
    entries = {f"{model._meta.app_label}.{model._meta.model_name}": model_admin for model, model_admin in _simple_pdf_admin_entries()}

    expected_modules = {
        "clinical.labrequest": "tasks.generate_pdf.pdf_registry",
        "clinical.result": "tasks.generate_pdf.pdf_registry",
        "enfermagem.procedure": "tasks.generate_pdf.procedure_pdf_generator",
    }

    for key, expected_module in expected_modules.items():
        assert key in entries, f"ModelAdmin esperado não registrado: {key}"
        generator = PDF_GENERATORS_REGISTRY.get(key)
        assert generator is not None, f"Gerador não encontrado para {key}"
        assert generator.__module__ == expected_module


@pytest.mark.django_db
def test_simple_pdf_admin_actions_are_available_without_preloaded_generator():
    tenant = _tenant()
    user = _superuser(tenant)
    request = RequestFactory().get("/admin/test/")
    request.user = user

    for model, model_admin in _simple_pdf_admin_entries():
        model_admin.pdf_generator = None
        actions = model_admin.get_actions(request)
        key = f"{model._meta.app_label}.{model._meta.model_name}"
        assert "download_pdf_action" in actions, f"Ação de PDF ausente para {key}"
        assert model_admin.pdf_generator is None
