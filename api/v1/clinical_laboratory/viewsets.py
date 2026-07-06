"""ViewSets da API do Laboratório Clínico (LIS).

Seguem o padrão do projeto: ValidatedSearchOrderingMixin + TenantScopedQuerysetMixin
+ ModelViewSet. O isolamento por tenant e o RBAC são aplicados centralmente
(register_routes força RBACPermission).
"""

from django.core.exceptions import ValidationError as DjangoValidationError
from rest_framework.decorators import action
from rest_framework.exceptions import ValidationError as DRFValidationError
from rest_framework.response import Response
from rest_framework.viewsets import ModelViewSet

from api.v1.viewset_mixins import TenantScopedQuerysetMixin, ValidatedSearchOrderingMixin


def _as_drf_error(exc: DjangoValidationError) -> DRFValidationError:
    detail = getattr(exc, "message_dict", None) or getattr(exc, "messages", None) or [str(exc)]
    return DRFValidationError(detail)


def _current_user(request):
    user = getattr(request, "user", None)
    return user if (user is not None and getattr(user, "is_authenticated", False)) else None
from apps.clinical_laboratory.models import (
    AcidFastSmear,
    AntibioticSusceptibility,
    CriticalResultNotification,
    MicrobiologyCulture,
    MicrobiologyIsolate,
    MolecularResult,
    LabContainerType,
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
    TrainingReplication,
    TrainingAttachment,
    TrainingAttendance,
    CompetencyAssessment,
    CustomerComplaint,
    LabRiskAssessment,
    ManagementReview,
    BiologicalHazard,
    TransmissionRoute,
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
    LabContainerTypeSerializer,
    QualityDocumentSerializer,
    NonconformitySerializer,
    CorrectiveActionSerializer,
    InternalAuditSerializer,
    AuditFindingSerializer,
    QualityIndicatorSerializer,
    StaffTrainingRecordSerializer,
    TrainingReplicationSerializer,
    TrainingAttachmentSerializer,
    TrainingAttendanceSerializer,
    CompetencyAssessmentSerializer,
    CustomerComplaintSerializer,
    LabRiskAssessmentSerializer,
    ManagementReviewSerializer,
    BiologicalHazardSerializer,
    TransmissionRouteSerializer,
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
    LabTestFieldSerializer,
    LabTestPanelSerializer,
    LabTestSerializer,
    LabWorklistSerializer,
    ResultValidationSerializer,
    SampleCollectionSerializer,
    SampleReceptionSerializer,
    SampleRejectionSerializer,
)


class _CatalogActivationMixin:
    """Acções comuns de ativar/inativar para itens de catálogo (`active`)."""

    @action(detail=True, methods=["post"], url_path="ativar", url_name="ativar")
    def ativar(self, request, pk=None):
        obj = self.get_object()
        obj.activate()
        return Response(self.get_serializer(obj).data)

    @action(detail=True, methods=["post"], url_path="inativar", url_name="inativar")
    def inativar(self, request, pk=None):
        obj = self.get_object()
        obj.deactivate()
        return Response(self.get_serializer(obj).data)


class LabContainerTypeViewSet(_CatalogActivationMixin, ValidatedSearchOrderingMixin, TenantScopedQuerysetMixin, ModelViewSet):
    queryset = LabContainerType.objects.all()
    serializer_class = LabContainerTypeSerializer
    filterset_fields = ["active", "cap_color", "conservation_temperature"]
    search_fields = ["custom_id", "code", "name", "additive", "specimen_yields"]
    ordering_fields = ["code", "name", "cap_color", "active", "created_at"]


class LabSectorViewSet(_CatalogActivationMixin, ValidatedSearchOrderingMixin, TenantScopedQuerysetMixin, ModelViewSet):
    queryset = LabSector.objects.all()
    serializer_class = LabSectorSerializer
    filterset_fields = ["active"]
    search_fields = ["custom_id", "code", "name"]
    ordering_fields = ["code", "name", "active", "created_at"]


