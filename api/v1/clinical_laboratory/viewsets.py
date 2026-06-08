"""ViewSets da API do Laboratório Clínico (LIS).

Seguem o padrão do projeto: ValidatedSearchOrderingMixin + TenantScopedQuerysetMixin
+ ModelViewSet. O isolamento por tenant e o RBAC são aplicados centralmente
(register_routes força RBACPermission).
"""

from rest_framework.viewsets import ModelViewSet

from api.v1.viewset_mixins import TenantScopedQuerysetMixin, ValidatedSearchOrderingMixin
from apps.clinical_laboratory.models import (
    AcidFastSmear,
    AntibioticSusceptibility,
    CriticalResultNotification,
    MicrobiologyCulture,
    MicrobiologyIsolate,
    MolecularResult,
    LabOrder,
    LabOrderItem,
    LabReport,
    LabResult,
    LabSample,
    LabSector,
    LabTest,
    LabTestPanel,
    LabWorklist,
    ResultValidation,
    SampleCollection,
    SampleReception,
    SampleRejection,
    QualityDocument,
    Nonconformity,
    CorrectiveAction,
    InternalAudit,
    AuditFinding,
    QualityIndicator,
    StaffTrainingRecord,
    CompetencyAssessment,
    CustomerComplaint,
    LabRiskAssessment,
    ManagementReview,
    BiologicalHazard,
    ExposureIncident,
    PPEItem,
    PPEDistribution,
    WasteRecord,
    DecontaminationRecord,
    SpillResponseRecord,
    VaccinationRecord,
    BiosafetyInspection,
)

from .serializers import (
    QualityDocumentSerializer,
    NonconformitySerializer,
    CorrectiveActionSerializer,
    InternalAuditSerializer,
    AuditFindingSerializer,
    QualityIndicatorSerializer,
    StaffTrainingRecordSerializer,
    CompetencyAssessmentSerializer,
    CustomerComplaintSerializer,
    LabRiskAssessmentSerializer,
    ManagementReviewSerializer,
    BiologicalHazardSerializer,
    ExposureIncidentSerializer,
    PPEItemSerializer,
    PPEDistributionSerializer,
    WasteRecordSerializer,
    DecontaminationRecordSerializer,
    SpillResponseRecordSerializer,
    VaccinationRecordSerializer,
    BiosafetyInspectionSerializer,
    AcidFastSmearSerializer,
    AntibioticSusceptibilitySerializer,
    CriticalResultNotificationSerializer,
    MicrobiologyCultureSerializer,
    MicrobiologyIsolateSerializer,
    MolecularResultSerializer,
    LabOrderItemSerializer,
    LabOrderSerializer,
    LabReportSerializer,
    LabResultSerializer,
    LabSampleSerializer,
    LabSectorSerializer,
    LabTestPanelSerializer,
    LabTestSerializer,
    LabWorklistSerializer,
    ResultValidationSerializer,
    SampleCollectionSerializer,
    SampleReceptionSerializer,
    SampleRejectionSerializer,
)


class LabSectorViewSet(ValidatedSearchOrderingMixin, TenantScopedQuerysetMixin, ModelViewSet):
    queryset = LabSector.objects.all()
    serializer_class = LabSectorSerializer
    search_fields = ["custom_id", "code", "name"]
    ordering_fields = ["code", "name", "active", "created_at"]


class LabTestViewSet(ValidatedSearchOrderingMixin, TenantScopedQuerysetMixin, ModelViewSet):
    queryset = LabTest.objects.select_related("sector").all()
    serializer_class = LabTestSerializer
    search_fields = ["custom_id", "code", "name", "method", "unit"]
    ordering_fields = ["code", "name", "price", "turnaround_hours", "active", "created_at"]


class LabTestPanelViewSet(ValidatedSearchOrderingMixin, TenantScopedQuerysetMixin, ModelViewSet):
    queryset = LabTestPanel.objects.select_related("sector").all()
    serializer_class = LabTestPanelSerializer
    search_fields = ["custom_id", "code", "name"]
    ordering_fields = ["code", "name", "package_price", "active", "created_at"]


