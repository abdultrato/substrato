from drf_spectacular.utils import extend_schema
from rest_framework import serializers, status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.viewsets import ModelViewSet, ViewSet

from api.v1.viewset_mixins import TenantScopedQuerysetMixin, ValidatedSearchOrderingMixin
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


class TenantScopedModelViewSet(ValidatedSearchOrderingMixin, TenantScopedQuerysetMixin, ModelViewSet):
    permission_classes = [IsAuthenticated]


class WardDashboardSummarySerializer(serializers.Serializer):
    pacientes = serializers.IntegerField()
    camas_total = serializers.IntegerField()
    camas_ocupadas = serializers.IntegerField()
    camas_livres = serializers.IntegerField()


class WardDashboardBedSerializer(serializers.Serializer):
    internamento_id = serializers.IntegerField()
    internamento_code = serializers.CharField(allow_blank=True)
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
    resumo = WardDashboardSummarySerializer()
    camas = WardDashboardBedSerializer(many=True)


class NursingRecordViewSet(TenantScopedModelViewSet):
    queryset = NursingRecord.objects.all()
    serializer_class = NursingRecordSerializer
    filterset_class = NursingRecordFilter
    permission_classes = [IsAuthenticated]
    search_fields = [
        "custom_id",
        "name",
        "patient__name",
        "observation",
    ]
    ordering_fields = [
        "tenant",
        "custom_id",
        "name",
        "patient",
        "priority",
        "record_date",
        "created_at",
        "updated_at",
        "deleted",
    ]
    ordering = ["-record_date", "-created_at"]


class ProcedureCatalogViewSet(TenantScopedModelViewSet):
    queryset = ProcedureCatalog.objects.all()
    serializer_class = ProcedureCatalogSerializer
    filterset_class = ProcedureCatalogFilter
    permission_classes = [IsAuthenticated]
    search_fields = [
        "custom_id",
        "name",
        "description",
    ]
    ordering_fields = [
        "tenant",
        "custom_id",
        "name",
        "default_price",
        "created_at",
        "updated_at",
        "deleted",
    ]
    ordering = ["name", "-created_at"]


