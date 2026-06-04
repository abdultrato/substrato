from __future__ import annotations

from collections.abc import Iterable
from dataclasses import dataclass
from enum import StrEnum

from .modules import MODULE_KEY_PATTERN, ModuleManifest, ModuleRegistry


class ModuleImplementationStatus(StrEnum):
    IMPLEMENTED = "implemented"
    PARTIAL = "partial"
    PLANNED = "planned"


ACTIVE_MODULE_STATUSES = {
    ModuleImplementationStatus.IMPLEMENTED,
    ModuleImplementationStatus.PARTIAL,
}


@dataclass(frozen=True, slots=True)
class DomainModuleDefinition:
    key: str
    domain: str
    description: str
    app_config: str | None = None
    implementation_path: str | None = None
    dependencies: tuple[str, ...] = ()
    aliases: tuple[str, ...] = ()
    status: ModuleImplementationStatus = ModuleImplementationStatus.IMPLEMENTED
    version: str = "1.0.0"

    def __post_init__(self) -> None:
        if not MODULE_KEY_PATTERN.fullmatch(self.key):
            raise ValueError(f"Invalid module key: {self.key}")
        for dependency in self.dependencies:
            if not MODULE_KEY_PATTERN.fullmatch(dependency):
                raise ValueError(f"Invalid dependency key for {self.key}: {dependency}")

    @property
    def is_active(self) -> bool:
        return self.status in ACTIVE_MODULE_STATUSES

    def to_manifest(self) -> ModuleManifest:
        return ModuleManifest(
            key=self.key,
            version=self.version,
            description=self.description,
            dependencies=self.dependencies,
            permissions=(f"{self.key}:read", f"{self.key}:write"),
        )


INSTALLED_DOMAIN_APP_CONFIGS = (
    "apps.identity.apps.IdentityConfig",
    "apps.insurer.apps.InsurerConfig",
    "apps.external_entities.apps.ExternalEntitiesConfig",
    "apps.clinical.apps.ClinicalConfig",
    "apps.dental.apps.DentalConfig",
    "apps.veterinary.apps.VeterinaryConfig",
    "apps.physiotherapy.apps.PhysiotherapyConfig",
    "apps.pathology.apps.PathologyConfig",
    "apps.radiology.apps.RadiologyConfig",
    "apps.therapy.apps.TherapyConfig",
    "apps.specialty_diagnostics.apps.SpecialtyDiagnosticsConfig",
    "apps.clinical_pharmacy.apps.ClinicalPharmacyConfig",
    "apps.credit_financing.apps.CreditFinancingConfig",
    "apps.telemedicine.apps.TelemedicineConfig",
    "apps.public_health.apps.PublicHealthConfig",
    "apps.nursing.apps.NursingConfig",
    "apps.equipment_integrations.apps.EquipmentIntegrationsConfig",
    "apps.equipment.apps.EquipmentConfig",
    "apps.inspections.apps.InspectionsConfig",
    "apps.maintenance.apps.MaintenanceConfig",
    "apps.incidents.apps.IncidentsConfig",
    "apps.billing.apps.BillingConfig",
    "apps.payments.apps.PaymentsConfig",
    "apps.notifications.apps.NotificationsConfig",
    "apps.tenants.apps.TenantsConfig",
    "apps.pharmacy.apps.PharmacyConfig",
    "apps.warehouse.apps.WarehouseConfig",
    "apps.bloodbank.apps.BloodBankConfig",
    "apps.accounting.apps.AccountingConfig",
    "apps.reception.apps.ReceptionConfig",
    "apps.audit_activities.apps.AuditActivitiesConfig",
    "apps.consultations.apps.ConsultationsConfig",
    "apps.medical_records.apps.MedicalRecordsConfig",
    "apps.maternity.apps.MaternityConfig",
    "apps.surgery.apps.SurgeryConfig",
    "apps.human_resources.apps.HumanResourcesConfig",
    "apps.monitoring.apps.MonitoringConfig",
    "apps.ai_assistant.apps.AiAssistantConfig",
    "apps.education.apps.EducationConfig",
    "apps.transportation.apps.TransportationConfig",
)


