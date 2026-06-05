from __future__ import annotations

import importlib

from substrato_os.domain_modules import (
    DOMAIN_APP_CONFIGS_BY_GROUP,
    DOMAIN_APP_CONFIGS_FROM_GROUPS,
    DOMAIN_MODULE_KEYS_BY_DOMAIN,
    DOMAIN_MODULES,
    DOMAIN_MODULES_BY_KEY,
    INSTALLED_DOMAIN_APP_CONFIGS,
    ModuleImplementationStatus,
    active_module_definitions,
    module_definition_for,
    module_definitions_for_domain,
    planned_module_definitions,
    register_domain_modules,
)
from substrato_os.modules import ModuleRegistry


def test_domain_app_configs_cover_installed_configs_without_duplicates() -> None:
    assert len(INSTALLED_DOMAIN_APP_CONFIGS) == len(set(INSTALLED_DOMAIN_APP_CONFIGS))
    assert set(DOMAIN_APP_CONFIGS_FROM_GROUPS) == set(INSTALLED_DOMAIN_APP_CONFIGS)


def test_domain_app_groups_cover_requested_organization() -> None:
    assert {
        "clinical",
        "diagnostics",
        "hospitalization",
        "administration",
        "platform",
    }.issubset(DOMAIN_APP_CONFIGS_BY_GROUP)
    assert "apps.consultations.apps.ConsultationsConfig" in DOMAIN_APP_CONFIGS_BY_GROUP["clinical"]
    assert "apps.clinical.apps.ClinicalConfig" in DOMAIN_APP_CONFIGS_BY_GROUP["diagnostics"]
    assert "apps.nursing.apps.NursingConfig" in DOMAIN_APP_CONFIGS_BY_GROUP["hospitalization"]


def test_domain_app_configs_preserve_django_local_apps_order() -> None:
    settings = importlib.import_module("platform.settings")

    assert settings.LOCAL_APPS == list(INSTALLED_DOMAIN_APP_CONFIGS)


def test_requested_health_modules_resolve_to_existing_apps_or_planned_gaps() -> None:
    expected_modules = {
        "identity": "apps.identity.apps.IdentityConfig",
        "tenants": "apps.tenants.apps.TenantsConfig",
        "users": "apps.identity.apps.IdentityConfig",
        "permissions": "apps.identity.apps.IdentityConfig",
        "patients": "apps.clinical.apps.ClinicalConfig",
        "appointments": "apps.consultations.apps.ConsultationsConfig",
        "encounters": "apps.consultations.apps.ConsultationsConfig",
        "electronic_health_records": "apps.medical_records.apps.MedicalRecordsConfig",
        "dentistry": "apps.dental.apps.DentalConfig",
        "surgery": "apps.surgery.apps.SurgeryConfig",
        "pediatrics": "apps.consultations.apps.ConsultationsConfig",
        "gynecology": "apps.maternity.apps.MaternityConfig",
        "obstetrics": "apps.maternity.apps.MaternityConfig",
        "cardiology": "apps.consultations.apps.ConsultationsConfig",
        "orthopedics": "apps.consultations.apps.ConsultationsConfig",
        "ophthalmology": "apps.consultations.apps.ConsultationsConfig",
        "dermatology": "apps.consultations.apps.ConsultationsConfig",
        "neurology": "apps.consultations.apps.ConsultationsConfig",
        "oncology": "apps.consultations.apps.ConsultationsConfig",
        "pathology": "apps.pathology.apps.PathologyConfig",
        "laboratory": "apps.clinical.apps.ClinicalConfig",
        "radiology": "apps.radiology.apps.RadiologyConfig",
        "pharmacy": "apps.pharmacy.apps.PharmacyConfig",
        "blood_bank": "apps.bloodbank.apps.BloodBankConfig",
        "emergency": "apps.reception.apps.ReceptionConfig",
        "inpatient_care": "apps.nursing.apps.NursingConfig",
        "intensive_care": "apps.nursing.apps.NursingConfig",
        "operating_room": "apps.surgery.apps.SurgeryConfig",
        "nursing": "apps.nursing.apps.NursingConfig",
        "nutrition": None,
        "psychology": None,
        "physiotherapy": "apps.physiotherapy.apps.PhysiotherapyConfig",
        "social_services": None,
        "inventory": "apps.warehouse.apps.WarehouseConfig",
        "procurement": "apps.warehouse.apps.WarehouseConfig",
        "finance": "apps.accounting.apps.AccountingConfig",
        "billing": "apps.billing.apps.BillingConfig",
        "insurance": "apps.insurer.apps.InsurerConfig",
        "human_resources": "apps.human_resources.apps.HumanResourcesConfig",
        "payroll": "apps.human_resources.apps.HumanResourcesConfig",
        "analytics": "apps.monitoring.apps.MonitoringConfig",
        "reporting": None,
        "auditing": "apps.audit_activities.apps.AuditActivitiesConfig",
        "notifications": "apps.notifications.apps.NotificationsConfig",
        "documents": None,
        "integrations": "apps.equipment_integrations.apps.EquipmentIntegrationsConfig",
        "public_health": "apps.public_health.apps.PublicHealthConfig",
    }

    for lookup, app_config in expected_modules.items():
        definition = module_definition_for(lookup)
        assert definition.key in DOMAIN_MODULES_BY_KEY
        assert definition.app_config == app_config


