"""ViewSets da API v1 para recursos de Enfermagem."""

from django.apps import apps as django_apps
from django.core.exceptions import ValidationError as DjangoValidationError
from django.http import HttpResponse
from rest_framework import serializers, status
from rest_framework.decorators import action
from rest_framework.exceptions import ValidationError as DRFValidationError
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.viewsets import ModelViewSet, ViewSet

from api.utils.async_exports import queue_export_if_requested
from api.v1.viewset_mixins import TenantScopedQuerysetMixin, ValidatedSearchOrderingMixin
from apps.nursing.services import WardAdmissionWorkflowService
from apps.nursing.models import (
    NursingEvolution,
    NursingPrescription,
    NursingRecord,
    NursingVitalSign,
    Procedure,
    ProcedureCatalog,
    ProcedureCatalogMaterial,
    ProcedureItem,
    ProcedureItemValue,
    ProcedureMaterial,
    ProcedureMaterialValue,
    Ward,
    WardAdmission,
    WardBed,
)
from drf_spectacular.utils import extend_schema

from ..filters import (
    NursingEvolutionFilter,
    NursingPrescriptionFilter,
    NursingRecordFilter,
    NursingVitalSignFilter,
    ProcedureCatalogFilter,
    ProcedureCatalogMaterialFilter,
    ProcedureFilter,
    ProcedureItemFilter,
    ProcedureItemValueFilter,
    ProcedureMaterialFilter,
    ProcedureMaterialValueFilter,
    WardAdmissionFilter,
    WardBedFilter,
    WardFilter,
)
from ..serializers import (
    NursingEvolutionSerializer,
    NursingPrescriptionSerializer,
    NursingRecordSerializer,
    NursingVitalSignSerializer,
    ProcedureCatalogMaterialSerializer,
    ProcedureCatalogSerializer,
    ProcedureItemSerializer,
    ProcedureItemValueSerializer,
    ProcedureMaterialSerializer,
    ProcedureMaterialValueSerializer,
    ProcedureSerializer,
    WardAdmissionSerializer,
    WardBedSerializer,
    WardSerializer,
)


def _ward_as_drf_error(exc: DjangoValidationError) -> DRFValidationError:
    detail = getattr(exc, "message_dict", None) or getattr(exc, "messages", None) or [str(exc)]
    return DRFValidationError(detail)


def _ward_resolve(label: str, model_name: str, pk, tenant):
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


class TenantScopedModelViewSet(ValidatedSearchOrderingMixin, TenantScopedQuerysetMixin, ModelViewSet):
    permission_classes = [IsAuthenticated]


class WardDashboardSummarySerializer(serializers.Serializer):
    patients = serializers.IntegerField()
    total_beds = serializers.IntegerField()
    occupied_beds = serializers.IntegerField()
    available_beds = serializers.IntegerField()


class WardDashboardBedSerializer(serializers.Serializer):
    admission_id = serializers.IntegerField()
    admission_code = serializers.CharField(allow_blank=True)
    ward = serializers.CharField(allow_blank=True)
    bed_id = serializers.IntegerField()
    bed_number = serializers.CharField(allow_blank=True)
    patient_id = serializers.IntegerField()
    patient_name = serializers.CharField(allow_blank=True)
    admission_date = serializers.DateTimeField(required=False, allow_null=True)
    expected_discharge_date = serializers.DateTimeField(required=False, allow_null=True)
    estimated_observation_hours = serializers.IntegerField(required=False, allow_null=True)
    next_medication_at = serializers.DateTimeField(required=False, allow_null=True)
    next_medication_description = serializers.CharField(required=False, allow_blank=True)


class WardDashboardResponseSerializer(serializers.Serializer):
    summary = WardDashboardSummarySerializer()
    beds = WardDashboardBedSerializer(many=True)


class NursingRecordViewSet(TenantScopedModelViewSet):
    serializer_class = NursingRecordSerializer
    filterset_class = NursingRecordFilter
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return NursingRecord.objects.select_related('patient', 'ward', 'tenant', 'lab_request')
    search_fields = [
        "custom_id",
        "name",
        "patient__name",
        "ward__name",
        "lab_request__custom_id",
        "origin_role",
        "observation",
    ]
    ordering_fields = [
        "tenant",
        "custom_id",
        "name",
        "ward",
        "patient",
        "lab_request",
        "record_kind",
        "origin_role",
        "priority",
        "record_date",
        "created_at",
        "updated_at",
        "deleted",
    ]
    ordering = ["-record_date", "-created_at"]


