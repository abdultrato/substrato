from django.contrib import admin

from .models import (
    AcidFastSmear,
    AntibioticSusceptibility,
    CriticalResultNotification,
    LabOrder,
    LabOrderItem,
    LabReport,
    LabResult,
    LabSample,
    LabSector,
    LabTest,
    LabTestField,
    LabTestPanel,
    LabWorklist,
    MicrobiologyCulture,
    MicrobiologyIsolate,
    MolecularResult,
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

def _register_if_needed(model):
    try:
        admin.site.register(model)
    except admin.sites.AlreadyRegistered:
        pass


for _model in (
    LabSector, LabTest, LabTestField, LabTestPanel, LabOrder, LabOrderItem, SampleCollection,
    LabSample, SampleReception, SampleRejection, LabWorklist, LabResult,
    ResultValidation, LabReport, CriticalResultNotification,
    MicrobiologyCulture, MicrobiologyIsolate, AntibioticSusceptibility,
    MolecularResult, AcidFastSmear,
    QualityDocument, Nonconformity, CorrectiveAction, InternalAudit, AuditFinding,
    QualityIndicator, StaffTrainingRecord, CompetencyAssessment, CustomerComplaint,
    LabRiskAssessment, ManagementReview,
    BiologicalHazard, ExposureIncident, PPEItem, PPEDistribution, WasteRecord,
    DecontaminationRecord, SpillResponseRecord, VaccinationRecord, BiosafetyInspection,
):
    _register_if_needed(_model)