class LabTestViewSet(_CatalogActivationMixin, ValidatedSearchOrderingMixin, TenantScopedQuerysetMixin, ModelViewSet):
    queryset = LabTest.objects.select_related("sector").all()
    serializer_class = LabTestSerializer
    search_fields = ["custom_id", "code", "name", "method", "unit"]
    ordering_fields = ["code", "name", "price", "turnaround_hours", "active", "created_at"]
    filterset_fields = ["sector", "active", "sample_type", "requires_fasting", "requires_consent"]


class LabTestFieldViewSet(_CatalogActivationMixin, ValidatedSearchOrderingMixin, TenantScopedQuerysetMixin, ModelViewSet):
    queryset = LabTestField.objects.select_related("test").all()
    serializer_class = LabTestFieldSerializer
    # Campos são "segunda camada": o frontend lista-os filtrados pelo exame
    # (`?test=<id>`) dentro do detalhe do exame.
    filterset_fields = ["test", "active"]
    search_fields = ["custom_id", "code", "name", "unit"]
    ordering_fields = ["test", "sequence", "name", "active", "created_at"]


class LabTestPanelViewSet(_CatalogActivationMixin, ValidatedSearchOrderingMixin, TenantScopedQuerysetMixin, ModelViewSet):
    queryset = LabTestPanel.objects.select_related("sector").prefetch_related("tests__sector").all()
    serializer_class = LabTestPanelSerializer
    filterset_fields = ["sector", "active", "profile_type"]
    search_fields = ["custom_id", "code", "name"]
    ordering_fields = ["code", "name", "package_price", "active", "created_at"]


class LabOrderViewSet(ValidatedSearchOrderingMixin, TenantScopedQuerysetMixin, ModelViewSet):
    queryset = LabOrder.objects.select_related(
        "patient",
        "requesting_physician",
    ).prefetch_related("items__test__sector").all()
    serializer_class = LabOrderSerializer
    search_fields = ["custom_id", "origin", "diagnosis", "clinical_indication"]
    ordering_fields = ["requested_at", "status", "priority", "payment_status", "created_at"]

    @action(detail=True, methods=["post"], url_path="autorizar", url_name="autorizar")
    def autorizar(self, request, pk=None):
        order = self.get_object()
        try:
            order.authorize()
        except DjangoValidationError as exc:
            raise _as_drf_error(exc)
        return Response(self.get_serializer(order).data)

    @action(detail=True, methods=["post"], url_path="cancelar", url_name="cancelar")
    def cancelar(self, request, pk=None):
        order = self.get_object()
        try:
            order.cancel()
        except DjangoValidationError as exc:
            raise _as_drf_error(exc)
        return Response(self.get_serializer(order).data)


class LabOrderItemViewSet(ValidatedSearchOrderingMixin, TenantScopedQuerysetMixin, ModelViewSet):
    queryset = LabOrderItem.objects.select_related("order", "test", "test__sector").all()
    serializer_class = LabOrderItemSerializer
    # Itens são "segunda camada": o frontend lista-os filtrados pelo pedido
    # (`?order=<id>`) dentro do detalhe da requisição, nunca como lista solta.
    filterset_fields = ["order", "status"]
    search_fields = ["custom_id"]
    ordering_fields = ["status", "price", "created_at"]