class ProcedureCatalogViewSet(TenantScopedModelViewSet):
    queryset = ProcedureCatalog.objects.select_related("ward").all()
    serializer_class = ProcedureCatalogSerializer
    filterset_class = ProcedureCatalogFilter
    permission_classes = [IsAuthenticated]
    search_fields = [
        "custom_id",
        "name",
        "ward__name",
        "procedure_code",
        "description",
    ]
    ordering_fields = [
        "tenant",
        "custom_id",
        "name",
        "ward",
        "procedure_code",
        "estimated_duration_minutes",
        "active",
        "default_price",
        "created_at",
        "updated_at",
        "deleted",
    ]
    ordering = ["name", "-created_at"]


class ProcedureCatalogMaterialViewSet(TenantScopedModelViewSet):
    serializer_class = ProcedureCatalogMaterialSerializer
    filterset_class = ProcedureCatalogMaterialFilter
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return ProcedureCatalogMaterial.objects.select_related('ward', 'catalog', 'product', 'tenant')
    search_fields = [
        "custom_id",
        "ward__name",
        "catalog__name",
        "product__name",
    ]
    ordering_fields = [
        "tenant",
        "custom_id",
        "ward",
        "catalog",
        "product",
        "default_quantity",
        "default_unit_cost",
        "created_at",
        "updated_at",
        "deleted",
    ]
    ordering = ["catalog", "product", "-created_at"]


class ProcedureViewSet(TenantScopedModelViewSet):
    serializer_class = ProcedureSerializer
    filterset_class = ProcedureFilter
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return Procedure.objects.select_related('patient', 'ward', 'tenant')
    search_fields = [
        "custom_id",
        "patient__name",
        "ward__name",
        "notes",
    ]
    ordering_fields = [
        "tenant",
        "custom_id",
        "ward",
        "patient",
        "workflow_status",
        "billing_status",
        "performed_date",
        "billed_at",
        "executed_at",
        "completed_at",
        "services_subtotal",
        "materials_subtotal",
        "total",
        "created_at",
        "updated_at",
        "deleted",
    ]
    ordering = ["-performed_date", "-created_at"]

    @action(detail=True, methods=["get"], url_path="pdf", url_name="pdf")
    def pdf(self, request, pk=None):
        """
        Gera o PDF institucional do procedimento de enfermagem com detalhes clínicos e financeiros.
        """
        procedure = self.get_object()
        queued = queue_export_if_requested(
            request,
            export_key="procedure_pdf",
            payload={"procedure_id": procedure.id},
            content_disposition="inline",
        )
        if queued is not None:
            return queued

        from tasks.generate_pdf.procedure_pdf_generator import generate_procedure_pdf

        pdf_bytes, filename = generate_procedure_pdf(procedure, request=request)
        response = HttpResponse(pdf_bytes, content_type="application/pdf")
        response["Content-Disposition"] = f'inline; filename="{filename}"'
        return response


