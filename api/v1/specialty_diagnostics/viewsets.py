from django.apps import apps as django_apps
from django.core.exceptions import ValidationError as DjangoValidationError
from rest_framework import status as http_status
from rest_framework.decorators import action
from rest_framework.exceptions import ValidationError as DRFValidationError
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.viewsets import ModelViewSet

from api.v1.viewset_mixins import TenantScopedQuerysetMixin, ValidatedSearchOrderingMixin
from apps.specialty_diagnostics.services import SpecialtyDiagnosticsWorkflowService
from apps.specialty_diagnostics.models import (
    SpecialtyDiagnosticEquipment,
    SpecialtyDiagnosticIntegrationEvent,
    SpecialtyDiagnosticMeasurement,
    SpecialtyDiagnosticOrder,
    SpecialtyDiagnosticProtocol,
    SpecialtyDiagnosticReport,
)

from .filters import (
    SpecialtyDiagnosticEquipmentFilter,
    SpecialtyDiagnosticIntegrationEventFilter,
    SpecialtyDiagnosticMeasurementFilter,
    SpecialtyDiagnosticOrderFilter,
    SpecialtyDiagnosticProtocolFilter,
    SpecialtyDiagnosticReportFilter,
)
from .serializers import (
    SpecialtyDiagnosticEquipmentSerializer,
    SpecialtyDiagnosticIntegrationEventSerializer,
    SpecialtyDiagnosticMeasurementSerializer,
    SpecialtyDiagnosticOrderSerializer,
    SpecialtyDiagnosticProtocolSerializer,
    SpecialtyDiagnosticReportSerializer,
)


def _as_drf_error(exc: DjangoValidationError) -> DRFValidationError:
    detail = getattr(exc, "message_dict", None) or getattr(exc, "messages", None) or [str(exc)]
    return DRFValidationError(detail)


def _resolve_instance(label: str, model_name: str, pk, tenant):
    if pk in (None, "", 0):
        return None
    model = django_apps.get_model(label, model_name)
    instance = model.objects.filter(pk=pk).first()
    if instance is None:
        raise DRFValidationError(f"{model_name} {pk} não encontrado.")
    if tenant is not None:
        req_tenant_id = getattr(tenant, "id", None)
        inst_tenant_id = getattr(instance, "tenant_id", None)
        if inst_tenant_id is not None and req_tenant_id is not None and inst_tenant_id != req_tenant_id:
            raise DRFValidationError(f"{model_name} pertence a outro tenant.")
    return instance


def _specialist(request):
    return _resolve_instance("recursos_humanos", "Employee", request.data.get("specialist"), getattr(request, "tenant", None))


class SpecialtyDiagnosticsModelViewSet(ValidatedSearchOrderingMixin, TenantScopedQuerysetMixin, ModelViewSet):
    permission_classes = [IsAuthenticated]
    ordering_fields = "__all__"
    ordering = ["-created_at"]


class SpecialtyDiagnosticEquipmentViewSet(SpecialtyDiagnosticsModelViewSet):
    queryset = SpecialtyDiagnosticEquipment.objects.all()
    serializer_class = SpecialtyDiagnosticEquipmentSerializer
    filterset_class = SpecialtyDiagnosticEquipmentFilter
    search_fields = ["custom_id", "code", "name", "manufacturer", "model", "serial_number", "station_name", "location"]
    ordering = ["specialty", "name", "code"]

    @action(detail=True, methods=["post"], url_path="marcar-manutencao", url_name="marcar-manutencao")
    def marcar_manutencao(self, request, pk=None):
        obj = self.get_object()
        try:
            SpecialtyDiagnosticsWorkflowService.mark_equipment_maintenance(
                obj, next_quality_control=request.data.get("next_quality_control") or None, notes=request.data.get("notes", "")
            )
        except DjangoValidationError as exc:
            raise _as_drf_error(exc)
        return Response(self.get_serializer(obj).data)

    @action(detail=True, methods=["post"], url_path="marcar-disponivel", url_name="marcar-disponivel")
    def marcar_disponivel(self, request, pk=None):
        obj = self.get_object()
        try:
            SpecialtyDiagnosticsWorkflowService.mark_equipment_available(
                obj,
                last_quality_control=request.data.get("last_quality_control") or None,
                next_quality_control=request.data.get("next_quality_control") or None,
            )
        except DjangoValidationError as exc:
            raise _as_drf_error(exc)
        return Response(self.get_serializer(obj).data)