class SampleCollectionViewSet(ValidatedSearchOrderingMixin, TenantScopedQuerysetMixin, ModelViewSet):
    queryset = SampleCollection.objects.select_related("order", "patient", "collected_by").all()
    serializer_class = SampleCollectionSerializer
    search_fields = ["custom_id", "barcode", "location"]
    ordering_fields = ["status", "collection_at", "created_at"]

    @action(detail=True, methods=["post"], url_path="colher", url_name="colher")
    def colher(self, request, pk=None):
        collection = self.get_object()
        if collection.status not in {SampleCollection.Status.PENDING, SampleCollection.Status.FAILED}:
            raise _as_drf_error(DjangoValidationError("Só é possível registar a colheita de colheitas pendentes ou falhadas."))
        collection.mark_collected(by=_current_user(request))
        return Response(self.get_serializer(collection).data)

    @action(detail=True, methods=["post"], url_path="enviar", url_name="enviar")
    def enviar(self, request, pk=None):
        collection = self.get_object()
        if collection.status != SampleCollection.Status.COLLECTED:
            raise _as_drf_error(DjangoValidationError("Só é possível enviar ao laboratório colheitas no estado 'Colhida'."))
        collection.send_to_lab()
        return Response(self.get_serializer(collection).data)

    @action(detail=True, methods=["post"], url_path="falhar", url_name="falhar")
    def falhar(self, request, pk=None):
        collection = self.get_object()
        if collection.status in {SampleCollection.Status.SENT, SampleCollection.Status.CANCELLED}:
            raise _as_drf_error(DjangoValidationError("Não é possível marcar como falhada uma colheita já enviada ou cancelada."))
        collection.mark_failed()
        return Response(self.get_serializer(collection).data)


class LabSampleViewSet(ValidatedSearchOrderingMixin, TenantScopedQuerysetMixin, ModelViewSet):
    queryset = LabSample.objects.select_related("order", "order__patient", "collection").all()
    serializer_class = LabSampleSerializer
    search_fields = ["custom_id", "barcode", "storage_location"]
    ordering_fields = ["status", "received_at", "collected_at", "created_at"]

    @action(detail=True, methods=["post"], url_path="receber", url_name="receber")
    def receber(self, request, pk=None):
        sample = self.get_object()
        try:
            sample.receive()
        except DjangoValidationError as exc:
            raise _as_drf_error(exc)
        return Response(self.get_serializer(sample).data)

    @action(detail=True, methods=["post"], url_path="aceitar", url_name="aceitar")
    def aceitar(self, request, pk=None):
        sample = self.get_object()
        try:
            sample.accept()
        except DjangoValidationError as exc:
            raise _as_drf_error(exc)
        return Response(self.get_serializer(sample).data)

    @action(detail=True, methods=["post"], url_path="rejeitar", url_name="rejeitar")
    def rejeitar(self, request, pk=None):
        sample = self.get_object()
        try:
            sample.reject()
        except DjangoValidationError as exc:
            raise _as_drf_error(exc)
        return Response(self.get_serializer(sample).data)


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
    queryset = LabResult.objects.select_related(
        "order_item__order__patient", "order_item__test", "test_field", "sample", "performed_by"
    ).all()
    serializer_class = LabResultSerializer
    search_fields = ["custom_id", "value", "unit", "method", "equipment"]
    ordering_fields = ["status", "flag", "performed_at", "created_at"]

    @action(detail=True, methods=["post"], url_path="inserir-resultado", url_name="inserir-resultado")
    def inserir_resultado(self, request, pk=None):
        result = self.get_object()
        try:
            result.enter_result(value=request.data.get("value", ""), by=_current_user(request))
        except DjangoValidationError as exc:
            raise _as_drf_error(exc)
        return Response(self.get_serializer(result).data)

    @action(detail=True, methods=["post"], url_path="validar", url_name="validar")
    def validar(self, request, pk=None):
        result = self.get_object()
        try:
            result.mark_validated()
        except DjangoValidationError as exc:
            raise _as_drf_error(exc)
        return Response(self.get_serializer(result).data)