class ProcedureItemViewSet(TenantScopedModelViewSet):
    serializer_class = ProcedureItemSerializer
    filterset_class = ProcedureItemFilter
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return ProcedureItem.objects.select_related('ward', 'procedure', 'procedure__patient', 'catalog', 'tenant')
    search_fields = [
        "custom_id",
        "ward__name",
        "description",
        "catalog__name",
        "procedure__custom_id",
        "procedure__patient__name",
    ]
    ordering_fields = [
        "tenant",
        "custom_id",
        "ward",
        "position",
        "procedure",
        "catalog",
        "description",
        "quantity",
        "performed",
        "execution_status",
        "billed",
        "billed_at",
        "executed_at",
        "completed_at",
        "created_at",
        "updated_at",
        "deleted",
    ]
    ordering = ["procedure", "position", "id"]

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        self.perform_create(serializer)

        item = serializer.instance
        warnings = []
        if item is not None:
            pendentes = item.materiais_gerados.filter(inventory_movement__isnull=True).select_related("product").all()
            for material in pendentes:
                warnings.append(
                    {
                        "type": "ESTOQUE_INSUFICIENTE",
                        "product_id": material.product_id,
                        "product": material.product.name,
                        "quantity": material.quantity,
                        "message": (f"Estoque insuficiente na farmácia para '{material.product.name}'."),
                    }
                )

        data = dict(serializer.data)
        if warnings:
            data["warnings"] = warnings

        headers = self.get_success_headers(serializer.data)
        return Response(data, status=status.HTTP_201_CREATED, headers=headers)

    def _handle_model_validation_error(self, exc: DjangoValidationError):
        if hasattr(exc, "message_dict"):
            raise serializers.ValidationError(exc.message_dict) from exc
        if hasattr(exc, "messages"):
            raise serializers.ValidationError(exc.messages) from exc
        raise serializers.ValidationError(str(exc)) from exc

    def update(self, request, *args, **kwargs):
        """
        P1.3: CRÍTICO - Prevenir modificações diretas via PATCH/PUT em campos críticos.
        Use state transition endpoints (execute, complete, etc.).
        """
        # Campos que NÃO podem ser modificados via PATCH/PUT direto
        protected_fields = {
            'execution_status': 'Use /execute, /complete, or /mark-not-completed',
            'billed': 'Use /mark-billed',
            'billed_at': 'Campo read-only, definido automaticamente',
            'executed_at': 'Campo read-only, definido automaticamente',
            'completed_at': 'Campo read-only, definido automaticamente',
        }

        # Verificar se algum campo protegido está sendo modificado
        for field, reason in protected_fields.items():
            if field in request.data:
                raise serializers.ValidationError(
                    {field: f"Campo não pode ser modificado diretamente. {reason}"}
                )

        # Aplicar update normal para campos permitidos
        return super().update(request, *args, **kwargs)

    @action(detail=True, methods=["post"], url_path="execute", url_name="execute")
    def execute(self, request, pk=None):
        item = self.get_object()
        professional = request.user if getattr(request.user, "is_authenticated", False) else None
        try:
            item.mark_executed(professional=professional)
        except DjangoValidationError as exc:
            self._handle_model_validation_error(exc)
        item.refresh_from_db()
        return Response(self.get_serializer(item).data)

    @action(detail=True, methods=["post"], url_path="complete", url_name="complete")
    def complete(self, request, pk=None):
        item = self.get_object()
        try:
            item.mark_completed()
        except DjangoValidationError as exc:
            self._handle_model_validation_error(exc)
        item.refresh_from_db()
        return Response(self.get_serializer(item).data)

    @action(detail=True, methods=["post"], url_path="mark-not-completed", url_name="mark-not-completed")
    def mark_not_completed(self, request, pk=None):
        item = self.get_object()
        try:
            item.mark_not_completed()
        except DjangoValidationError as exc:
            self._handle_model_validation_error(exc)
        item.refresh_from_db()
        return Response(self.get_serializer(item).data)

    @action(detail=True, methods=["post"], url_path="mark-billed", url_name="mark-billed")
    def mark_billed(self, request, pk=None):
        item = self.get_object()
        try:
            item.mark_billed()
        except DjangoValidationError as exc:
            self._handle_model_validation_error(exc)
        item.refresh_from_db()
        return Response(self.get_serializer(item).data)


class ProcedureItemValueViewSet(TenantScopedModelViewSet):
    serializer_class = ProcedureItemValueSerializer
    filterset_class = ProcedureItemValueFilter
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return ProcedureItemValue.objects.select_related('ward', 'item', 'item__procedure', 'item__tenant')
    search_fields = [
        "custom_id",
        "ward__name",
        "item__custom_id",
        "item__description",
        "item__procedure__custom_id",
    ]
    ordering_fields = [
        "tenant",
        "custom_id",
        "ward",
        "item",
        "unit_price",
        "created_at",
        "updated_at",
        "deleted",
    ]
    ordering = ["-created_at"]


