from rest_framework.permissions import IsAuthenticated
from rest_framework.viewsets import ModelViewSet

from api.v1.viewset_mixins import TenantScopedQuerysetMixin, ValidatedSearchOrderingMixin
from apps.clinical_pharmacy.models import (
    AntibioticStewardshipReview,
    ClinicalPharmacyIngredient,
    ClinicalPharmacyIVPreparation,
    ControlledSubstanceMovement,
    DrugInteractionRule,
    MedicationInteractionCheck,
)

from .filters import (
    AntibioticStewardshipReviewFilter,
    ClinicalPharmacyIngredientFilter,
    ClinicalPharmacyIVPreparationFilter,
    ControlledSubstanceMovementFilter,
    DrugInteractionRuleFilter,
    MedicationInteractionCheckFilter,
)
from .serializers import (
    AntibioticStewardshipReviewSerializer,
    ClinicalPharmacyIngredientSerializer,
    ClinicalPharmacyIVPreparationSerializer,
    ControlledSubstanceMovementSerializer,
    DrugInteractionRuleSerializer,
    MedicationInteractionCheckSerializer,
)


class ClinicalPharmacyModelViewSet(ValidatedSearchOrderingMixin, TenantScopedQuerysetMixin, ModelViewSet):
    permission_classes = [IsAuthenticated]
    ordering_fields = "__all__"
    ordering = ["-created_at"]


class ClinicalPharmacyIVPreparationViewSet(ClinicalPharmacyModelViewSet):
    queryset = ClinicalPharmacyIVPreparation.objects.select_related(
        "patient",
        "prescription_item",
        "product",
        "lot",
        "pharmacist",
        "verifier",
        "prepared_by",
    ).prefetch_related("ingredients", "controlled_substance_movements")
    serializer_class = ClinicalPharmacyIVPreparationSerializer
    filterset_class = ClinicalPharmacyIVPreparationFilter
    search_fields = ["custom_id", "patient__name", "product__name", "lot__lot_number", "protocol_reference", "notes"]
    ordering = ["-requested_at", "-created_at"]


class ClinicalPharmacyIngredientViewSet(ClinicalPharmacyModelViewSet):
    queryset = ClinicalPharmacyIngredient.objects.select_related("preparation", "preparation__patient", "product", "lot").all()
    serializer_class = ClinicalPharmacyIngredientSerializer
    filterset_class = ClinicalPharmacyIngredientFilter
    search_fields = ["custom_id", "preparation__custom_id", "preparation__patient__name", "product__name", "lot__lot_number", "concentration"]
    ordering = ["preparation", "position", "id"]


class DrugInteractionRuleViewSet(ClinicalPharmacyModelViewSet):
    queryset = DrugInteractionRule.objects.select_related("primary_drug", "interacting_drug").all()
    serializer_class = DrugInteractionRuleSerializer
    filterset_class = DrugInteractionRuleFilter
    search_fields = ["custom_id", "name", "primary_drug__name", "interacting_drug__name", "mechanism", "clinical_effect", "recommendation"]
    ordering = ["severity", "name"]


class MedicationInteractionCheckViewSet(ClinicalPharmacyModelViewSet):
    queryset = MedicationInteractionCheck.objects.select_related(
        "patient",
        "prescription_item",
        "primary_drug",
        "interacting_drug",
        "rule",
        "pharmacist",
    ).all()
    serializer_class = MedicationInteractionCheckSerializer
    filterset_class = MedicationInteractionCheckFilter
    search_fields = ["custom_id", "patient__name", "primary_drug__name", "interacting_drug__name", "recommendation", "action_taken", "override_reason"]
    ordering = ["-checked_at", "-created_at"]


class ControlledSubstanceMovementViewSet(ClinicalPharmacyModelViewSet):
    queryset = ControlledSubstanceMovement.objects.select_related(
        "product",
        "lot",
        "patient",
        "prescription_item",
        "preparation",
        "responsible",
        "witness",
    ).all()
    serializer_class = ControlledSubstanceMovementSerializer
    filterset_class = ControlledSubstanceMovementFilter
    search_fields = ["custom_id", "product__name", "lot__lot_number", "patient__name", "chain_of_custody_code", "reason", "notes"]
    ordering = ["-movement_at", "-created_at"]


class AntibioticStewardshipReviewViewSet(ClinicalPharmacyModelViewSet):
    queryset = AntibioticStewardshipReview.objects.select_related("patient", "prescription_item", "antibiotic", "reviewer").all()
    serializer_class = AntibioticStewardshipReviewSerializer
    filterset_class = AntibioticStewardshipReviewFilter
    search_fields = ["custom_id", "patient__name", "antibiotic__name", "indication", "infection_site", "organism", "culture_result", "recommendation"]
    ordering = ["-start_date", "-created_at"]


VIEWSET_MAP = {
    "preparation": ClinicalPharmacyIVPreparationViewSet,
    "ingredient": ClinicalPharmacyIngredientViewSet,
    "interaction_rule": DrugInteractionRuleViewSet,
    "interaction_check": MedicationInteractionCheckViewSet,
    "controlled_movement": ControlledSubstanceMovementViewSet,
    "antibiotic_review": AntibioticStewardshipReviewViewSet,
}