class ResultValidationViewSet(ValidatedSearchOrderingMixin, TenantScopedQuerysetMixin, ModelViewSet):
    queryset = ResultValidation.objects.select_related("result", "validated_by").all()
    serializer_class = ResultValidationSerializer
    # Validação é vinculada ao resultado: o frontend lista-as filtradas por
    # `?result=<id>` no detalhe do resultado e cria-as em contexto, não como
    # recurso solto. Ver FRONTEND_API_EXPOSURE_MATRIX.md / readiness.
    filterset_fields = ["result", "status", "validation_type"]
    search_fields = ["custom_id", "notes"]
    ordering_fields = ["validation_type", "status", "validated_at", "created_at"]

    @action(detail=True, methods=["post"], url_path="aprovar", url_name="aprovar")
    def aprovar(self, request, pk=None):
        validation = self.get_object()
        try:
            validation.approve(by=_current_user(request))
        except DjangoValidationError as exc:
            raise _as_drf_error(exc)
        return Response(self.get_serializer(validation).data)


class LabReportViewSet(ValidatedSearchOrderingMixin, TenantScopedQuerysetMixin, ModelViewSet):
    queryset = LabReport.objects.select_related("order", "patient", "signed_by").all()
    serializer_class = LabReportSerializer
    search_fields = ["custom_id", "report_number"]
    ordering_fields = ["status", "issued_at", "delivered_at", "created_at"]

    @action(detail=True, methods=["post"], url_path="assinar", url_name="assinar")
    def assinar(self, request, pk=None):
        report = self.get_object()
        try:
            report.sign(by=_current_user(request))
        except DjangoValidationError as exc:
            raise _as_drf_error(exc)
        return Response(self.get_serializer(report).data)

    @action(detail=True, methods=["post"], url_path="entregar", url_name="entregar")
    def entregar(self, request, pk=None):
        report = self.get_object()
        try:
            report.deliver(channel=request.data.get("channel", ""))
        except DjangoValidationError as exc:
            raise _as_drf_error(exc)
        return Response(self.get_serializer(report).data)


class CriticalResultNotificationViewSet(ValidatedSearchOrderingMixin, TenantScopedQuerysetMixin, ModelViewSet):
    queryset = CriticalResultNotification.objects.select_related(
        "result",
        "result__order_item__test",
        "result__test_field",
        "order",
        "patient",
        "notified_by",
    ).all()
    serializer_class = CriticalResultNotificationSerializer
    filterset_fields = ["readback_confirmed", "method", "order"]
    search_fields = ["custom_id", "notified_professional", "notes"]
    ordering_fields = ["notified_at", "readback_confirmed", "method", "created_at"]


class MicrobiologyCultureViewSet(ValidatedSearchOrderingMixin, TenantScopedQuerysetMixin, ModelViewSet):
    queryset = MicrobiologyCulture.objects.select_related("order_item", "sample", "performed_by").all()
    serializer_class = MicrobiologyCultureSerializer
    filterset_fields = ["status", "culture_type"]
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
    filterset_fields = ["result", "method", "isolate"]
    search_fields = ["custom_id", "antibiotic", "mic_value"]
    ordering_fields = ["antibiotic", "result", "method", "created_at"]


class MolecularResultViewSet(ValidatedSearchOrderingMixin, TenantScopedQuerysetMixin, ModelViewSet):
    queryset = MolecularResult.objects.select_related("order_item", "sample", "performed_by").all()
    serializer_class = MolecularResultSerializer
    filterset_fields = ["assay", "detection", "rif_resistance"]
    search_fields = ["custom_id", "instrument", "notes"]
    ordering_fields = ["assay", "detection", "performed_at", "created_at"]


class AcidFastSmearViewSet(ValidatedSearchOrderingMixin, TenantScopedQuerysetMixin, ModelViewSet):
    queryset = AcidFastSmear.objects.select_related("order_item", "sample", "performed_by").all()
    serializer_class = AcidFastSmearSerializer
    filterset_fields = ["stain", "grade"]
    search_fields = ["custom_id", "afb_count", "notes"]
    ordering_fields = ["grade", "stain", "performed_at", "created_at"]