DOMAIN_APP_GROUPS: dict[str, tuple[str, ...]] = {
    "platform": (
        "apps.identity.apps.IdentityConfig",
        "apps.tenants.apps.TenantsConfig",
        "apps.notifications.apps.NotificationsConfig",
        "apps.audit_activities.apps.AuditActivitiesConfig",
        "apps.monitoring.apps.MonitoringConfig",
        "apps.ai_assistant.apps.AiAssistantConfig",
        "apps.education.apps.EducationConfig",
        "apps.external_entities.apps.ExternalEntitiesConfig",
        "apps.equipment_integrations.apps.EquipmentIntegrationsConfig",
    ),
    "clinical": (
        "apps.clinical.apps.ClinicalConfig",
        "apps.dental.apps.DentalConfig",
        "apps.veterinary.apps.VeterinaryConfig",
        "apps.physiotherapy.apps.PhysiotherapyConfig",
        "apps.therapy.apps.TherapyConfig",
        "apps.telemedicine.apps.TelemedicineConfig",
        "apps.public_health.apps.PublicHealthConfig",
        "apps.nursing.apps.NursingConfig",
        "apps.reception.apps.ReceptionConfig",
        "apps.consultations.apps.ConsultationsConfig",
        "apps.medical_records.apps.MedicalRecordsConfig",
        "apps.maternity.apps.MaternityConfig",
        "apps.surgery.apps.SurgeryConfig",
    ),
    "diagnostics": (
        "apps.pathology.apps.PathologyConfig",
        "apps.radiology.apps.RadiologyConfig",
        "apps.specialty_diagnostics.apps.SpecialtyDiagnosticsConfig",
        "apps.clinical_pharmacy.apps.ClinicalPharmacyConfig",
        "apps.bloodbank.apps.BloodBankConfig",
    ),
    "administration": (
        "apps.insurer.apps.InsurerConfig",
        "apps.credit_financing.apps.CreditFinancingConfig",
        "apps.billing.apps.BillingConfig",
        "apps.payments.apps.PaymentsConfig",
        "apps.accounting.apps.AccountingConfig",
        "apps.human_resources.apps.HumanResourcesConfig",
    ),
    "operations": (
        "apps.equipment.apps.EquipmentConfig",
        "apps.inspections.apps.InspectionsConfig",
        "apps.maintenance.apps.MaintenanceConfig",
        "apps.incidents.apps.IncidentsConfig",
        "apps.pharmacy.apps.PharmacyConfig",
        "apps.warehouse.apps.WarehouseConfig",
        "apps.transportation.apps.TransportationConfig",
    ),
}