class ProcedureMaterialViewSet(TenantScopedModelViewSet):
    serializer_class = ProcedureMaterialSerializer
    filterset_class = ProcedureMaterialFilter
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return ProcedureMaterial.objects.select_related('ward', 'procedure', 'product', 'lot', 'tenant', 'value')
    search_fields = [
        "custom_id",
        "ward__name",
        "product__name",
        "lot__lot_number",
        "procedure__custom_id",
        "procedure_item__custom_id",
    ]
    ordering_fields = [
        "tenant",
        "custom_id",
        "ward",
        "position",
        "procedure",
        "procedure_item",
        "product",
        "lot",
        "quantity",
        "inventory_movement",
        "created_at",
        "updated_at",
        "deleted",
    ]
    ordering = ["procedure", "position", "id"]


class ProcedureMaterialValueViewSet(TenantScopedModelViewSet):
    serializer_class = ProcedureMaterialValueSerializer
    filterset_class = ProcedureMaterialValueFilter
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return ProcedureMaterialValue.objects.select_related('ward', 'material', 'material__product', 'material__procedure', 'tenant')
    search_fields = [
        "custom_id",
        "ward__name",
        "material__custom_id",
        "material__product__name",
        "material__procedure__custom_id",
    ]
    ordering_fields = [
        "tenant",
        "custom_id",
        "ward",
        "material",
        "unit_cost",
        "created_at",
        "updated_at",
        "deleted",
    ]
    ordering = ["-created_at"]


class NursingVitalSignViewSet(TenantScopedModelViewSet):
    serializer_class = NursingVitalSignSerializer
    filterset_class = NursingVitalSignFilter
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return NursingVitalSign.objects.select_related('ward', 'record', 'record__patient', 'tenant')
    search_fields = [
        "custom_id",
        "name",
        "ward__name",
        "record__patient__name",
        "blood_pressure",
    ]
    ordering_fields = [
        "tenant",
        "custom_id",
        "name",
        "ward",
        "record",
        "temperature_c",
        "heart_rate",
        "respiratory_rate",
        "oxygen_saturation",
        "collected_at",
        "created_at",
        "updated_at",
        "deleted",
    ]
    ordering = ["-collected_at", "-created_at"]


class NursingPrescriptionViewSet(TenantScopedModelViewSet):
    serializer_class = NursingPrescriptionSerializer
    filterset_class = NursingPrescriptionFilter
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return NursingPrescription.objects.select_related('patient', 'ward', 'tenant')
    search_fields = [
        "custom_id",
        "name",
        "patient__name",
        "ward__name",
        "description",
    ]
    ordering_fields = [
        "tenant",
        "custom_id",
        "name",
        "ward",
        "patient",
        "active",
        "prescription_date",
        "created_at",
        "updated_at",
        "deleted",
    ]
    ordering = ["-prescription_date", "-created_at"]


class NursingEvolutionViewSet(TenantScopedModelViewSet):
    serializer_class = NursingEvolutionSerializer
    filterset_class = NursingEvolutionFilter
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return NursingEvolution.objects.select_related('patient', 'ward', 'tenant')
    search_fields = [
        "custom_id",
        "name",
        "patient__name",
        "ward__name",
        "observation",
    ]
    ordering_fields = [
        "tenant",
        "custom_id",
        "name",
        "ward",
        "patient",
        "evolution_date",
        "created_at",
        "updated_at",
        "deleted",
    ]
    ordering = ["-evolution_date", "-created_at"]


class WardViewSet(TenantScopedModelViewSet):
    queryset = Ward.objects.all()
    serializer_class = WardSerializer
    filterset_class = WardFilter
    permission_classes = [IsAuthenticated]
    search_fields = ["custom_id", "name", "description"]
    ordering_fields = ["name", "created_at", "updated_at"]
    ordering = ["name"]

    @action(detail=True, methods=["post"], url_path="ativar", url_name="ativar")
    def ativar(self, request, pk=None):
        ward = self.get_object()
        try:
            WardAdmissionWorkflowService.activate_ward(ward)
        except DjangoValidationError as exc:
            raise _ward_as_drf_error(exc)
        return Response(self.get_serializer(ward).data)

    @action(detail=True, methods=["post"], url_path="inativar", url_name="inativar")
    def inativar(self, request, pk=None):
        ward = self.get_object()
        try:
            WardAdmissionWorkflowService.deactivate_ward(ward)
        except DjangoValidationError as exc:
            raise _ward_as_drf_error(exc)
        return Response(self.get_serializer(ward).data)


