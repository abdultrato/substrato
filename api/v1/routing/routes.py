from api.v1.accounting.viewsets import VIEWSET_MAP as ACCOUNTING_VIEWSET_MAP
from api.v1.audit.viewsets import VIEWSET_MAP as AUDIT_VIEWSET_MAP
from api.v1.billing.viewsets import VIEWSET_MAP as BILLING_VIEWSET_MAP
from api.v1.bloodbank.viewsets import VIEWSET_MAP as BLOODBANK_VIEWSET_MAP
from api.v1.clinical.viewsets import VIEWSET_MAP as CLINICAL_VIEWSET_MAP
from api.v1.clinical_pharmacy.viewsets import VIEWSET_MAP as CLINICAL_PHARMACY_VIEWSET_MAP
from api.v1.consultations.viewsets import VIEWSET_MAP as CONSULTATIONS_VIEWSET_MAP
from api.v1.credit_financing.viewsets import VIEWSET_MAP as CREDIT_FINANCING_VIEWSET_MAP
from api.v1.dashboard.viewsets import VIEWSET_MAP as DASHBOARD_VIEWSET_MAP
from api.v1.dental.viewsets import VIEWSET_MAP as DENTAL_VIEWSET_MAP
from api.v1.education.viewsets import VIEWSET_MAP as EDUCATION_VIEWSET_MAP
from api.v1.equipment.viewsets import VIEWSET_MAP as EQUIPMENT_VIEWSET_MAP
from api.v1.equipment_integrations.viewsets import VIEWSET_MAP as EQUIPMENT_INTEGRATIONS_VIEWSET_MAP
from api.v1.external_entities.viewsets import VIEWSET_MAP as EXTERNAL_ENTITIES_VIEWSET_MAP
from api.v1.human_resources.viewsets import VIEWSET_MAP as HUMAN_RESOURCES_VIEWSET_MAP
from api.v1.identity.viewsets import VIEWSET_MAP as IDENTITY_VIEWSET_MAP
from api.v1.insurer.viewsets import VIEWSET_MAP as INSURER_VIEWSET_MAP
from api.v1.maintenance.viewsets import VIEWSET_MAP as MAINTENANCE_VIEWSET_MAP
from api.v1.maternity.viewsets import VIEWSET_MAP as MATERNITY_VIEWSET_MAP
from api.v1.medical_records.viewsets import VIEWSET_MAP as MEDICAL_RECORDS_VIEWSET_MAP
from api.v1.monitoring.viewsets import VIEWSET_MAP as MONITORING_VIEWSET_MAP
from api.v1.notifications.viewsets import VIEWSET_MAP as NOTIFICATIONS_VIEWSET_MAP
from api.v1.nursing.viewsets import VIEWSET_MAP as NURSING_VIEWSET_MAP
from api.v1.pathology.viewsets import VIEWSET_MAP as PATHOLOGY_VIEWSET_MAP
from api.v1.payments.viewsets import VIEWSET_MAP as PAYMENTS_VIEWSET_MAP
from api.v1.pharmacy.viewsets import VIEWSET_MAP as PHARMACY_VIEWSET_MAP
from api.v1.physiotherapy.viewsets import VIEWSET_MAP as PHYSIOTHERAPY_VIEWSET_MAP
from api.v1.public_health.viewsets import VIEWSET_MAP as PUBLIC_HEALTH_VIEWSET_MAP
from api.v1.radiology.viewsets import VIEWSET_MAP as RADIOLOGY_VIEWSET_MAP
from api.v1.reception.viewsets import VIEWSET_MAP as RECEPTION_VIEWSET_MAP
from api.v1.surgery.viewsets import VIEWSET_MAP as SURGERY_VIEWSET_MAP
from api.v1.tenants.viewsets import VIEWSET_MAP as TENANTS_VIEWSET_MAP
from api.v1.telemedicine.viewsets import VIEWSET_MAP as TELEMEDICINE_VIEWSET_MAP
from api.v1.therapy.viewsets import VIEWSET_MAP as THERAPY_VIEWSET_MAP
from api.v1.specialty_diagnostics.viewsets import VIEWSET_MAP as SPECIALTY_DIAGNOSTICS_VIEWSET_MAP
from api.v1.transportation.viewsets import VIEWSET_MAP as TRANSPORTATION_VIEWSET_MAP
from api.v1.veterinary.viewsets import VIEWSET_MAP as VETERINARY_VIEWSET_MAP
from api.v1.warehouse.viewsets import VIEWSET_MAP as WAREHOUSE_VIEWSET_MAP
from security.permissions.rbac import RBACPermission