def test_planned_modules_capture_remaining_requested_gaps() -> None:
    planned_keys = {definition.key for definition in planned_module_definitions()}

    assert {
        "care.nutrition",
        "care.psychology",
        "care.social_services",
        "platform.documents",
    }.issubset(planned_keys)
    assert "clinical.cardiology" not in planned_keys
    assert "hospitalization.inpatient_care" not in planned_keys


def test_partial_modules_reuse_existing_base_modules() -> None:
    cardiology = module_definition_for("cardiology")
    assert cardiology.status is ModuleImplementationStatus.PARTIAL
    assert cardiology.extends == (
        "clinical.appointments",
        "clinical.electronic_health_records",
        "diagnostics.specialty_diagnostics",
    )
    assert cardiology.runtime_dependencies == (
        "clinical.appointments",
        "clinical.electronic_health_records",
        "diagnostics.specialty_diagnostics",
        "clinical.patients",
    )
    assert cardiology.to_manifest().dependencies == cardiology.runtime_dependencies

    inpatient = module_definition_for("inpatient_care")
    assert inpatient.status is ModuleImplementationStatus.PARTIAL
    assert inpatient.extends == ("care.nursing",)


def test_domain_module_groups_expose_requested_module_layout() -> None:
    assert {
        "clinical.dentistry",
        "clinical.surgery",
        "clinical.pediatrics",
        "clinical.gynecology",
        "clinical.pathology",
    }.issubset(set(DOMAIN_MODULE_KEYS_BY_DOMAIN["clinical"]))
    assert {
        "diagnostics.laboratory",
        "diagnostics.radiology",
        "diagnostics.blood_bank",
    }.issubset(set(DOMAIN_MODULE_KEYS_BY_DOMAIN["diagnostics"]))
    assert {
        "hospitalization.emergency",
        "hospitalization.inpatient_care",
        "hospitalization.intensive_care",
        "hospitalization.operating_room",
    }.issubset(set(DOMAIN_MODULE_KEYS_BY_DOMAIN["hospitalization"]))
    assert {
        "administration.finance",
        "administration.billing",
        "administration.insurance",
        "administration.human_resources",
    }.issubset(set(DOMAIN_MODULE_KEYS_BY_DOMAIN["administration"]))
    assert {
        "platform.identity",
        "platform.permissions",
        "platform.auditing",
        "platform.notifications",
        "platform.integrations",
    }.issubset(set(DOMAIN_MODULE_KEYS_BY_DOMAIN["platform"]))


def test_domain_definition_lookup_can_filter_planned_modules() -> None:
    all_care_keys = {definition.key for definition in module_definitions_for_domain("care")}
    active_care_keys = {definition.key for definition in module_definitions_for_domain("care", include_planned=False)}

    assert "care.nutrition" in all_care_keys
    assert "care.nutrition" not in active_care_keys


def test_domain_registry_registers_active_modules_only_by_default() -> None:
    registry = ModuleRegistry()

    register_domain_modules(registry)

    assert registry.is_registered("clinical.patients")
    assert registry.is_registered("diagnostics.blood_bank")
    assert registry.is_registered("administration.payroll")
    assert registry.is_registered("analytics.reporting")
    assert registry.is_registered("clinical.cardiology")
    assert registry.is_registered("hospitalization.inpatient_care")
    assert not registry.is_registered("care.nutrition")


def test_domain_registry_can_include_planned_modules_for_marketplace_catalogs() -> None:
    registry = ModuleRegistry()

    register_domain_modules(registry, include_planned=True)

    assert registry.is_registered("care.nutrition")
    assert registry.is_registered("platform.documents")


def test_domain_module_keys_are_unique_and_active_definitions_are_subset() -> None:
    assert len(DOMAIN_MODULES) == len(DOMAIN_MODULES_BY_KEY)
    assert set(active_module_definitions()).issubset(set(DOMAIN_MODULES))