class ProcedureCatalogMaterialViewSet(TenantScopedModelViewSet):
    queryset = ProcedureCatalogMaterial.objects.all()
    serializer_class = ProcedureCatalogMaterialSerializer
    filterset_class = ProcedureCatalogMaterialFilter
    permission_classes = [IsAuthenticated]
    search_fields = [
        "custom_id",
        "catalog__name",
        "product__name",
    ]
    ordering_fields = [
        "tenant",
        "custom_id",
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
    queryset = Procedure.objects.all()
    serializer_class = ProcedureSerializer
    filterset_class = ProcedureFilter
    permission_classes = [IsAuthenticated]
    search_fields = [
        "custom_id",
        "patient__name",
        "notes",
    ]
    ordering_fields = [
        "tenant",
        "custom_id",
        "patient",
        "professional",
        "performed_date",
        "services_subtotal",
        "materials_subtotal",
        "total",
        "created_at",
        "updated_at",
        "deleted",
    ]
    ordering = ["-performed_date", "-created_at"]


class ProcedureItemViewSet(TenantScopedModelViewSet):
    queryset = ProcedureItem.objects.all()
    serializer_class = ProcedureItemSerializer
    filterset_class = ProcedureItemFilter
    permission_classes = [IsAuthenticated]
    search_fields = [
        "custom_id",
        "description",
        "catalog__name",
        "procedure__custom_id",
        "procedure__patient__name",
    ]
    ordering_fields = [
        "tenant",
        "custom_id",
        "procedure",
        "catalog",
        "description",
        "quantity",
        "performed",
        "created_at",
        "updated_at",
        "deleted",
    ]
    ordering = ["-created_at"]

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


class ProcedureItemValueViewSet(TenantScopedModelViewSet):
    queryset = ProcedureItemValue.objects.all()
    serializer_class = ProcedureItemValueSerializer
    filterset_class = ProcedureItemValueFilter
    permission_classes = [IsAuthenticated]
    search_fields = [
        "custom_id",
        "item__custom_id",
        "item__description",
        "item__procedure__custom_id",
    ]
    ordering_fields = [
        "tenant",
        "custom_id",
        "item",
        "unit_price",
        "created_at",
        "updated_at",
        "deleted",
    ]
    ordering = ["-created_at"]


class ProcedureMaterialViewSet(TenantScopedModelViewSet):
    queryset = ProcedureMaterial.objects.all()
    serializer_class = ProcedureMaterialSerializer
    filterset_class = ProcedureMaterialFilter
    permission_classes = [IsAuthenticated]
    search_fields = [
        "custom_id",
        "product__name",
        "lot__lot_number",
        "procedure__custom_id",
        "procedure__patient__name",
        "procedure_item__custom_id",
    ]
    ordering_fields = [
        "tenant",
        "custom_id",
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
    ordering = ["-created_at"]


class ProcedureMaterialValueViewSet(TenantScopedModelViewSet):
    queryset = ProcedureMaterialValue.objects.all()
    serializer_class = ProcedureMaterialValueSerializer
    filterset_class = ProcedureMaterialValueFilter
    permission_classes = [IsAuthenticated]
    search_fields = [
        "custom_id",
        "material__custom_id",
        "material__product__name",
        "material__procedure__custom_id",
    ]
    ordering_fields = [
        "tenant",
        "custom_id",
        "material",
        "unit_cost",
        "created_at",
        "updated_at",
        "deleted",
    ]
    ordering = ["-created_at"]


class NursingVitalSignViewSet(TenantScopedModelViewSet):
    queryset = NursingVitalSign.objects.all()
    serializer_class = NursingVitalSignSerializer
    filterset_class = NursingVitalSignFilter
    permission_classes = [IsAuthenticated]
    search_fields = [
        "custom_id",
        "name",
        "record__patient__name",
        "blood_pressure",
    ]
    ordering_fields = [
        "tenant",
        "custom_id",
        "name",
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
    queryset = NursingPrescription.objects.all()
    serializer_class = NursingPrescriptionSerializer
    filterset_class = NursingPrescriptionFilter
    permission_classes = [IsAuthenticated]
    search_fields = [
        "custom_id",
        "name",
        "patient__name",
        "description",
    ]
    ordering_fields = [
        "tenant",
        "custom_id",
        "name",
        "patient",
        "active",
        "prescription_date",
        "created_at",
        "updated_at",
        "deleted",
    ]
    ordering = ["-prescription_date", "-created_at"]


class NursingEvolutionViewSet(TenantScopedModelViewSet):
    queryset = NursingEvolution.objects.all()
    serializer_class = NursingEvolutionSerializer
    filterset_class = NursingEvolutionFilter
    permission_classes = [IsAuthenticated]
    search_fields = [
        "custom_id",
        "name",
        "patient__name",
        "observation",
    ]
    ordering_fields = [
        "tenant",
        "custom_id",
        "name",
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


class WardBedViewSet(TenantScopedModelViewSet):
    queryset = WardBed.objects.select_related("ward").all()
    serializer_class = WardBedSerializer
    filterset_class = WardBedFilter
    permission_classes = [IsAuthenticated]
    search_fields = ["custom_id", "number", "ward__name"]
    ordering_fields = ["ward", "number", "created_at", "updated_at"]
    ordering = ["ward", "number", "-created_at"]


class WardAdmissionViewSet(TenantScopedModelViewSet):
    queryset = WardAdmission.objects.select_related(
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
        "bed__number",
        "bed__ward__name",
        "next_medication_description",
        "notes",
    ]
    ordering_fields = [
        "admission_date",
        "expected_discharge_date",
        "discharged_at",
        "next_medication_at",
        "created_at",
    ]
    ordering = ["-admission_date", "-created_at"]


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

        total_camas = camas_qs.count()
        camas_ocupadas = intern_qs.values("bed_id").distinct().count()
        pacientes = intern_qs.values("patient_id").distinct().count()

        camas = []
        for it in intern_qs.order_by("bed__ward__name", "bed__number", "next_medication_at"):
            camas.append(
                {
                    "internamento_id": it.id,
                    "internamento_code": getattr(it, "custom_id", "") or "",
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

        return Response(
            {
                "resumo": {
                    "pacientes": pacientes,
                    "camas_total": total_camas,
                    "camas_ocupadas": camas_ocupadas,
                    "camas_livres": max(0, total_camas - camas_ocupadas),
                },
                "camas": camas,
            }
        )


VIEWSET_MAP = {
    "evolucaoenfermagem": NursingEvolutionViewSet,
    "procedimentocatalogo": ProcedureCatalogViewSet,
    "procedimentocatalogomaterial": ProcedureCatalogMaterialViewSet,
    "procedure": ProcedureViewSet,
    "procedimentoitem": ProcedureItemViewSet,
    "procedimentoitemvalor": ProcedureItemValueViewSet,
    "procedimentomaterial": ProcedureMaterialViewSet,
    "procedimentomaterialvalor": ProcedureMaterialValueViewSet,
    "prescricaoenfermagem": NursingPrescriptionViewSet,
    "registroenfermagem": NursingRecordViewSet,
    "sinalvitalenfermagem": NursingVitalSignViewSet,
    "ward": WardViewSet,
    "camaenfermaria": WardBedViewSet,
    "internamentoenfermaria": WardAdmissionViewSet,
    "enfermariadashboard": WardDashboardViewSet,
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


RegistroEnfermagemViewSet = NursingRecordViewSet
ProcedimentoCatalogoViewSet = ProcedureCatalogViewSet
ProcedimentoCatalogoMaterialViewSet = ProcedureCatalogMaterialViewSet
ProcedimentoViewSet = ProcedureViewSet
ProcedimentoItemViewSet = ProcedureItemViewSet
ProcedimentoItemValorViewSet = ProcedureItemValueViewSet
ProcedimentoMaterialViewSet = ProcedureMaterialViewSet
ProcedimentoMaterialValorViewSet = ProcedureMaterialValueViewSet
SinalVitalEnfermagemViewSet = NursingVitalSignViewSet
PrescricaoEnfermagemViewSet = NursingPrescriptionViewSet
EvolucaoEnfermagemViewSet = NursingEvolutionViewSet
EnfermariaViewSet = WardViewSet
CamaEnfermariaViewSet = WardBedViewSet
InternamentoEnfermariaViewSet = WardAdmissionViewSet
EnfermariaDashboardViewSet = WardDashboardViewSet
