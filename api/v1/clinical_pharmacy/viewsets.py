from django.apps import apps as django_apps
from django.core.exceptions import ValidationError as DjangoValidationError
from rest_framework import status as http_status
from rest_framework.decorators import action
from rest_framework.exceptions import ValidationError as DRFValidationError
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.viewsets import ModelViewSet

from api.v1.viewset_mixins import TenantScopedQuerysetMixin, ValidatedSearchOrderingMixin
from apps.clinical_pharmacy.services import ClinicalPharmacyWorkflowService
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


def _as_drf_error(exc: DjangoValidationError) -> DRFValidationError:
    detail = getattr(exc, "message_dict", None) or getattr(exc, "messages", None) or [str(exc)]
    return DRFValidationError(detail)


def _resolve(model_name, pk, tenant, label="recursos_humanos"):
    if pk in (None, "", 0):
        return None
    model = django_apps.get_model(label, model_name)
    instance = model.objects.filter(pk=pk).first()
    if instance is None:
        raise DRFValidationError(f"{model_name} {pk} não encontrado.")
    if tenant is not None:
        req = getattr(tenant, "id", None)
        inst = getattr(instance, "tenant_id", None)
        if inst is not None and req is not None and inst != req:
            raise DRFValidationError(f"{model_name} pertence a outro tenant.")
    return instance


def _emp(request, key):
    return _resolve("Employee", request.data.get(key), getattr(request, "tenant", None))


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

    @action(detail=True, methods=["post"], url_path="adicionar-ingrediente", url_name="adicionar-ingrediente")
    def adicionar_ingrediente(self, request, pk=None):
        prep = self.get_object()
        tenant = getattr(request, "tenant", None)
        product = _resolve("Product", request.data.get("product"), tenant, label="farmacia")
        lot = _resolve("Lot", request.data.get("lot"), tenant, label="farmacia")
        if product is None or lot is None:
            raise DRFValidationError({"product": "Produto e lote são obrigatórios."})
        try:
            ingredient = ClinicalPharmacyWorkflowService.add_ingredient(
                prep,
                product=product,
                lot=lot,
                quantity=request.data.get("quantity", "0"),
                role=request.data.get("role") or ClinicalPharmacyIngredient.IngredientRole.ACTIVE,
                concentration=request.data.get("concentration", ""),
                controlled_substance=bool(request.data.get("controlled_substance", False)),
                hazardous=bool(request.data.get("hazardous", False)),
            )
        except DjangoValidationError as exc:
            raise _as_drf_error(exc)
        return Response(
            ClinicalPharmacyIngredientSerializer(ingredient, context=self.get_serializer_context()).data,
            status=http_status.HTTP_201_CREATED,
        )

    @action(detail=True, methods=["post"], url_path="validar", url_name="validar")
    def validar(self, request, pk=None):
        prep = self.get_object()
        try:
            ClinicalPharmacyWorkflowService.verify_preparation(
                prep, verifier=_emp(request, "verifier"), compatibility_ok=bool(request.data.get("compatibility_ok", True))
            )
        except DjangoValidationError as exc:
            raise _as_drf_error(exc)
        return Response(self.get_serializer(prep).data)

    @action(detail=True, methods=["post"], url_path="preparar", url_name="preparar")
    def preparar(self, request, pk=None):
        prep = self.get_object()
        try:
            ClinicalPharmacyWorkflowService.mark_prepared(
                prep, prepared_by=_emp(request, "prepared_by"), sterility_ok=bool(request.data.get("sterility_ok", True))
            )
        except DjangoValidationError as exc:
            raise _as_drf_error(exc)
        return Response(self.get_serializer(prep).data)

    @action(detail=True, methods=["post"], url_path="liberar", url_name="liberar")
    def liberar(self, request, pk=None):
        prep = self.get_object()
        try:
            ClinicalPharmacyWorkflowService.release_preparation(
                prep, pharmacist=_emp(request, "pharmacist"), responsible=_emp(request, "responsible")
            )
        except DjangoValidationError as exc:
            raise _as_drf_error(exc)
        return Response(self.get_serializer(prep).data)

    @action(detail=True, methods=["post"], url_path="administrar", url_name="administrar")
    def administrar(self, request, pk=None):
        prep = self.get_object()
        try:
            ClinicalPharmacyWorkflowService.administer_preparation(prep)
        except DjangoValidationError as exc:
            raise _as_drf_error(exc)
        return Response(self.get_serializer(prep).data)

    @action(detail=True, methods=["post"], url_path="cancelar", url_name="cancelar")
    def cancelar(self, request, pk=None):
        prep = self.get_object()
        try:
            ClinicalPharmacyWorkflowService.cancel_preparation(prep, reason=request.data.get("reason", ""))
        except DjangoValidationError as exc:
            raise _as_drf_error(exc)
        return Response(self.get_serializer(prep).data)

    @action(detail=True, methods=["post"], url_path="descartar", url_name="descartar")
    def descartar(self, request, pk=None):
        prep = self.get_object()
        try:
            ClinicalPharmacyWorkflowService.discard_preparation(prep, reason=request.data.get("reason", ""))
        except DjangoValidationError as exc:
            raise _as_drf_error(exc)
        return Response(self.get_serializer(prep).data)


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

    @action(detail=False, methods=["post"], url_path="verificar", url_name="verificar")
    def verificar(self, request):
        tenant = getattr(request, "tenant", None)
        patient = _resolve("Patient", request.data.get("patient"), tenant, label="clinical")
        primary = _resolve("Product", request.data.get("primary_drug"), tenant, label="farmacia")
        interacting = _resolve("Product", request.data.get("interacting_drug"), tenant, label="farmacia")
        if patient is None or primary is None or interacting is None:
            raise DRFValidationError({"patient": "Paciente e os dois medicamentos são obrigatórios."})
        try:
            check = ClinicalPharmacyWorkflowService.run_interaction_check(
                patient=patient,
                primary_drug=primary,
                interacting_drug=interacting,
                pharmacist=_emp(request, "pharmacist"),
                clinical_context=request.data.get("clinical_context", ""),
            )
        except DjangoValidationError as exc:
            raise _as_drf_error(exc)
        return Response(self.get_serializer(check).data, status=http_status.HTTP_201_CREATED)

    @action(detail=True, methods=["post"], url_path="resolver", url_name="resolver")
    def resolver(self, request, pk=None):
        check = self.get_object()
        try:
            ClinicalPharmacyWorkflowService.resolve_check(
                check,
                action_taken=request.data.get("action_taken", ""),
                clear=bool(request.data.get("clear", False)),
                pharmacist=_emp(request, "pharmacist"),
            )
        except DjangoValidationError as exc:
            raise _as_drf_error(exc)
        return Response(self.get_serializer(check).data)

    @action(detail=True, methods=["post"], url_path="aceitar-com-justificativa", url_name="aceitar-com-justificativa")
    def aceitar_com_justificativa(self, request, pk=None):
        check = self.get_object()
        try:
            ClinicalPharmacyWorkflowService.override_check(
                check, override_reason=request.data.get("override_reason", ""), pharmacist=_emp(request, "pharmacist")
            )
        except DjangoValidationError as exc:
            raise _as_drf_error(exc)
        return Response(self.get_serializer(check).data)


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

    @action(detail=True, methods=["post"], url_path="estornar", url_name="estornar")
    def estornar(self, request, pk=None):
        movement = self.get_object()
        try:
            reversal = ClinicalPharmacyWorkflowService.reverse_controlled_movement(
                movement,
                responsible=_emp(request, "responsible"),
                witness=_emp(request, "witness"),
                reason=request.data.get("reason", ""),
            )
        except DjangoValidationError as exc:
            raise _as_drf_error(exc)
        return Response(self.get_serializer(reversal).data, status=http_status.HTTP_201_CREATED)


