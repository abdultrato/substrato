from django.apps import apps

from tasks.generate_pdf.pdf_registry import PDF_GENERATORS_REGISTRY


def _domain_app_configs():
    return sorted(
        (config for config in apps.get_app_configs() if config.name.startswith("apps.")),
        key=lambda config: config.name,
    )


def test_default_pdf_generator_produces_valid_pdf_bytes_for_each_domain_model():
    failures = []

    for config in _domain_app_configs():
        fallback_labels = {config.label, config.name.split(".")[-1]}
        for model_cls in config.get_models():
            for app_label in sorted(fallback_labels):
                generator = PDF_GENERATORS_REGISTRY.get(app_label, "__missing_model__")
                key = f"{app_label}.{model_cls._meta.model_name}"

                if generator is None:
                    failures.append((key, "generator_missing"))
                    continue

                try:
                    obj = model_cls()
                    pdf_bytes, filename = generator(obj, request=None)
                except Exception as exc:
                    failures.append((key, f"exception:{exc}"))
                    continue

                if not isinstance(pdf_bytes, (bytes, bytearray)) or not bytes(pdf_bytes).startswith(b"%PDF"):
                    failures.append((key, "invalid_pdf_signature"))
                if not isinstance(filename, str) or not filename.lower().endswith(".pdf"):
                    failures.append((key, "invalid_filename"))

    assert not failures, f"Falhas na geração de PDF por modelo: {failures}"
