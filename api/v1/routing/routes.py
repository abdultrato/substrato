from api.v1.accounting.viewsets import VIEWSET_MAP as ACCOUNTING_VIEWSET_MAP
from api.v1.audit.viewsets import VIEWSET_MAP as AUDIT_VIEWSET_MAP
from api.v1.billing.viewsets import VIEWSET_MAP as BILLING_VIEWSET_MAP
from api.v1.clinical.viewsets import VIEWSET_MAP as CLINICAL_VIEWSET_MAP
from api.v1.consultations.viewsets import VIEWSET_MAP as CONSULTATIONS_VIEWSET_MAP
from api.v1.dashboard.viewsets import VIEWSET_MAP as DASHBOARD_VIEWSET_MAP
from api.v1.equipment.viewsets import VIEWSET_MAP as EQUIPMENT_VIEWSET_MAP
from api.v1.external_entities.viewsets import VIEWSET_MAP as EXTERNAL_ENTITIES_VIEWSET_MAP
from api.v1.human_resources.viewsets import VIEWSET_MAP as HUMAN_RESOURCES_VIEWSET_MAP
from api.v1.identity.viewsets import VIEWSET_MAP as IDENTITY_VIEWSET_MAP
from api.v1.insurer.viewsets import VIEWSET_MAP as INSURER_VIEWSET_MAP
from api.v1.maternity.viewsets import VIEWSET_MAP as MATERNITY_VIEWSET_MAP
from api.v1.medical_records.viewsets import VIEWSET_MAP as MEDICAL_RECORDS_VIEWSET_MAP
from api.v1.monitoring.viewsets import VIEWSET_MAP as MONITORING_VIEWSET_MAP
from api.v1.notifications.viewsets import VIEWSET_MAP as NOTIFICATIONS_VIEWSET_MAP
from api.v1.nursing.viewsets import VIEWSET_MAP as NURSING_VIEWSET_MAP
from api.v1.payments.viewsets import VIEWSET_MAP as PAYMENTS_VIEWSET_MAP
from api.v1.pharmacy.viewsets import VIEWSET_MAP as PHARMACY_VIEWSET_MAP
from api.v1.reception.viewsets import VIEWSET_MAP as RECEPTION_VIEWSET_MAP
from api.v1.surgery.viewsets import VIEWSET_MAP as SURGERY_VIEWSET_MAP
from api.v1.tenants.viewsets import VIEWSET_MAP as TENANTS_VIEWSET_MAP
from security.permissions.rbac import RBACPermission

VIEWSET_GROUPS = {
    "audit": AUDIT_VIEWSET_MAP,
    "dashboard": DASHBOARD_VIEWSET_MAP,
    "clinical": CLINICAL_VIEWSET_MAP,
    "consultations": CONSULTATIONS_VIEWSET_MAP,
    "accounting": ACCOUNTING_VIEWSET_MAP,
    "nursing": NURSING_VIEWSET_MAP,
    "equipment": EQUIPMENT_VIEWSET_MAP,
    "external_entities": EXTERNAL_ENTITIES_VIEWSET_MAP,
    "pharmacy": PHARMACY_VIEWSET_MAP,
    "billing": BILLING_VIEWSET_MAP,
    "identity": IDENTITY_VIEWSET_MAP,
    "tenants": TENANTS_VIEWSET_MAP,
    "notifications": NOTIFICATIONS_VIEWSET_MAP,
    "payments": PAYMENTS_VIEWSET_MAP,
    "reception": RECEPTION_VIEWSET_MAP,
    "insurer": INSURER_VIEWSET_MAP,
    "medical_records": MEDICAL_RECORDS_VIEWSET_MAP,
    "maternity": MATERNITY_VIEWSET_MAP,
    "surgery": SURGERY_VIEWSET_MAP,
    "human_resources": HUMAN_RESOURCES_VIEWSET_MAP,
    "monitoring": MONITORING_VIEWSET_MAP,
}


def register_routes(router):
    registered_routes: set[tuple[str, str]] = set()

    def _register(route: str, basename: str, viewset):
        key = (route, basename)
        if key in registered_routes:
            return
        # Enforce RBAC uniformly for all registered ViewSets.
        viewset.permission_classes = [RBACPermission]
        router.register(route, viewset, basename=basename)
        registered_routes.add(key)

    for prefix, viewsets in VIEWSET_GROUPS.items():
        for model_name, viewset in sorted(viewsets.items()):
            route = f"{prefix}/{model_name}"
            basename = f"{prefix}-{model_name}"
            _register(route, basename, viewset)
    return router