class WardBedViewSet(TenantScopedModelViewSet):
    queryset = WardBed.objects.select_related("ward").all()
    serializer_class = WardBedSerializer
    filterset_class = WardBedFilter
    permission_classes = [IsAuthenticated]
    search_fields = ["custom_id", "number", "ward__name"]
    ordering_fields = ["ward", "number", "created_at", "updated_at"]
    ordering = ["ward", "number", "-created_at"]

    @action(detail=True, methods=["post"], url_path="marcar-disponivel", url_name="marcar-disponivel")
    def marcar_disponivel(self, request, pk=None):
        bed = self.get_object()
        try:
            WardAdmissionWorkflowService.activate_bed(bed)
        except DjangoValidationError as exc:
            raise _ward_as_drf_error(exc)
        return Response(self.get_serializer(bed).data)

    @action(detail=True, methods=["post"], url_path="bloquear", url_name="bloquear")
    def bloquear(self, request, pk=None):
        bed = self.get_object()
        try:
            WardAdmissionWorkflowService.block_bed(bed)
        except DjangoValidationError as exc:
            raise _ward_as_drf_error(exc)
        return Response(self.get_serializer(bed).data)


class WardAdmissionViewSet(TenantScopedModelViewSet):
    queryset = WardAdmission.objects.select_related(
        "ward",
        "bed",
        "bed__ward",
        "patient",
    ).all()
    serializer_class = WardAdmissionSerializer
    filterset_class = WardAdmissionFilter
    permission_classes = [IsAuthenticated]
    search_fields = [
        "custom_id",
        "patient__name",
        "ward__name",
        "bed__number",
        "bed__ward__name",
        "next_medication_description",
        "notes",
    ]
    ordering_fields = [
        "admission_date",
        "ward",
        "expected_discharge_date",
        "discharged_at",
        "next_medication_at",
        "created_at",
    ]
    ordering = ["-admission_date", "-created_at"]

    @action(detail=False, methods=["post"], url_path="internar", url_name="internar")
    def internar(self, request):
        tenant = getattr(request, "tenant", None)
        bed = _ward_resolve("enfermagem", "WardBed", request.data.get("bed"), tenant)
        patient = _ward_resolve("clinical", "Patient", request.data.get("patient"), tenant)
        if bed is None or patient is None:
            raise DRFValidationError({"bed": "Cama e paciente são obrigatórios."})
        try:
            admission = WardAdmissionWorkflowService.admit_patient(
                bed=bed,
                patient=patient,
                expected_discharge_date=request.data.get("expected_discharge_date") or None,
                estimated_observation_hours=request.data.get("estimated_observation_hours") or None,
                notes=request.data.get("notes", ""),
            )
        except DjangoValidationError as exc:
            raise _ward_as_drf_error(exc)
        return Response(self.get_serializer(admission).data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=["post"], url_path="transferir", url_name="transferir")
    def transferir(self, request, pk=None):
        admission = self.get_object()
        external_hospital = str(request.data.get("external_hospital") or "").strip()
        if external_hospital:
            try:
                WardAdmissionWorkflowService.discharge_patient(
                    admission,
                    condition=f"Transferido para outro hospital: {external_hospital}",
                    notes=request.data.get("reason", ""),
                )
            except DjangoValidationError as exc:
                raise _ward_as_drf_error(exc)
            return Response(self.get_serializer(admission).data)

        new_bed = _ward_resolve("enfermagem", "WardBed", request.data.get("new_bed"), getattr(request, "tenant", None))
        if new_bed is None:
            raise DRFValidationError({"new_bed": "Cama de destino é obrigatória."})
        try:
            new_admission = WardAdmissionWorkflowService.transfer_patient(
                admission, new_bed=new_bed, reason=request.data.get("reason", "")
            )
        except DjangoValidationError as exc:
            raise _ward_as_drf_error(exc)
        return Response(self.get_serializer(new_admission).data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=["post"], url_path="alta", url_name="alta")
    def alta(self, request, pk=None):
        admission = self.get_object()
        try:
            WardAdmissionWorkflowService.discharge_patient(
                admission, condition=request.data.get("condition", ""), notes=request.data.get("notes", "")
            )
        except DjangoValidationError as exc:
            raise _ward_as_drf_error(exc)
        return Response(self.get_serializer(admission).data)

    @action(detail=True, methods=["post"], url_path="registrar-obito", url_name="registrar-obito")
    def registrar_obito(self, request, pk=None):
        admission = self.get_object()
        try:
            WardAdmissionWorkflowService.register_death(admission, notes=request.data.get("notes", ""))
        except DjangoValidationError as exc:
            raise _ward_as_drf_error(exc)
        return Response(self.get_serializer(admission).data)