# --- Gestão da Qualidade ---
class QualityDocumentViewSet(ValidatedSearchOrderingMixin, TenantScopedQuerysetMixin, ModelViewSet):
    queryset = QualityDocument.objects.select_related("sector", "owner").all()
    serializer_class = QualityDocumentSerializer
    search_fields = ["custom_id", "code", "title"]
    ordering_fields = ["code", "status", "document_type", "review_date", "created_at"]

    def perform_update(self, serializer):
        serializer.save()
        serializer.instance.increment_version()

    @action(detail=True, methods=["post"], url_path="aprovar", url_name="aprovar")
    def aprovar(self, request, pk=None):
        document = self.get_object()
        try:
            document.approve(by=_current_user(request))
        except DjangoValidationError as exc:
            raise _as_drf_error(exc)
        return Response(self.get_serializer(document).data)


class NonconformityViewSet(ValidatedSearchOrderingMixin, TenantScopedQuerysetMixin, ModelViewSet):
    queryset = Nonconformity.objects.select_related("sector").all()
    serializer_class = NonconformitySerializer
    search_fields = ["custom_id", "code", "description", "source_ref"]
    ordering_fields = ["detected_at", "severity", "status", "created_at"]

    @action(detail=True, methods=["post"], url_path="encerrar", url_name="encerrar")
    def encerrar(self, request, pk=None):
        nc = self.get_object()
        try:
            nc.close()
        except DjangoValidationError as exc:
            raise _as_drf_error(exc)
        return Response(self.get_serializer(nc).data)


class CorrectiveActionViewSet(ValidatedSearchOrderingMixin, TenantScopedQuerysetMixin, ModelViewSet):
    queryset = CorrectiveAction.objects.select_related("nonconformity").all()
    serializer_class = CorrectiveActionSerializer
    search_fields = ["custom_id", "description"]
    ordering_fields = ["due_date", "status", "action_type", "created_at"]

    @action(detail=True, methods=["post"], url_path="concluir", url_name="concluir")
    def concluir(self, request, pk=None):
        capa = self.get_object()
        try:
            capa.complete()
        except DjangoValidationError as exc:
            raise _as_drf_error(exc)
        return Response(self.get_serializer(capa).data)

    @action(detail=True, methods=["post"], url_path="verificar", url_name="verificar")
    def verificar(self, request, pk=None):
        capa = self.get_object()
        effective = request.data.get("effective", True)
        if isinstance(effective, str):
            effective = effective.strip().lower() not in ("false", "0", "nao", "não", "no")
        try:
            capa.verify(effective=bool(effective), notes=request.data.get("notes", ""))
        except DjangoValidationError as exc:
            raise _as_drf_error(exc)
        return Response(self.get_serializer(capa).data)

    @action(detail=True, methods=["post"], url_path="fechar", url_name="fechar")
    def fechar(self, request, pk=None):
        capa = self.get_object()
        try:
            capa.close()
        except DjangoValidationError as exc:
            raise _as_drf_error(exc)
        return Response(self.get_serializer(capa).data)


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
    queryset = StaffTrainingRecord.objects.select_related("staff").prefetch_related("participants").all()
    serializer_class = StaffTrainingRecordSerializer
    search_fields = ["custom_id", "title", "trainer"]
    ordering_fields = ["training_date", "expiry_date", "status", "created_at"]

    @action(detail=True, methods=["post"], url_path="marcar-realizada", url_name="marcar_realizada")
    def marcar_realizada(self, request, pk=None):
        from django.db import transaction
        obj = self.get_object()
        attendances = request.data.get("attendances", [])  # [{participant_id, present}]

        with transaction.atomic():
            obj.status = StaffTrainingRecord.Status.COMPLETED
            obj.save(update_fields=["status", "updated_at"])

            tenant = self._get_request_tenant()
            user = _current_user(request)
            for entry in attendances:
                pid = entry.get("participant_id")
                present = bool(entry.get("present", True))
                if not pid:
                    continue
                defaults = {"present": present}
                if tenant:
                    defaults["tenant"] = tenant
                if user:
                    defaults["created_by"] = user
                    defaults["updated_by"] = user
                TrainingAttendance.objects.update_or_create(
                    training=obj, participant_id=pid,
                    defaults=defaults,
                )

        return Response(self.get_serializer(obj).data)