class LabOrderViewSet(ValidatedSearchOrderingMixin, TenantScopedQuerysetMixin, ModelViewSet):
    queryset = LabOrder.objects.select_related("patient", "requesting_physician").all()
    serializer_class = LabOrderSerializer
    search_fields = ["custom_id", "origin", "diagnosis", "clinical_indication"]
    ordering_fields = ["requested_at", "status", "priority", "payment_status", "created_at"]


class LabOrderItemViewSet(ValidatedSearchOrderingMixin, TenantScopedQuerysetMixin, ModelViewSet):
    queryset = LabOrderItem.objects.select_related("order", "test").all()
    serializer_class = LabOrderItemSerializer
    search_fields = ["custom_id"]
    ordering_fields = ["status", "price", "created_at"]


class SampleCollectionViewSet(ValidatedSearchOrderingMixin, TenantScopedQuerysetMixin, ModelViewSet):
    queryset = SampleCollection.objects.select_related("order", "patient", "collected_by").all()
    serializer_class = SampleCollectionSerializer
    search_fields = ["custom_id", "barcode", "location"]
    ordering_fields = ["status", "collection_at", "created_at"]


class LabSampleViewSet(ValidatedSearchOrderingMixin, TenantScopedQuerysetMixin, ModelViewSet):
    queryset = LabSample.objects.select_related("order", "collection").all()
    serializer_class = LabSampleSerializer
    search_fields = ["custom_id", "barcode", "storage_location"]
    ordering_fields = ["status", "received_at", "collected_at", "created_at"]


class SampleReceptionViewSet(ValidatedSearchOrderingMixin, TenantScopedQuerysetMixin, ModelViewSet):
    queryset = SampleReception.objects.select_related("sample", "received_by").all()
    serializer_class = SampleReceptionSerializer
    search_fields = ["custom_id", "notes"]
    ordering_fields = ["received_at", "accepted", "created_at"]


class SampleRejectionViewSet(ValidatedSearchOrderingMixin, TenantScopedQuerysetMixin, ModelViewSet):
    queryset = SampleRejection.objects.select_related("sample", "rejected_by").all()
    serializer_class = SampleRejectionSerializer
    search_fields = ["custom_id", "details"]
    ordering_fields = ["rejected_at", "reason", "requires_recollection", "created_at"]


class LabWorklistViewSet(ValidatedSearchOrderingMixin, TenantScopedQuerysetMixin, ModelViewSet):
    queryset = LabWorklist.objects.select_related("sector", "assigned_to").all()
    serializer_class = LabWorklistSerializer
    search_fields = ["custom_id"]
    ordering_fields = ["work_date", "status", "priority", "created_at"]


class LabResultViewSet(ValidatedSearchOrderingMixin, TenantScopedQuerysetMixin, ModelViewSet):
    queryset = LabResult.objects.select_related("order_item", "sample", "performed_by").all()
    serializer_class = LabResultSerializer
    search_fields = ["custom_id", "value", "unit", "method", "equipment"]
    ordering_fields = ["status", "flag", "performed_at", "created_at"]


class ResultValidationViewSet(ValidatedSearchOrderingMixin, TenantScopedQuerysetMixin, ModelViewSet):
    queryset = ResultValidation.objects.select_related("result", "validated_by").all()
    serializer_class = ResultValidationSerializer
    search_fields = ["custom_id", "notes"]
    ordering_fields = ["validation_type", "status", "validated_at", "created_at"]


class LabReportViewSet(ValidatedSearchOrderingMixin, TenantScopedQuerysetMixin, ModelViewSet):
    queryset = LabReport.objects.select_related("order", "patient", "signed_by").all()
    serializer_class = LabReportSerializer
    search_fields = ["custom_id", "report_number"]
    ordering_fields = ["status", "issued_at", "delivered_at", "created_at"]


