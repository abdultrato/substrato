from django.contrib import admin

from tasks.generate_pdf.pdf_admin_mixin import SimplePDFAdminMixin
from tasks.generate_pdf.pdf_registry import PDF_GENERATORS_REGISTRY


def _simple_pdf_admin_entries():
    entries = []
    for model, model_admin in admin.site._registry.items():
        if isinstance(model_admin, SimplePDFAdminMixin):
            entries.append((model, model_admin))
    return entries


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