class TrainingReplicationViewSet(ValidatedSearchOrderingMixin, TenantScopedQuerysetMixin, ModelViewSet):
    queryset = TrainingReplication.objects.select_related("original", "replicator").prefetch_related("participants").all()
    serializer_class = TrainingReplicationSerializer
    search_fields = ["custom_id", "original__title"]
    ordering_fields = ["replication_date", "created_at"]
    filterset_fields = ["original"]


class TrainingAttachmentViewSet(ValidatedSearchOrderingMixin, TenantScopedQuerysetMixin, ModelViewSet):
    queryset = TrainingAttachment.objects.select_related("training").all()
    serializer_class = TrainingAttachmentSerializer
    filterset_fields = ["training"]
    ordering_fields = ["created_at"]
    parser_classes_override = None  # accept multipart for file uploads

    def get_parsers(self):
        from rest_framework.parsers import MultiPartParser, FormParser, JSONParser
        return [MultiPartParser(), FormParser(), JSONParser()]

    def perform_create(self, serializer):
        file = self.request.FILES.get("file")
        original_name = file.name if file else ""
        tenant = self._get_request_tenant()
        kwargs = {"original_name": original_name}
        if tenant:
            kwargs["tenant"] = tenant
        serializer.save(**kwargs)


class TrainingAttendanceViewSet(ValidatedSearchOrderingMixin, TenantScopedQuerysetMixin, ModelViewSet):
    queryset = TrainingAttendance.objects.select_related("training", "participant").all()
    serializer_class = TrainingAttendanceSerializer
    filterset_fields = ["training", "participant", "present"]
    ordering_fields = ["created_at"]


class CompetencyAssessmentViewSet(ValidatedSearchOrderingMixin, TenantScopedQuerysetMixin, ModelViewSet):
    queryset = CompetencyAssessment.objects.select_related("staff", "assessed_by", "related_test").all()
    serializer_class = CompetencyAssessmentSerializer
    filterset_fields = ["status", "staff", "related_test"]
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
class TransmissionRouteViewSet(ValidatedSearchOrderingMixin, TenantScopedQuerysetMixin, ModelViewSet):
    queryset = TransmissionRoute.objects.all()
    serializer_class = TransmissionRouteSerializer
    search_fields = ["custom_id", "name", "description"]
    ordering_fields = ["name", "active", "created_at"]


class BiologicalHazardViewSet(ValidatedSearchOrderingMixin, TenantScopedQuerysetMixin, ModelViewSet):
    queryset = BiologicalHazard.objects.prefetch_related("transmission_routes", "required_ppe_items").all()
    serializer_class = BiologicalHazardSerializer
    search_fields = ["custom_id", "name", "hazard_type"]
    ordering_fields = ["name", "risk_group", "containment_level", "active", "created_at"]


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
    "container_type": LabContainerTypeViewSet,
    "sector": LabSectorViewSet,
    "test": LabTestViewSet,
    "test_field": LabTestFieldViewSet,
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
    "training_replication": TrainingReplicationViewSet,
    "training_attachment": TrainingAttachmentViewSet,
    "training_attendance": TrainingAttendanceViewSet,
    "competency": CompetencyAssessmentViewSet,
    "complaint": CustomerComplaintViewSet,
    "risk_assessment": LabRiskAssessmentViewSet,
    "management_review": ManagementReviewViewSet,
    # Biossegurança
    "transmission_route": TransmissionRouteViewSet,
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