class CriticalResultNotificationViewSet(ValidatedSearchOrderingMixin, TenantScopedQuerysetMixin, ModelViewSet):
    queryset = CriticalResultNotification.objects.select_related("result", "patient", "notified_by").all()
    serializer_class = CriticalResultNotificationSerializer
    search_fields = ["custom_id", "notified_professional", "notes"]
    ordering_fields = ["notified_at", "readback_confirmed", "method", "created_at"]


class MicrobiologyCultureViewSet(ValidatedSearchOrderingMixin, TenantScopedQuerysetMixin, ModelViewSet):
    queryset = MicrobiologyCulture.objects.select_related("order_item", "sample", "performed_by").all()
    serializer_class = MicrobiologyCultureSerializer
    search_fields = ["custom_id", "specimen", "notes"]
    ordering_fields = ["status", "culture_type", "read_at", "created_at"]


class MicrobiologyIsolateViewSet(ValidatedSearchOrderingMixin, TenantScopedQuerysetMixin, ModelViewSet):
    queryset = MicrobiologyIsolate.objects.select_related("culture").all()
    serializer_class = MicrobiologyIsolateSerializer
    search_fields = ["custom_id", "organism_name", "gram_stain", "notes"]
    ordering_fields = ["organism_name", "is_significant", "created_at"]


class AntibioticSusceptibilityViewSet(ValidatedSearchOrderingMixin, TenantScopedQuerysetMixin, ModelViewSet):
    queryset = AntibioticSusceptibility.objects.select_related("isolate").all()
    serializer_class = AntibioticSusceptibilitySerializer
    search_fields = ["custom_id", "antibiotic", "mic_value"]
    ordering_fields = ["antibiotic", "result", "method", "created_at"]


class MolecularResultViewSet(ValidatedSearchOrderingMixin, TenantScopedQuerysetMixin, ModelViewSet):
    queryset = MolecularResult.objects.select_related("order_item", "sample", "performed_by").all()
    serializer_class = MolecularResultSerializer
    search_fields = ["custom_id", "instrument", "notes"]
    ordering_fields = ["assay", "detection", "performed_at", "created_at"]


class AcidFastSmearViewSet(ValidatedSearchOrderingMixin, TenantScopedQuerysetMixin, ModelViewSet):
    queryset = AcidFastSmear.objects.select_related("order_item", "sample", "performed_by").all()
    serializer_class = AcidFastSmearSerializer
    search_fields = ["custom_id", "afb_count", "notes"]
    ordering_fields = ["grade", "stain", "performed_at", "created_at"]


# --- Gestão da Qualidade ---
class QualityDocumentViewSet(ValidatedSearchOrderingMixin, TenantScopedQuerysetMixin, ModelViewSet):
    queryset = QualityDocument.objects.select_related("sector", "owner").all()
    serializer_class = QualityDocumentSerializer
    search_fields = ["custom_id", "code", "title"]
    ordering_fields = ["code", "status", "document_type", "review_date", "created_at"]


class NonconformityViewSet(ValidatedSearchOrderingMixin, TenantScopedQuerysetMixin, ModelViewSet):
    queryset = Nonconformity.objects.select_related("sector").all()
    serializer_class = NonconformitySerializer
    search_fields = ["custom_id", "code", "description", "source_ref"]
    ordering_fields = ["detected_at", "severity", "status", "created_at"]


class CorrectiveActionViewSet(ValidatedSearchOrderingMixin, TenantScopedQuerysetMixin, ModelViewSet):
    queryset = CorrectiveAction.objects.select_related("nonconformity").all()
    serializer_class = CorrectiveActionSerializer
    search_fields = ["custom_id", "description"]
    ordering_fields = ["due_date", "status", "action_type", "created_at"]


class InternalAuditViewSet(ValidatedSearchOrderingMixin, TenantScopedQuerysetMixin, ModelViewSet):
    queryset = InternalAudit.objects.all()
    serializer_class = InternalAuditSerializer
    search_fields = ["custom_id", "code", "area"]
    ordering_fields = ["audit_date", "status", "created_at"]


