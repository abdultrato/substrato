from __future__ import annotations

import importlib

from substrato_os.domain_modules import (
    DOMAIN_APP_CONFIGS_FROM_GROUPS,
    DOMAIN_MODULES,
    DOMAIN_MODULES_BY_KEY,
    INSTALLED_DOMAIN_APP_CONFIGS,
    ModuleImplementationStatus,
    active_module_definitions,
    module_definition_for,
    planned_module_definitions,
    register_domain_modules,
)
from substrato_os.modules import ModuleRegistry


def test_domain_app_configs_cover_installed_configs_without_duplicates() -> None:
    assert len(INSTALLED_DOMAIN_APP_CONFIGS) == len(set(INSTALLED_DOMAIN_APP_CONFIGS))
    assert set(DOMAIN_APP_CONFIGS_FROM_GROUPS) == set(INSTALLED_DOMAIN_APP_CONFIGS)


def test_domain_app_configs_preserve_django_local_apps_order() -> None:
    settings = importlib.import_module("platform.settings")

    assert settings.LOCAL_APPS == list(INSTALLED_DOMAIN_APP_CONFIGS)


def test_requested_health_modules_resolve_to_existing_apps_or_planned_gaps() -> None:
    expected_existing = {
        "identity": "apps.identity.apps.IdentityConfig",
        "tenants": "apps.tenants.apps.TenantsConfig",
        "users": "apps.identity.apps.IdentityConfig",
        "permissions": "apps.identity.apps.IdentityConfig",
        "patients": "apps.clinical.apps.ClinicalConfig",
        "appointments": "apps.consultations.apps.ConsultationsConfig",
        "encounters": "apps.consultations.apps.ConsultationsConfig",
        "electronic_health_records": "apps.medical_records.apps.MedicalRecordsConfig",
        "dentistry": "apps.dental.apps.DentalConfig",
        "laboratory": "apps.clinical.apps.ClinicalConfig",
        "blood_bank": "apps.bloodbank.apps.BloodBankConfig",
        "finance": "apps.accounting.apps.AccountingConfig",
        "insurance": "apps.insurer.apps.InsurerConfig",
        "payroll": "apps.human_resources.apps.HumanResourcesConfig",
        "reporting": None,
    }

    for lookup, app_config in expected_existing.items():
        definition = module_definition_for(lookup)
        assert definition.status in {
            ModuleImplementationStatus.IMPLEMENTED,
            ModuleImplementationStatus.PARTIAL,
        }
        assert definition.app_config == app_config


def test_planned_modules_capture_requested_gaps() -> None:
    planned_keys = {definition.key for definition in planned_module_definitions()}

    assert {
        "clinical.pediatrics",
        "clinical.cardiology",
        "clinical.orthopedics",
        "clinical.ophthalmology",
        "clinical.dermatology",
        "clinical.neurology",
        "clinical.oncology",
        "hospitalization.emergency",
        "hospitalization.inpatient_care",
        "hospitalization.intensive_care",
        "care.nutrition",
        "care.psychology",
        "care.social_services",
        "platform.documents",
    }.issubset(planned_keys)


def test_domain_registry_registers_active_modules_only_by_default() -> None:
    registry = ModuleRegistry()

    register_domain_modules(registry)

    assert registry.is_registered("clinical.patients")
    assert registry.is_registered("diagnostics.blood_bank")
    assert registry.is_registered("administration.payroll")
    assert registry.is_registered("analytics.reporting")
    assert not registry.is_registered("clinical.cardiology")


def test_domain_registry_can_include_planned_modules_for_marketplace_catalogs() -> None:
    registry = ModuleRegistry()

    register_domain_modules(registry, include_planned=True)

    assert registry.is_registered("clinical.cardiology")
    assert registry.is_registered("platform.documents")


def test_domain_module_keys_are_unique_and_active_definitions_are_subset() -> None:
    assert len(DOMAIN_MODULES) == len(DOMAIN_MODULES_BY_KEY)
    assert set(active_module_definitions()).issubset(set(DOMAIN_MODULES))