class AntibioticStewardshipReviewViewSet(ClinicalPharmacyModelViewSet):
    queryset = AntibioticStewardshipReview.objects.select_related("patient", "prescription_item", "antibiotic", "reviewer").all()
    serializer_class = AntibioticStewardshipReviewSerializer
    filterset_class = AntibioticStewardshipReviewFilter
    search_fields = ["custom_id", "patient__name", "antibiotic__name", "indication", "infection_site", "organism", "culture_result", "recommendation"]
    ordering = ["-start_date", "-created_at"]

    @action(detail=True, methods=["post"], url_path="emitir-recomendacao", url_name="emitir-recomendacao")
    def emitir_recomendacao(self, request, pk=None):
        review = self.get_object()
        try:
            ClinicalPharmacyWorkflowService.emit_recommendation(
                review,
                recommendation=request.data.get("recommendation", ""),
                status=request.data.get("status", ""),
                reviewer=_emp(request, "reviewer"),
                escalation_reason=request.data.get("escalation_reason", ""),
            )
        except DjangoValidationError as exc:
            raise _as_drf_error(exc)
        return Response(self.get_serializer(review).data)

    @action(detail=True, methods=["post"], url_path="implementar", url_name="implementar")
    def implementar(self, request, pk=None):
        review = self.get_object()
        try:
            ClinicalPharmacyWorkflowService.complete_review(review, action_taken=request.data.get("action_taken", ""))
        except DjangoValidationError as exc:
            raise _as_drf_error(exc)
        return Response(self.get_serializer(review).data)


VIEWSET_MAP = {
    "preparation": ClinicalPharmacyIVPreparationViewSet,
    "ingredient": ClinicalPharmacyIngredientViewSet,
    "interaction_rule": DrugInteractionRuleViewSet,
    "interaction_check": MedicationInteractionCheckViewSet,
    "controlled_movement": ControlledSubstanceMovementViewSet,
    "antibiotic_review": AntibioticStewardshipReviewViewSet,
}