class AuditFindingViewSet(ValidatedSearchOrderingMixin, TenantScopedQuerysetMixin, ModelViewSet):
    queryset = AuditFinding.objects.select_related("audit").all()
    serializer_class = AuditFindingSerializer
    search_fields = ["custom_id", "description", "clause"]
    ordering_fields = ["finding_type", "created_at"]


class QualityIndicatorViewSet(ValidatedSearchOrderingMixin, TenantScopedQuerysetMixin, ModelViewSet):
    queryset = QualityIndicator.objects.select_related("sector").all()
    serializer_class = QualityIndicatorSerializer
    search_fields = ["custom_id", "name"]
    ordering_fields = ["name", "status", "created_at"]


class StaffTrainingRecordViewSet(ValidatedSearchOrderingMixin, TenantScopedQuerysetMixin, ModelViewSet):
    queryset = StaffTrainingRecord.objects.select_related("staff").all()
    serializer_class = StaffTrainingRecordSerializer
    search_fields = ["custom_id", "title", "trainer"]
    ordering_fields = ["training_date", "expiry_date", "status", "created_at"]


class CompetencyAssessmentViewSet(ValidatedSearchOrderingMixin, TenantScopedQuerysetMixin, ModelViewSet):
    queryset = CompetencyAssessment.objects.select_related("staff", "related_test").all()
    serializer_class = CompetencyAssessmentSerializer
    search_fields = ["custom_id", "area"]
    ordering_fields = ["assessment_date", "expiry_date", "status", "created_at"]


class CustomerComplaintViewSet(ValidatedSearchOrderingMixin, TenantScopedQuerysetMixin, ModelViewSet):
    queryset = CustomerComplaint.objects.select_related("nonconformity").all()
    serializer_class = CustomerComplaintSerializer
    search_fields = ["custom_id", "code", "description", "source"]
    ordering_fields = ["received_at", "status", "created_at"]


class LabRiskAssessmentViewSet(ValidatedSearchOrderingMixin, TenantScopedQuerysetMixin, ModelViewSet):
    queryset = LabRiskAssessment.objects.all()
    serializer_class = LabRiskAssessmentSerializer
    search_fields = ["custom_id", "description", "area"]
    ordering_fields = ["level", "category", "status", "created_at"]


class ManagementReviewViewSet(ValidatedSearchOrderingMixin, TenantScopedQuerysetMixin, ModelViewSet):
    queryset = ManagementReview.objects.all()
    serializer_class = ManagementReviewSerializer
    search_fields = ["custom_id", "title"]
    ordering_fields = ["review_date", "status", "created_at"]


# --- Biossegurança ---
class BiologicalHazardViewSet(ValidatedSearchOrderingMixin, TenantScopedQuerysetMixin, ModelViewSet):
    queryset = BiologicalHazard.objects.all()
    serializer_class = BiologicalHazardSerializer
    search_fields = ["custom_id", "name", "transmission_route"]
    ordering_fields = ["name", "risk_group", "active", "created_at"]


class ExposureIncidentViewSet(ValidatedSearchOrderingMixin, TenantScopedQuerysetMixin, ModelViewSet):
    queryset = ExposureIncident.objects.select_related("staff", "nonconformity").all()
    serializer_class = ExposureIncidentSerializer
    search_fields = ["custom_id", "material_involved", "body_site", "activity"]
    ordering_fields = ["incident_at", "status", "exposure_type", "created_at"]


class PPEItemViewSet(ValidatedSearchOrderingMixin, TenantScopedQuerysetMixin, ModelViewSet):
    queryset = PPEItem.objects.all()
    serializer_class = PPEItemSerializer
    search_fields = ["custom_id", "name", "category"]
    ordering_fields = ["name", "minimum_stock", "current_stock", "active", "created_at"]


class PPEDistributionViewSet(ValidatedSearchOrderingMixin, TenantScopedQuerysetMixin, ModelViewSet):
    queryset = PPEDistribution.objects.select_related("ppe", "staff").all()
    serializer_class = PPEDistributionSerializer
    search_fields = ["custom_id", "department", "purpose"]
    ordering_fields = ["distribution_date", "quantity", "created_at"]


