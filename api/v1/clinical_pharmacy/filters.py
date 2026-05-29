from api.core.filters import SafeFilterSet
from apps.clinical_pharmacy.models import (
    AntibioticStewardshipReview,
    ClinicalPharmacyIngredient,
    ClinicalPharmacyIVPreparation,
    ControlledSubstanceMovement,
    DrugInteractionRule,
    MedicationInteractionCheck,
)

BASE_FIELDS = [
    "tenant",
    "custom_id",
    "deleted",
    "deleted_at",
    "created_at",
    "updated_at",
    "created_by",
    "updated_by",
]


class ClinicalPharmacyIVPreparationFilter(SafeFilterSet):
    class Meta:
        model = ClinicalPharmacyIVPreparation
        fields = [
            *BASE_FIELDS,
            "patient",
            "prescription_item",
            "product",
            "lot",
            "pharmacist",
            "verifier",
            "prepared_by",
            "preparation_type",
            "status",
            "priority",
            "requested_at",
            "scheduled_at",
            "prepared_at",
            "expires_at",
            "sterility_check_passed",
            "compatibility_check_passed",
            "hazardous_drug",
        ]


class ClinicalPharmacyIngredientFilter(SafeFilterSet):
    class Meta:
        model = ClinicalPharmacyIngredient
        fields = [*BASE_FIELDS, "preparation", "product", "lot", "role", "controlled_substance", "hazardous"]


class DrugInteractionRuleFilter(SafeFilterSet):
    class Meta:
        model = DrugInteractionRule
        fields = [*BASE_FIELDS, "primary_drug", "interacting_drug", "severity", "active"]


class MedicationInteractionCheckFilter(SafeFilterSet):
    class Meta:
        model = MedicationInteractionCheck
        fields = [
            *BASE_FIELDS,
            "patient",
            "prescription_item",
            "primary_drug",
            "interacting_drug",
            "rule",
            "severity",
            "status",
            "checked_at",
            "pharmacist",
        ]


class ControlledSubstanceMovementFilter(SafeFilterSet):
    class Meta:
        model = ControlledSubstanceMovement
        fields = [
            *BASE_FIELDS,
            "product",
            "lot",
            "patient",
            "prescription_item",
            "preparation",
            "movement_type",
            "schedule",
            "movement_at",
            "responsible",
            "witness",
            "chain_of_custody_code",
        ]


class AntibioticStewardshipReviewFilter(SafeFilterSet):
    class Meta:
        model = AntibioticStewardshipReview
        fields = [
            *BASE_FIELDS,
            "patient",
            "prescription_item",
            "antibiotic",
            "reviewer",
            "therapy_type",
            "status",
            "infection_site",
            "organism",
            "start_date",
            "review_due_date",
            "reviewed_at",
            "renal_adjustment_required",
            "dose_optimized",
            "deescalation_recommended",
        ]


FILTER_MAP = {
    "preparation": ClinicalPharmacyIVPreparationFilter,
    "ingredient": ClinicalPharmacyIngredientFilter,
    "interaction_rule": DrugInteractionRuleFilter,
    "interaction_check": MedicationInteractionCheckFilter,
    "controlled_movement": ControlledSubstanceMovementFilter,
    "antibiotic_review": AntibioticStewardshipReviewFilter,
}