DOMAIN_MODULES = (
    DomainModuleDefinition(
        key="platform.tenants",
        domain="platform",
        app_config="apps.tenants.apps.TenantsConfig",
        description="Tenant, subscription, usage and feature flag configuration.",
        aliases=("tenants", "tenant"),
    ),
    DomainModuleDefinition(
        key="platform.identity",
        domain="platform",
        app_config="apps.identity.apps.IdentityConfig",
        description="Authentication, users and professional profiles.",
        dependencies=("platform.tenants",),
        aliases=("identity", "identidade"),
    ),
    DomainModuleDefinition(
        key="platform.users",
        domain="platform",
        app_config="apps.identity.apps.IdentityConfig",
        description="User management exposed by the identity app.",
        dependencies=("platform.identity",),
        aliases=("users", "user"),
    ),
    DomainModuleDefinition(
        key="platform.permissions",
        domain="platform",
        app_config="apps.identity.apps.IdentityConfig",
        implementation_path="security.permissions.rbac",
        description="RBAC policies and permission checks.",
        dependencies=("platform.identity",),
        aliases=("permissions", "rbac"),
    ),
    DomainModuleDefinition(
        key="platform.auditing",
        domain="platform",
        app_config="apps.audit_activities.apps.AuditActivitiesConfig",
        description="System activity audit trail.",
        dependencies=("platform.identity",),
        aliases=("auditing", "audit"),
    ),
    DomainModuleDefinition(
        key="platform.notifications",
        domain="platform",
        app_config="apps.notifications.apps.NotificationsConfig",
        description="Notification dispatch and channel configuration.",
        dependencies=("platform.tenants",),
        aliases=("notifications",),
    ),
    DomainModuleDefinition(
        key="platform.integrations",
        domain="platform",
        app_config="apps.equipment_integrations.apps.EquipmentIntegrationsConfig",
        implementation_path="integrations",
        description="External and equipment integration adapters.",
        dependencies=("platform.tenants",),
        aliases=("integrations",),
    ),
    DomainModuleDefinition(
        key="platform.external_entities",
        domain="platform",
        app_config="apps.external_entities.apps.ExternalEntitiesConfig",
        description="Internal and external organization entities.",
        dependencies=("platform.tenants",),
        aliases=("external_entities",),
    ),
    DomainModuleDefinition(
        key="platform.documents",
        domain="platform",
        description="Document management and reusable file workflows.",
        dependencies=("platform.tenants",),
        aliases=("documents",),
        status=ModuleImplementationStatus.PLANNED,
    ),
    DomainModuleDefinition(
        key="clinical.patients",
        domain="clinical",
        app_config="apps.clinical.apps.ClinicalConfig",
        description="Patient demographics, contacts and clinical identifiers.",
        dependencies=("platform.tenants",),
        aliases=("patients", "pacientes"),
    ),
    DomainModuleDefinition(
        key="clinical.appointments",
        domain="clinical",
        app_config="apps.consultations.apps.ConsultationsConfig",
        description="Appointment and medical consultation scheduling.",
        dependencies=("clinical.patients",),
        aliases=("appointments", "consultations"),
    ),
    DomainModuleDefinition(
        key="clinical.encounters",
        domain="clinical",
        app_config="apps.consultations.apps.ConsultationsConfig",
        description="Clinical encounters backed by consultation records.",
        dependencies=("clinical.patients",),
        aliases=("encounters",),
        status=ModuleImplementationStatus.PARTIAL,
    ),
    DomainModuleDefinition(
        key="clinical.electronic_health_records",
        domain="clinical",
        app_config="apps.medical_records.apps.MedicalRecordsConfig",
        description="Electronic health record entries and prescription items.",
        dependencies=("clinical.patients", "clinical.encounters"),
        aliases=("electronic_health_records", "ehr", "medical_records"),
    ),
    DomainModuleDefinition(
        key="clinical.dentistry",
        domain="clinical",
        app_config="apps.dental.apps.DentalConfig",
        description="Dentistry procedures and treatment plans.",
        dependencies=("clinical.patients",),
        aliases=("dentistry", "dental"),
    ),
    DomainModuleDefinition(
        key="clinical.surgery",
        domain="clinical",
        app_config="apps.surgery.apps.SurgeryConfig",
        description="Surgery procedures, rooms and operative reports.",
        dependencies=("clinical.patients", "clinical.electronic_health_records"),
        aliases=("surgery",),
    ),
    DomainModuleDefinition(
        key="clinical.gynecology",
        domain="clinical",
        app_config="apps.maternity.apps.MaternityConfig",
        description="Gynecology workflows represented through maternity records.",
        dependencies=("clinical.patients",),
        aliases=("gynecology",),
        status=ModuleImplementationStatus.PARTIAL,
    ),
    DomainModuleDefinition(
        key="clinical.obstetrics",
        domain="clinical",
        app_config="apps.maternity.apps.MaternityConfig",
        description="Obstetrics, maternity and neonatology workflows.",
        dependencies=("clinical.patients",),
        aliases=("obstetrics", "maternity"),
    ),
    DomainModuleDefinition(
        key="clinical.pediatrics",
        domain="clinical",
        description="Pediatric care workflows.",
        dependencies=("clinical.patients",),
        aliases=("pediatrics",),
        status=ModuleImplementationStatus.PLANNED,
    ),
    DomainModuleDefinition(
        key="clinical.cardiology",
        domain="clinical",
        description="Cardiology specialty workflows.",
        dependencies=("clinical.patients",),
        aliases=("cardiology",),
        status=ModuleImplementationStatus.PLANNED,
    ),
    DomainModuleDefinition(
        key="clinical.orthopedics",
        domain="clinical",
        description="Orthopedics specialty workflows.",
        dependencies=("clinical.patients",),
        aliases=("orthopedics",),
        status=ModuleImplementationStatus.PLANNED,
    ),
    DomainModuleDefinition(
        key="clinical.ophthalmology",
        domain="clinical",
        description="Ophthalmology specialty workflows.",
        dependencies=("clinical.patients",),
        aliases=("ophthalmology",),
        status=ModuleImplementationStatus.PLANNED,
    ),
    DomainModuleDefinition(
        key="clinical.dermatology",
        domain="clinical",
        description="Dermatology specialty workflows.",
        dependencies=("clinical.patients",),
        aliases=("dermatology",),
        status=ModuleImplementationStatus.PLANNED,
    ),
    DomainModuleDefinition(
        key="clinical.neurology",
        domain="clinical",
        description="Neurology specialty workflows.",
        dependencies=("clinical.patients",),
        aliases=("neurology",),
        status=ModuleImplementationStatus.PLANNED,
    ),
    DomainModuleDefinition(
        key="clinical.oncology",
        domain="clinical",
        description="Oncology specialty workflows.",
        dependencies=("clinical.patients",),
        aliases=("oncology",),
        status=ModuleImplementationStatus.PLANNED,
    ),
    DomainModuleDefinition(
        key="clinical.pathology",
        domain="clinical",
        app_config="apps.pathology.apps.PathologyConfig",
        description="Pathology specialty records.",
        dependencies=("clinical.patients",),
        aliases=("pathology",),
    ),
    DomainModuleDefinition(
        key="clinical.veterinary",
        domain="clinical",
        app_config="apps.veterinary.apps.VeterinaryConfig",
        description="Veterinary care workflows.",
        dependencies=("platform.tenants",),
        aliases=("veterinary",),
    ),
    DomainModuleDefinition(
        key="clinical.telemedicine",
        domain="clinical",
        app_config="apps.telemedicine.apps.TelemedicineConfig",
        description="Telemedicine workflows.",
        dependencies=("clinical.patients", "clinical.appointments"),
        aliases=("telemedicine",),
    ),
    DomainModuleDefinition(
        key="diagnostics.laboratory",
        domain="diagnostics",
        app_config="apps.clinical.apps.ClinicalConfig",
        description="Laboratory exams, requests, samples and results.",
        dependencies=("clinical.patients",),
        aliases=("laboratory", "lab"),
    ),
    DomainModuleDefinition(
        key="diagnostics.radiology",
        domain="diagnostics",
        app_config="apps.radiology.apps.RadiologyConfig",
        description="Radiology exams and imaging workflows.",
        dependencies=("clinical.patients",),
        aliases=("radiology",),
    ),
    DomainModuleDefinition(
        key="diagnostics.blood_bank",
        domain="diagnostics",
        app_config="apps.bloodbank.apps.BloodBankConfig",
        description="Blood bank donation, stock, storage and transfusion workflows.",
        dependencies=("clinical.patients",),
        aliases=("blood_bank", "bloodbank"),
    ),
    DomainModuleDefinition(
        key="diagnostics.specialty_diagnostics",
        domain="diagnostics",
        app_config="apps.specialty_diagnostics.apps.SpecialtyDiagnosticsConfig",
        description="Specialty diagnostic workflows.",
        dependencies=("clinical.patients", "clinical.electronic_health_records"),
        aliases=("specialty_diagnostics",),
    ),
    DomainModuleDefinition(
        key="diagnostics.clinical_pharmacy",
        domain="diagnostics",
        app_config="apps.clinical_pharmacy.apps.ClinicalPharmacyConfig",
        description="Clinical pharmacy support workflows.",
        dependencies=("clinical.electronic_health_records", "operations.pharmacy"),
        aliases=("clinical_pharmacy",),
    ),
    DomainModuleDefinition(
        key="hospitalization.operating_room",
        domain="hospitalization",
        app_config="apps.surgery.apps.SurgeryConfig",
        description="Operating room resources and perioperative records.",
        dependencies=("clinical.surgery",),
        aliases=("operating_room",),
        status=ModuleImplementationStatus.PARTIAL,
    ),
    DomainModuleDefinition(
        key="hospitalization.emergency",
        domain="hospitalization",
        description="Emergency department admission and triage workflows.",
        dependencies=("clinical.patients",),
        aliases=("emergency",),
        status=ModuleImplementationStatus.PLANNED,
    ),
    DomainModuleDefinition(
        key="hospitalization.inpatient_care",
        domain="hospitalization",
        description="Inpatient admission, bed and care workflows.",
        dependencies=("clinical.patients",),
        aliases=("inpatient_care",),
        status=ModuleImplementationStatus.PLANNED,
    ),
    DomainModuleDefinition(
        key="hospitalization.intensive_care",
        domain="hospitalization",
        description="Intensive care unit workflows.",
        dependencies=("clinical.patients", "hospitalization.inpatient_care"),
        aliases=("intensive_care",),
        status=ModuleImplementationStatus.PLANNED,
    ),
    DomainModuleDefinition(
        key="care.nursing",
        domain="care",
        app_config="apps.nursing.apps.NursingConfig",
        description="Nursing procedures, wards, prescriptions and vital signs.",
        dependencies=("clinical.patients", "clinical.electronic_health_records"),
        aliases=("nursing",),
    ),
    DomainModuleDefinition(
        key="care.physiotherapy",
        domain="care",
        app_config="apps.physiotherapy.apps.PhysiotherapyConfig",
        description="Physiotherapy workflows.",
        dependencies=("clinical.patients", "clinical.electronic_health_records"),
        aliases=("physiotherapy",),
    ),
    DomainModuleDefinition(
        key="care.psychology",
        domain="care",
        description="Psychology care workflows.",
        dependencies=("clinical.patients",),
        aliases=("psychology",),
        status=ModuleImplementationStatus.PLANNED,
    ),
    DomainModuleDefinition(
        key="care.nutrition",
        domain="care",
        description="Nutrition care workflows.",
        dependencies=("clinical.patients",),
        aliases=("nutrition",),
        status=ModuleImplementationStatus.PLANNED,
    ),
    DomainModuleDefinition(
        key="care.social_services",
        domain="care",
        description="Social services workflows.",
        dependencies=("clinical.patients",),
        aliases=("social_services",),
        status=ModuleImplementationStatus.PLANNED,
    ),
    DomainModuleDefinition(
        key="care.therapy",
        domain="care",
        app_config="apps.therapy.apps.TherapyConfig",
        description="Therapy care workflows.",
        dependencies=("clinical.patients", "clinical.electronic_health_records"),
        aliases=("therapy",),
    ),
    DomainModuleDefinition(
        key="operations.inventory",
        domain="operations",
        app_config="apps.warehouse.apps.WarehouseConfig",
        description="Inventory and stock operations.",
        dependencies=("platform.tenants",),
        aliases=("inventory", "warehouse"),
    ),
    DomainModuleDefinition(
        key="operations.procurement",
        domain="operations",
        app_config="apps.warehouse.apps.WarehouseConfig",
        implementation_path="apps.warehouse.domain.purchasing",
        description="Procurement and purchasing workflows.",
        dependencies=("operations.inventory",),
        aliases=("procurement", "purchasing"),
        status=ModuleImplementationStatus.PARTIAL,
    ),
    DomainModuleDefinition(
        key="operations.pharmacy",
        domain="operations",
        app_config="apps.pharmacy.apps.PharmacyConfig",
        description="Pharmacy products, lots, sales and stock movement.",
        dependencies=("operations.inventory",),
        aliases=("pharmacy",),
    ),
    DomainModuleDefinition(
        key="operations.equipment",
        domain="operations",
        app_config="apps.equipment.apps.EquipmentConfig",
        description="Equipment registry and operational state.",
        dependencies=("platform.tenants",),
        aliases=("equipment",),
    ),
    DomainModuleDefinition(
        key="operations.maintenance",
        domain="operations",
        app_config="apps.maintenance.apps.MaintenanceConfig",
        description="Equipment maintenance and calibration workflows.",
        dependencies=("operations.equipment",),
        aliases=("maintenance",),
    ),
    DomainModuleDefinition(
        key="operations.inspections",
        domain="operations",
        app_config="apps.inspections.apps.InspectionsConfig",
        description="Safety and maintenance inspections.",
        dependencies=("operations.equipment",),
        aliases=("inspections",),
    ),
    DomainModuleDefinition(
        key="operations.incidents",
        domain="operations",
        app_config="apps.incidents.apps.IncidentsConfig",
        description="Incident reporting and follow-up.",
        dependencies=("platform.tenants",),
        aliases=("incidents",),
    ),
    DomainModuleDefinition(
        key="operations.transportation",
        domain="operations",
        app_config="apps.transportation.apps.TransportationConfig",
        description="Transportation workflows.",
        dependencies=("platform.tenants",),
        aliases=("transportation",),
    ),
    DomainModuleDefinition(
        key="administration.finance",
        domain="administration",
        app_config="apps.accounting.apps.AccountingConfig",
        description="Finance ledger and accounting workflows.",
        dependencies=("platform.tenants",),
        aliases=("finance", "accounting"),
    ),
    DomainModuleDefinition(
        key="administration.billing",
        domain="administration",
        app_config="apps.billing.apps.BillingConfig",
        description="Medical billing and invoice workflows.",
        dependencies=("clinical.patients", "administration.finance"),
        aliases=("billing",),
    ),
    DomainModuleDefinition(
        key="administration.payments",
        domain="administration",
        app_config="apps.payments.apps.PaymentsConfig",
        description="Payment processing and reconciliation.",
        dependencies=("administration.billing",),
        aliases=("payments",),
    ),
    DomainModuleDefinition(
        key="administration.insurance",
        domain="administration",
        app_config="apps.insurer.apps.InsurerConfig",
        description="Insurers, coverage plans and authorizations.",
        dependencies=("clinical.patients",),
        aliases=("insurance", "insurer"),
    ),
    DomainModuleDefinition(
        key="administration.credit_financing",
        domain="administration",
        app_config="apps.credit_financing.apps.CreditFinancingConfig",
        description="Credit and financing workflows.",
        dependencies=("administration.billing",),
        aliases=("credit_financing",),
    ),
    DomainModuleDefinition(
        key="administration.human_resources",
        domain="administration",
        app_config="apps.human_resources.apps.HumanResourcesConfig",
        description="Employees, roles, schedules, absences and HR processes.",
        dependencies=("platform.tenants",),
        aliases=("human_resources", "hr"),
    ),
    DomainModuleDefinition(
        key="administration.payroll",
        domain="administration",
        app_config="apps.human_resources.apps.HumanResourcesConfig",
        implementation_path="apps.human_resources.models.payroll",
        description="Payroll records exposed through human resources.",
        dependencies=("administration.human_resources",),
        aliases=("payroll",),
    ),
    DomainModuleDefinition(
        key="analytics.analytics",
        domain="analytics",
        app_config="apps.monitoring.apps.MonitoringConfig",
        description="Operational monitoring and health indicators.",
        dependencies=("platform.tenants",),
        aliases=("analytics", "monitoring"),
    ),
    DomainModuleDefinition(
        key="analytics.reporting",
        domain="analytics",
        implementation_path="services.reports",
        description="Reusable reporting and export services.",
        dependencies=("platform.tenants",),
        aliases=("reporting", "reports"),
    ),
    DomainModuleDefinition(
        key="public_health.public_health",
        domain="public_health",
        app_config="apps.public_health.apps.PublicHealthConfig",
        description="Public health programs and monitoring workflows.",
        dependencies=("clinical.patients",),
        aliases=("public_health",),
    ),
    DomainModuleDefinition(
        key="platform.education",
        domain="platform",
        app_config="apps.education.apps.EducationConfig",
        description="Education and learning workflows.",
        dependencies=("platform.tenants",),
        aliases=("education",),
    ),
)


