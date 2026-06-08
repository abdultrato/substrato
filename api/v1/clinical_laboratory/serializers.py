"""Serializers da API do Laboratório Clínico (LIS)."""

from rest_framework import serializers

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

CORE_READ_ONLY_FIELDS = [
    "id", "custom_id", "tenant", "created_by", "updated_by", "created_at",
    "updated_at", "deleted", "deleted_at", "deleted_by", "version",
]


def _meta(model):
    return type("Meta", (), {
        "model": model,
        "fields": "__all__",
        "read_only_fields": CORE_READ_ONLY_FIELDS,
    })


class LabSectorSerializer(serializers.ModelSerializer):
    Meta = _meta(LabSector)


class LabTestSerializer(serializers.ModelSerializer):
    Meta = _meta(LabTest)


class LabTestPanelSerializer(serializers.ModelSerializer):
    Meta = _meta(LabTestPanel)


class LabOrderSerializer(serializers.ModelSerializer):
    Meta = _meta(LabOrder)


class LabOrderItemSerializer(serializers.ModelSerializer):
    Meta = _meta(LabOrderItem)


class SampleCollectionSerializer(serializers.ModelSerializer):
    Meta = _meta(SampleCollection)


class LabSampleSerializer(serializers.ModelSerializer):
    Meta = _meta(LabSample)


class SampleReceptionSerializer(serializers.ModelSerializer):
    Meta = _meta(SampleReception)


class SampleRejectionSerializer(serializers.ModelSerializer):
    Meta = _meta(SampleRejection)


class LabWorklistSerializer(serializers.ModelSerializer):
    Meta = _meta(LabWorklist)


class LabResultSerializer(serializers.ModelSerializer):
    Meta = _meta(LabResult)


class ResultValidationSerializer(serializers.ModelSerializer):
    Meta = _meta(ResultValidation)


class LabReportSerializer(serializers.ModelSerializer):
    Meta = _meta(LabReport)


class CriticalResultNotificationSerializer(serializers.ModelSerializer):
    Meta = _meta(CriticalResultNotification)


# --- sectores especializados ---
class MicrobiologyCultureSerializer(serializers.ModelSerializer):
    Meta = _meta(MicrobiologyCulture)


class MicrobiologyIsolateSerializer(serializers.ModelSerializer):
    Meta = _meta(MicrobiologyIsolate)


class AntibioticSusceptibilitySerializer(serializers.ModelSerializer):
    Meta = _meta(AntibioticSusceptibility)


class MolecularResultSerializer(serializers.ModelSerializer):
    Meta = _meta(MolecularResult)


class AcidFastSmearSerializer(serializers.ModelSerializer):
    Meta = _meta(AcidFastSmear)


# --- Gestão da Qualidade ---
class QualityDocumentSerializer(serializers.ModelSerializer):
    Meta = _meta(QualityDocument)


class NonconformitySerializer(serializers.ModelSerializer):
    Meta = _meta(Nonconformity)


class CorrectiveActionSerializer(serializers.ModelSerializer):
    Meta = _meta(CorrectiveAction)


class InternalAuditSerializer(serializers.ModelSerializer):
    Meta = _meta(InternalAudit)


class AuditFindingSerializer(serializers.ModelSerializer):
    Meta = _meta(AuditFinding)


class QualityIndicatorSerializer(serializers.ModelSerializer):
    Meta = _meta(QualityIndicator)


class StaffTrainingRecordSerializer(serializers.ModelSerializer):
    Meta = _meta(StaffTrainingRecord)


class CompetencyAssessmentSerializer(serializers.ModelSerializer):
    Meta = _meta(CompetencyAssessment)


class CustomerComplaintSerializer(serializers.ModelSerializer):
    Meta = _meta(CustomerComplaint)


class LabRiskAssessmentSerializer(serializers.ModelSerializer):
    Meta = _meta(LabRiskAssessment)


class ManagementReviewSerializer(serializers.ModelSerializer):
    Meta = _meta(ManagementReview)


# --- Biossegurança ---
class BiologicalHazardSerializer(serializers.ModelSerializer):
    Meta = _meta(BiologicalHazard)


class ExposureIncidentSerializer(serializers.ModelSerializer):
    Meta = _meta(ExposureIncident)


class PPEItemSerializer(serializers.ModelSerializer):
    Meta = _meta(PPEItem)


class PPEDistributionSerializer(serializers.ModelSerializer):
    Meta = _meta(PPEDistribution)


class WasteRecordSerializer(serializers.ModelSerializer):
    Meta = _meta(WasteRecord)


class DecontaminationRecordSerializer(serializers.ModelSerializer):
    Meta = _meta(DecontaminationRecord)


class SpillResponseRecordSerializer(serializers.ModelSerializer):
    Meta = _meta(SpillResponseRecord)


class VaccinationRecordSerializer(serializers.ModelSerializer):
    Meta = _meta(VaccinationRecord)


class BiosafetyInspectionSerializer(serializers.ModelSerializer):
    Meta = _meta(BiosafetyInspection)