class SpecialtyDiagnosticProtocolViewSet(SpecialtyDiagnosticsModelViewSet):
    queryset = SpecialtyDiagnosticProtocol.objects.all()
    serializer_class = SpecialtyDiagnosticProtocolSerializer
    filterset_class = SpecialtyDiagnosticProtocolFilter
    search_fields = ["custom_id", "code", "name", "preparation", "acquisition_instructions", "default_report_template"]
    ordering = ["specialty", "modality", "name"]


class SpecialtyDiagnosticOrderViewSet(SpecialtyDiagnosticsModelViewSet):
    queryset = SpecialtyDiagnosticOrder.objects.select_related(
        "patient",
        "requesting_doctor",
        "specialist",
        "consultation",
        "medical_record",
        "prescription_item",
        "protocol",
        "equipment",
    ).prefetch_related("measurements", "reports", "integration_events")
    serializer_class = SpecialtyDiagnosticOrderSerializer
    filterset_class = SpecialtyDiagnosticOrderFilter
    search_fields = [
        "custom_id",
        "order_number",
        "external_order_id",
        "patient__name",
        "patient__document_number",
        "protocol__name",
        "equipment__name",
        "clinical_indication",
    ]
    ordering = ["-requested_at", "-created_at"]

    def _equipment(self, request):
        return _resolve_instance("diagnostico_especializado", "SpecialtyDiagnosticEquipment", request.data.get("equipment"), getattr(request, "tenant", None))

    @action(detail=True, methods=["post"], url_path="agendar", url_name="agendar")
    def agendar(self, request, pk=None):
        order = self.get_object()
        protocol = _resolve_instance("diagnostico_especializado", "SpecialtyDiagnosticProtocol", request.data.get("protocol"), getattr(request, "tenant", None))
        try:
            SpecialtyDiagnosticsWorkflowService.schedule_order(
                order, scheduled_at=request.data.get("scheduled_at") or None, equipment=self._equipment(request), protocol=protocol
            )
        except DjangoValidationError as exc:
            raise _as_drf_error(exc)
        return Response(self.get_serializer(order).data)

    @action(detail=True, methods=["post"], url_path="iniciar", url_name="iniciar")
    def iniciar(self, request, pk=None):
        order = self.get_object()
        try:
            SpecialtyDiagnosticsWorkflowService.start_exam(order, equipment=self._equipment(request))
        except DjangoValidationError as exc:
            raise _as_drf_error(exc)
        return Response(self.get_serializer(order).data)

    @action(detail=True, methods=["post"], url_path="finalizar-execucao", url_name="finalizar-execucao")
    def finalizar_execucao(self, request, pk=None):
        order = self.get_object()
        try:
            SpecialtyDiagnosticsWorkflowService.finish_execution(order)
        except DjangoValidationError as exc:
            raise _as_drf_error(exc)
        return Response(self.get_serializer(order).data)

    @action(detail=True, methods=["post"], url_path="atribuir-especialista", url_name="atribuir-especialista")
    def atribuir_especialista(self, request, pk=None):
        order = self.get_object()
        try:
            SpecialtyDiagnosticsWorkflowService.assign_specialist(order, specialist=_specialist(request))
        except DjangoValidationError as exc:
            raise _as_drf_error(exc)
        return Response(self.get_serializer(order).data)

    @action(detail=True, methods=["post"], url_path="cancelar", url_name="cancelar")
    def cancelar(self, request, pk=None):
        order = self.get_object()
        try:
            SpecialtyDiagnosticsWorkflowService.cancel_order(order, reason=request.data.get("reason", ""))
        except DjangoValidationError as exc:
            raise _as_drf_error(exc)
        return Response(self.get_serializer(order).data)

    @action(detail=True, methods=["post"], url_path="registar-medicoes", url_name="registar-medicoes")
    def registar_medicoes(self, request, pk=None):
        order = self.get_object()
        measurements = request.data.get("measurements") or []
        try:
            created = SpecialtyDiagnosticsWorkflowService.record_measurements(
                order, measurements=measurements, origin=request.data.get("origin", "MANUAL")
            )
        except DjangoValidationError as exc:
            raise _as_drf_error(exc)
        return Response(
            SpecialtyDiagnosticMeasurementSerializer(created, many=True, context=self.get_serializer_context()).data,
            status=http_status.HTTP_201_CREATED,
        )