class WasteRecordViewSet(ValidatedSearchOrderingMixin, TenantScopedQuerysetMixin, ModelViewSet):
    queryset = WasteRecord.objects.all()
    serializer_class = WasteRecordSerializer
    search_fields = ["custom_id", "container_code", "department"]
    ordering_fields = ["generated_at", "waste_type", "status", "created_at"]


class DecontaminationRecordViewSet(ValidatedSearchOrderingMixin, TenantScopedQuerysetMixin, ModelViewSet):
    queryset = DecontaminationRecord.objects.all()
    serializer_class = DecontaminationRecordSerializer
    search_fields = ["custom_id", "area", "disinfectant", "equipment"]
    ordering_fields = ["performed_at", "created_at"]


class SpillResponseRecordViewSet(ValidatedSearchOrderingMixin, TenantScopedQuerysetMixin, ModelViewSet):
    queryset = SpillResponseRecord.objects.select_related("exposure_incident").all()
    serializer_class = SpillResponseRecordSerializer
    search_fields = ["custom_id", "location", "material_involved"]
    ordering_fields = ["occurred_at", "spill_type", "created_at"]


class VaccinationRecordViewSet(ValidatedSearchOrderingMixin, TenantScopedQuerysetMixin, ModelViewSet):
    queryset = VaccinationRecord.objects.select_related("staff").all()
    serializer_class = VaccinationRecordSerializer
    search_fields = ["custom_id", "vaccine"]
    ordering_fields = ["vaccination_date", "next_dose_due", "status", "created_at"]


class BiosafetyInspectionViewSet(ValidatedSearchOrderingMixin, TenantScopedQuerysetMixin, ModelViewSet):
    queryset = BiosafetyInspection.objects.select_related("inspector", "nonconformity").all()
    serializer_class = BiosafetyInspectionSerializer
    search_fields = ["custom_id", "area", "findings"]
    ordering_fields = ["inspection_date", "status", "created_at"]


VIEWSET_MAP = {
    "sector": LabSectorViewSet,
    "test": LabTestViewSet,
    "panel": LabTestPanelViewSet,
    "order": LabOrderViewSet,
    "order_item": LabOrderItemViewSet,
    "collection": SampleCollectionViewSet,
    "sample": LabSampleViewSet,
    "reception": SampleReceptionViewSet,
    "rejection": SampleRejectionViewSet,
    "worklist": LabWorklistViewSet,
    "result": LabResultViewSet,
    "validation": ResultValidationViewSet,
    "report": LabReportViewSet,
    "critical_notification": CriticalResultNotificationViewSet,
    "culture": MicrobiologyCultureViewSet,
    "isolate": MicrobiologyIsolateViewSet,
    "antibiogram": AntibioticSusceptibilityViewSet,
    "molecular_result": MolecularResultViewSet,
    "afb_smear": AcidFastSmearViewSet,
    # Gestão da Qualidade
    "quality_document": QualityDocumentViewSet,
    "nonconformity": NonconformityViewSet,
    "corrective_action": CorrectiveActionViewSet,
    "internal_audit": InternalAuditViewSet,
    "audit_finding": AuditFindingViewSet,
    "quality_indicator": QualityIndicatorViewSet,
    "training_record": StaffTrainingRecordViewSet,
    "competency": CompetencyAssessmentViewSet,
    "complaint": CustomerComplaintViewSet,
    "risk_assessment": LabRiskAssessmentViewSet,
    "management_review": ManagementReviewViewSet,
    # Biossegurança
    "hazard": BiologicalHazardViewSet,
    "exposure_incident": ExposureIncidentViewSet,
    "ppe": PPEItemViewSet,
    "ppe_distribution": PPEDistributionViewSet,
    "waste": WasteRecordViewSet,
    "decontamination": DecontaminationRecordViewSet,
    "spill": SpillResponseRecordViewSet,
    "vaccination": VaccinationRecordViewSet,
    "biosafety_inspection": BiosafetyInspectionViewSet,
}

__all__ = ["VIEWSET_MAP"]