VIEWSET_GROUPS = {
    "audit": AUDIT_VIEWSET_MAP,
    "dashboard": DASHBOARD_VIEWSET_MAP,
    "clinical": CLINICAL_VIEWSET_MAP,
    "clinical_pharmacy": CLINICAL_PHARMACY_VIEWSET_MAP,
    "credit_financing": CREDIT_FINANCING_VIEWSET_MAP,
    "dental": DENTAL_VIEWSET_MAP,
    "consultations": CONSULTATIONS_VIEWSET_MAP,
    "accounting": ACCOUNTING_VIEWSET_MAP,
    "nursing": NURSING_VIEWSET_MAP,
    "pathology": PATHOLOGY_VIEWSET_MAP,
    "equipment": EQUIPMENT_VIEWSET_MAP,
    "equipment_integrations": EQUIPMENT_INTEGRATIONS_VIEWSET_MAP,
    "external_entities": EXTERNAL_ENTITIES_VIEWSET_MAP,
    "pharmacy": PHARMACY_VIEWSET_MAP,
    "physiotherapy": PHYSIOTHERAPY_VIEWSET_MAP,
    "public_health": PUBLIC_HEALTH_VIEWSET_MAP,
    "radiology": RADIOLOGY_VIEWSET_MAP,
    "warehouse": WAREHOUSE_VIEWSET_MAP,
    "billing": BILLING_VIEWSET_MAP,
    "bloodbank": BLOODBANK_VIEWSET_MAP,
    "identity": IDENTITY_VIEWSET_MAP,
    "tenants": TENANTS_VIEWSET_MAP,
    "notifications": NOTIFICATIONS_VIEWSET_MAP,
    "payments": PAYMENTS_VIEWSET_MAP,
    "reception": RECEPTION_VIEWSET_MAP,
    "insurer": INSURER_VIEWSET_MAP,
    "maintenance": MAINTENANCE_VIEWSET_MAP,
    "medical_records": MEDICAL_RECORDS_VIEWSET_MAP,
    "maternity": MATERNITY_VIEWSET_MAP,
    "surgery": SURGERY_VIEWSET_MAP,
    "human_resources": HUMAN_RESOURCES_VIEWSET_MAP,
    "monitoring": MONITORING_VIEWSET_MAP,
    "education": EDUCATION_VIEWSET_MAP,
    "veterinary": VETERINARY_VIEWSET_MAP,
    "therapy": THERAPY_VIEWSET_MAP,
    "specialty_diagnostics": SPECIALTY_DIAGNOSTICS_VIEWSET_MAP,
    "telemedicine": TELEMEDICINE_VIEWSET_MAP,
    "transportation": TRANSPORTATION_VIEWSET_MAP,
}


def register_routes(router):
    registered_routes: set[tuple[str, str]] = set()
    permission_exceptions = {"monitoring-export_job", "monitoring-cloud_control"}

    def _register(route: str, basename: str, viewset):
        key = (route, basename)
        if key in registered_routes:
            return
        # Enforce RBAC uniformly for all registered ViewSets.
        # Exceção: export_job usa controle próprio por tenant/user no payload do job.
        if basename not in permission_exceptions:
            viewset.permission_classes = [RBACPermission]
        router.register(route, viewset, basename=basename)
        registered_routes.add(key)

    for prefix, viewsets in VIEWSET_GROUPS.items():
        for model_name, viewset in sorted(viewsets.items()):
            route = f"{prefix}/{model_name}"
            basename = f"{prefix}-{model_name}"
            _register(route, basename, viewset)
    return router