class SpecialtyDiagnosticMeasurementViewSet(SpecialtyDiagnosticsModelViewSet):
    queryset = SpecialtyDiagnosticMeasurement.objects.select_related("order", "order__patient").all()
    serializer_class = SpecialtyDiagnosticMeasurementSerializer
    filterset_class = SpecialtyDiagnosticMeasurementFilter
    search_fields = ["custom_id", "code", "name", "order__order_number", "order__patient__name", "text_value", "interpretation"]
    ordering = ["order", "position", "id"]


class SpecialtyDiagnosticReportViewSet(SpecialtyDiagnosticsModelViewSet):
    queryset = SpecialtyDiagnosticReport.objects.select_related("order", "order__patient", "specialist").all()
    serializer_class = SpecialtyDiagnosticReportSerializer
    filterset_class = SpecialtyDiagnosticReportFilter
    search_fields = ["custom_id", "order__order_number", "order__patient__name", "specialist__name", "findings", "impression", "recommendations"]
    ordering = ["-reported_at", "-created_at"]

    @action(detail=True, methods=["post"], url_path="assinar", url_name="assinar")
    def assinar(self, request, pk=None):
        report = self.get_object()
        data = request.data
        critical = data.get("critical_result")
        try:
            SpecialtyDiagnosticsWorkflowService.sign_report(
                report,
                findings=data.get("findings"),
                impression=data.get("impression"),
                technique=data.get("technique"),
                recommendations=data.get("recommendations"),
                critical_result=bool(critical) if critical is not None else None,
                specialist=_specialist(request),
            )
        except DjangoValidationError as exc:
            raise _as_drf_error(exc)
        return Response(self.get_serializer(report).data)

    @action(detail=True, methods=["post"], url_path="liberar", url_name="liberar")
    def liberar(self, request, pk=None):
        report = self.get_object()
        try:
            SpecialtyDiagnosticsWorkflowService.release_report(report)
        except DjangoValidationError as exc:
            raise _as_drf_error(exc)
        return Response(self.get_serializer(report).data)

    @action(detail=True, methods=["post"], url_path="retificar", url_name="retificar")
    def retificar(self, request, pk=None):
        report = self.get_object()
        try:
            amended = SpecialtyDiagnosticsWorkflowService.amend_report(
                report,
                findings=request.data.get("findings"),
                impression=request.data.get("impression"),
                reason=request.data.get("reason", ""),
            )
        except DjangoValidationError as exc:
            raise _as_drf_error(exc)
        return Response(self.get_serializer(amended).data, status=http_status.HTTP_201_CREATED)

    @action(detail=True, methods=["post"], url_path="comunicar-critico", url_name="comunicar-critico")
    def comunicar_critico(self, request, pk=None):
        report = self.get_object()
        try:
            SpecialtyDiagnosticsWorkflowService.mark_critical_communicated(
                report, communication=request.data.get("communication", "")
            )
        except DjangoValidationError as exc:
            raise _as_drf_error(exc)
        return Response(self.get_serializer(report).data)


class SpecialtyDiagnosticIntegrationEventViewSet(SpecialtyDiagnosticsModelViewSet):
    queryset = SpecialtyDiagnosticIntegrationEvent.objects.select_related("order", "order__patient", "equipment").all()
    serializer_class = SpecialtyDiagnosticIntegrationEventSerializer
    filterset_class = SpecialtyDiagnosticIntegrationEventFilter
    search_fields = ["custom_id", "order__order_number", "external_order_id", "message_control_id", "error_message"]
    ordering = ["-event_at", "-created_at"]

    @action(detail=True, methods=["post"], url_path="reprocessar", url_name="reprocessar")
    def reprocessar(self, request, pk=None):
        event = self.get_object()
        try:
            SpecialtyDiagnosticsWorkflowService.reprocess_integration_event(event)
        except DjangoValidationError as exc:
            raise _as_drf_error(exc)
        return Response(self.get_serializer(event).data)


VIEWSET_MAP = {
    "equipment": SpecialtyDiagnosticEquipmentViewSet,
    "protocol": SpecialtyDiagnosticProtocolViewSet,
    "order": SpecialtyDiagnosticOrderViewSet,
    "measurement": SpecialtyDiagnosticMeasurementViewSet,
    "report": SpecialtyDiagnosticReportViewSet,
    "integration_event": SpecialtyDiagnosticIntegrationEventViewSet,
}
