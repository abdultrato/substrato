from pathlib import Path

from django.apps import apps

from tasks.generate_pdf.pdf_registry import PDF_GENERATORS_REGISTRY


def _domain_app_configs():
    return sorted(
        (config for config in apps.get_app_configs() if config.name.startswith("apps.")),
        key=lambda config: config.name,
    )


def _apps_dir_names():
    apps_dir = Path(__file__).resolve().parents[1] / "apps"
    return sorted(
        path.name
        for path in apps_dir.iterdir()
        if path.is_dir() and not path.name.startswith("__")
    )


def test_pdf_registry_has_default_generator_for_every_domain_app_dir():
    missing = []
    for app_dir_name in _apps_dir_names():
        generator = PDF_GENERATORS_REGISTRY.get(app_dir_name, "__missing_model__")
        if generator is None:
            missing.append(app_dir_name)

    assert not missing, f"Apps sem fallback de PDF no registry: {missing}"


def test_pdf_registry_resolves_all_models_using_runtime_app_labels():
    unresolved = []
    for config in _domain_app_configs():
        for model in config.get_models():
            runtime_key = f"{config.label}.{model._meta.model_name}"
            runtime_generator = PDF_GENERATORS_REGISTRY.get(runtime_key)
            if runtime_generator is None:
                unresolved.append(runtime_key)

            module_app_label = config.name.split(".")[-1]
            module_key = f"{module_app_label}.{model._meta.model_name}"
            module_generator = PDF_GENERATORS_REGISTRY.get(module_key)
            if module_generator is None:
                unresolved.append(module_key)

    assert not unresolved, (
        "Models sem resolução de gerador PDF via label runtime: "
        f"{unresolved}"
    )


def test_pdf_registry_has_default_for_runtime_and_module_labels():
    missing_defaults = []
    for config in _domain_app_configs():
        runtime_generator = PDF_GENERATORS_REGISTRY.get(config.label, "__missing_model__")
        if runtime_generator is None:
            missing_defaults.append(f"{config.label}.__default__")

        module_app_label = config.name.split(".")[-1]
        module_generator = PDF_GENERATORS_REGISTRY.get(module_app_label, "__missing_model__")
        if module_generator is None:
            missing_defaults.append(f"{module_app_label}.__default__")

    assert not missing_defaults, (
        "Apps sem fallback __default__ para label runtime/módulo: "
        f"{missing_defaults}"
    )