def _flatten_unique(groups: Iterable[Iterable[str]]) -> tuple[str, ...]:
    seen: set[str] = set()
    values: list[str] = []
    for group in groups:
        for value in group:
            if value in seen:
                continue
            seen.add(value)
            values.append(value)
    return tuple(values)


def _lookup_key(value: str) -> str:
    return value.strip().lower().replace("-", "_")


def _index_modules_by_lookup() -> dict[str, DomainModuleDefinition]:
    indexed: dict[str, DomainModuleDefinition] = {}
    for definition in DOMAIN_MODULES:
        lookups = (definition.key, definition.key.split(".")[-1], *definition.aliases)
        for lookup in lookups:
            indexed.setdefault(_lookup_key(lookup), definition)
    return indexed


DOMAIN_APP_CONFIGS_BY_GROUP = {
    domain: _flatten_unique((configs,))
    for domain, configs in DOMAIN_APP_GROUPS.items()
}
DOMAIN_APP_CONFIGS_FROM_GROUPS = _flatten_unique(DOMAIN_APP_GROUPS.values())
DOMAIN_MODULES_BY_KEY = {definition.key: definition for definition in DOMAIN_MODULES}
DOMAIN_MODULES_BY_LOOKUP = _index_modules_by_lookup()


def active_module_definitions() -> tuple[DomainModuleDefinition, ...]:
    return tuple(definition for definition in DOMAIN_MODULES if definition.is_active)


def planned_module_definitions() -> tuple[DomainModuleDefinition, ...]:
    return tuple(definition for definition in DOMAIN_MODULES if definition.status is ModuleImplementationStatus.PLANNED)


def module_definition_for(lookup: str) -> DomainModuleDefinition:
    try:
        return DOMAIN_MODULES_BY_LOOKUP[_lookup_key(lookup)]
    except KeyError as exc:
        raise KeyError(f"Unknown domain module: {lookup}") from exc


def module_manifests(*, include_planned: bool = False) -> tuple[ModuleManifest, ...]:
    definitions = DOMAIN_MODULES if include_planned else active_module_definitions()
    return tuple(definition.to_manifest() for definition in definitions)


def register_domain_modules(registry: ModuleRegistry, *, include_planned: bool = False) -> None:
    for manifest in module_manifests(include_planned=include_planned):
        if not registry.is_registered(manifest.key):
            registry.register(manifest)