class WardDashboardViewSet(ValidatedSearchOrderingMixin, ViewSet):
    """
    Operational ward dashboard (occupancy + upcoming medications).
    """

    permission_classes = [IsAuthenticated]
    http_method_names = ["get", "head", "options"]

    @extend_schema(responses={200: WardDashboardResponseSerializer})
    def list(self, request):
        tenant = getattr(request, "tenant", None)

        camas_qs = WardBed.objects.filter(deleted=False, active=True)
        if tenant is not None:
            camas_qs = camas_qs.filter(tenant=tenant)

        intern_qs = WardAdmission.objects.filter(deleted=False, active=True).select_related(
            "bed", "bed__ward", "patient"
        )
        if tenant is not None:
            intern_qs = intern_qs.filter(tenant=tenant)

        total_beds = camas_qs.count()
        occupied_beds = intern_qs.values("bed_id").distinct().count()
        patients = intern_qs.values("patient_id").distinct().count()

        beds = []
        for it in intern_qs.order_by("bed__ward__name", "bed__number", "next_medication_at"):
            beds.append(
                {
                    "admission_id": it.id,
                    "admission_code": getattr(it, "custom_id", "") or "",
                    "ward": getattr(getattr(it.bed, "ward", None), "name", "") or "",
                    "bed_id": it.bed_id,
                    "bed_number": getattr(it.bed, "number", "") or "",
                    "patient_id": it.patient_id,
                    "patient_name": getattr(it.patient, "name", "") or "",
                    "admission_date": getattr(it, "admission_date", None),
                    "expected_discharge_date": getattr(it, "expected_discharge_date", None),
                    "estimated_observation_hours": getattr(it, "estimated_observation_hours", None),
                    "next_medication_at": getattr(it, "next_medication_at", None),
                    "next_medication_description": getattr(it, "next_medication_description", "") or "",
                }
            )

        payload = {
            "summary": {
                "patients": patients,
                "total_beds": total_beds,
                "occupied_beds": occupied_beds,
                "available_beds": max(0, total_beds - occupied_beds),
            },
            "beds": beds,
        }
        return Response(WardDashboardResponseSerializer(instance=payload).data)


VIEWSET_MAP = {
    "nursing_evolution": NursingEvolutionViewSet,
    "procedure_catalog": ProcedureCatalogViewSet,
    "procedure_catalog_material": ProcedureCatalogMaterialViewSet,
    "procedure": ProcedureViewSet,
    "procedure_item": ProcedureItemViewSet,
    "procedure_item_value": ProcedureItemValueViewSet,
    "procedure_material": ProcedureMaterialViewSet,
    "procedure_material_value": ProcedureMaterialValueViewSet,
    "nursing_prescription": NursingPrescriptionViewSet,
    "nursing_record": NursingRecordViewSet,
    "nursing_vital_sign": NursingVitalSignViewSet,
    "ward": WardViewSet,
    "ward_bed": WardBedViewSet,
    "ward_admission": WardAdmissionViewSet,
    "ward_dashboard": WardDashboardViewSet,
}


__all__ = [
    "VIEWSET_MAP",
    "NursingEvolutionViewSet",
    "NursingPrescriptionViewSet",
    "NursingRecordViewSet",
    "NursingVitalSignViewSet",
    "ProcedureCatalogMaterialViewSet",
    "ProcedureCatalogViewSet",
    "ProcedureItemValueViewSet",
    "ProcedureItemViewSet",
    "ProcedureMaterialValueViewSet",
    "ProcedureMaterialViewSet",
    "ProcedureViewSet",
    "WardAdmissionViewSet",
    "WardBedViewSet",
    "WardDashboardViewSet",
    "WardViewSet",
]
