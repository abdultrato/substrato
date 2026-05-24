from django.apps import apps

from tasks.generate_pdf.pdf_registry import PDF_GENERATORS_REGISTRY


def _domain_app_configs():
    return sorted(
        (config for config in apps.get_app_configs() if config.name.startswith("apps.")),
        key=lambda config: config.name,
    )


def test_default_pdf_generator_produces_valid_pdf_bytes_for_each_domain_app():
    failures = []

    for config in _domain_app_configs():
        models = list(config.get_models())
        if not models:
            continue

        model_cls = models[0]
        generator = PDF_GENERATORS_REGISTRY.get(config.label, "__missing_model__")
        if generator is None:
            failures.append((config.name, "generator_missing"))
            continue

        try:
            obj = model_cls()
            pdf_bytes, filename = generator(obj, request=None)
        except Exception as exc:
            failures.append((config.name, f"exception:{exc}"))
            continue

        if not isinstance(pdf_bytes, (bytes, bytearray)) or not bytes(pdf_bytes).startswith(b"%PDF"):
            failures.append((config.name, "invalid_pdf_signature"))
        if not isinstance(filename, str) or not filename.lower().endswith(".pdf"):
            failures.append((config.name, "invalid_filename"))

    assert not failures, f"Falhas na geração de PDF por app: {failures}"

