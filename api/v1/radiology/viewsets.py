from django.apps import apps as django_apps
from django.core.exceptions import ValidationError as DjangoValidationError
from rest_framework import status as http_status
from rest_framework.decorators import action
from rest_framework.exceptions import ValidationError as DRFValidationError
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.viewsets import ModelViewSet

from api.v1.viewset_mixins import TenantScopedQuerysetMixin, ValidatedSearchOrderingMixin
from apps.radiology.services import RadiologyWorkflowService
from apps.radiology.models import (
    ImagingEquipment,
    ImagingFile,
    ImagingProtocol,
    ImagingReport,
    ImagingSeries,
    ImagingStudy,
    PacsIntegrationEvent,
)

from .filters import (
    ImagingEquipmentFilter,
    ImagingFileFilter,
    ImagingProtocolFilter,
    ImagingReportFilter,
    ImagingSeriesFilter,
    ImagingStudyFilter,
    PacsIntegrationEventFilter,
)
from .serializers import (
    ImagingEquipmentSerializer,
    ImagingFileSerializer,
    ImagingProtocolSerializer,
    ImagingReportSerializer,
    ImagingSeriesSerializer,
    ImagingStudySerializer,
    PacsIntegrationEventSerializer,
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


def _employee(request, key="radiologist"):
    return _resolve_instance("recursos_humanos", "Employee", request.data.get(key), getattr(request, "tenant", None))


class RadiologyModelViewSet(ValidatedSearchOrderingMixin, TenantScopedQuerysetMixin, ModelViewSet):
    permission_classes = [IsAuthenticated]
    ordering_fields = "__all__"
    ordering = ["-created_at"]


class ImagingEquipmentViewSet(RadiologyModelViewSet):
    queryset = ImagingEquipment.objects.all()
    serializer_class = ImagingEquipmentSerializer
    filterset_class = ImagingEquipmentFilter
    search_fields = ["custom_id", "code", "name", "manufacturer", "model", "serial_number", "ae_title", "station_name", "location"]
    ordering = ["name", "code"]

    @action(detail=True, methods=["post"], url_path="marcar-manutencao", url_name="marcar-manutencao")
    def marcar_manutencao(self, request, pk=None):
        obj = self.get_object()
        try:
            RadiologyWorkflowService.mark_equipment_maintenance(
                obj,
                next_quality_control=request.data.get("next_quality_control") or None,
                notes=request.data.get("notes", ""),
            )
        except DjangoValidationError as exc:
            raise _as_drf_error(exc)
        return Response(self.get_serializer(obj).data)

    @action(detail=True, methods=["post"], url_path="marcar-disponivel", url_name="marcar-disponivel")
    def marcar_disponivel(self, request, pk=None):
        obj = self.get_object()
        try:
            RadiologyWorkflowService.mark_equipment_available(
                obj,
                last_quality_control=request.data.get("last_quality_control") or None,
                next_quality_control=request.data.get("next_quality_control") or None,
            )
        except DjangoValidationError as exc:
            raise _as_drf_error(exc)
        return Response(self.get_serializer(obj).data)


class ImagingProtocolViewSet(RadiologyModelViewSet):
    queryset = ImagingProtocol.objects.all()
    serializer_class = ImagingProtocolSerializer
    filterset_class = ImagingProtocolFilter
    search_fields = ["custom_id", "code", "name", "preparation", "acquisition_instructions", "default_report_template"]
    ordering = ["modality", "name"]


class ImagingStudyViewSet(RadiologyModelViewSet):
    queryset = ImagingStudy.objects.select_related(
        "patient",
        "requesting_doctor",
        "radiologist",
        "consultation",
        "medical_record",
        "prescription_item",
        "protocol",
        "equipment",
    ).prefetch_related("series", "files", "reports")
    serializer_class = ImagingStudySerializer
    filterset_class = ImagingStudyFilter
    search_fields = [
        "custom_id",
        "accession_number",
        "study_instance_uid",
        "patient__name",
        "patient__document_number",
        "protocol__name",
        "equipment__name",
        "clinical_indication",
        "storage_uri",
    ]
    ordering = ["-requested_at", "-created_at"]

    def _equipment(self, request):
        return _resolve_instance("radiologia", "ImagingEquipment", request.data.get("equipment"), getattr(request, "tenant", None))

    @action(detail=True, methods=["post"], url_path="agendar", url_name="agendar")
    def agendar(self, request, pk=None):
        study = self.get_object()
        protocol = _resolve_instance("radiologia", "ImagingProtocol", request.data.get("protocol"), getattr(request, "tenant", None))
        try:
            RadiologyWorkflowService.schedule_study(
                study,
                scheduled_at=request.data.get("scheduled_at") or None,
                equipment=self._equipment(request),
                protocol=protocol,
            )
        except DjangoValidationError as exc:
            raise _as_drf_error(exc)
        return Response(self.get_serializer(study).data)

    @action(detail=True, methods=["post"], url_path="iniciar", url_name="iniciar")
    def iniciar(self, request, pk=None):
        study = self.get_object()
        try:
            RadiologyWorkflowService.start_acquisition(study, equipment=self._equipment(request))
        except DjangoValidationError as exc:
            raise _as_drf_error(exc)
        return Response(self.get_serializer(study).data)

    @action(detail=True, methods=["post"], url_path="marcar-adquirido", url_name="marcar-adquirido")
    def marcar_adquirido(self, request, pk=None):
        study = self.get_object()
        image_count = request.data.get("image_count")
        try:
            RadiologyWorkflowService.mark_acquired(
                study,
                image_count=int(image_count) if image_count not in (None, "") else None,
                study_instance_uid=request.data.get("study_instance_uid", ""),
                storage_uri=request.data.get("storage_uri", ""),
            )
        except DjangoValidationError as exc:
            raise _as_drf_error(exc)
        return Response(self.get_serializer(study).data)

    @action(detail=True, methods=["post"], url_path="atribuir-radiologista", url_name="atribuir-radiologista")
    def atribuir_radiologista(self, request, pk=None):
        study = self.get_object()
        try:
            RadiologyWorkflowService.assign_radiologist(study, radiologist=_employee(request))
        except DjangoValidationError as exc:
            raise _as_drf_error(exc)
        return Response(self.get_serializer(study).data)

    @action(detail=True, methods=["post"], url_path="cancelar", url_name="cancelar")
    def cancelar(self, request, pk=None):
        study = self.get_object()
        try:
            RadiologyWorkflowService.cancel_study(study, reason=request.data.get("reason", ""))
        except DjangoValidationError as exc:
            raise _as_drf_error(exc)
        return Response(self.get_serializer(study).data)


class ImagingSeriesViewSet(RadiologyModelViewSet):
    queryset = ImagingSeries.objects.select_related("study", "study__patient").all()
    serializer_class = ImagingSeriesSerializer
    filterset_class = ImagingSeriesFilter
    search_fields = ["custom_id", "study__accession_number", "study__patient__name", "series_instance_uid", "description", "storage_uri"]
    ordering = ["study", "series_number", "id"]


class ImagingFileViewSet(RadiologyModelViewSet):
    queryset = ImagingFile.objects.select_related("study", "study__patient", "series").all()
    serializer_class = ImagingFileSerializer
    filterset_class = ImagingFileFilter
    search_fields = ["custom_id", "study__accession_number", "series__series_instance_uid", "sop_instance_uid", "pacs_object_uri", "checksum"]
    ordering = ["study", "series", "image_number", "id"]


class ImagingReportViewSet(RadiologyModelViewSet):
    queryset = ImagingReport.objects.select_related("study", "study__patient", "radiologist").all()
    serializer_class = ImagingReportSerializer
    filterset_class = ImagingReportFilter
    search_fields = ["custom_id", "study__accession_number", "study__patient__name", "radiologist__name", "findings", "impression", "recommendations"]
    ordering = ["-reported_at", "-created_at"]

    @action(detail=True, methods=["post"], url_path="assinar", url_name="assinar")
    def assinar(self, request, pk=None):
        report = self.get_object()
        data = request.data
        critical = data.get("critical_result")
        try:
            RadiologyWorkflowService.sign_report(
                report,
                findings=data.get("findings"),
                impression=data.get("impression"),
                technique=data.get("technique"),
                recommendations=data.get("recommendations"),
                template_used=data.get("template_used"),
                critical_result=bool(critical) if critical is not None else None,
                radiologist=_employee(request),
            )
        except DjangoValidationError as exc:
            raise _as_drf_error(exc)
        return Response(self.get_serializer(report).data)

    @action(detail=True, methods=["post"], url_path="liberar", url_name="liberar")
    def liberar(self, request, pk=None):
        report = self.get_object()
        try:
            RadiologyWorkflowService.release_report(report)
        except DjangoValidationError as exc:
            raise _as_drf_error(exc)
        return Response(self.get_serializer(report).data)

    @action(detail=True, methods=["post"], url_path="retificar", url_name="retificar")
    def retificar(self, request, pk=None):
        report = self.get_object()
        try:
            amended = RadiologyWorkflowService.amend_report(
                report,
                findings=request.data.get("findings"),
                impression=request.data.get("impression"),
                reason=request.data.get("reason", ""),
            )
        except DjangoValidationError as exc:
            raise _as_drf_error(exc)
        return Response(
            self.get_serializer(amended).data, status=http_status.HTTP_201_CREATED
        )

    @action(detail=True, methods=["post"], url_path="comunicar-critico", url_name="comunicar-critico")
    def comunicar_critico(self, request, pk=None):
        report = self.get_object()
        try:
            RadiologyWorkflowService.mark_critical_communicated(
                report, communication=request.data.get("communication", "")
            )
        except DjangoValidationError as exc:
            raise _as_drf_error(exc)
        return Response(self.get_serializer(report).data)


class PacsIntegrationEventViewSet(RadiologyModelViewSet):
    queryset = PacsIntegrationEvent.objects.select_related("study", "study__patient", "equipment").all()
    serializer_class = PacsIntegrationEventSerializer
    filterset_class = PacsIntegrationEventFilter
    search_fields = ["custom_id", "study__accession_number", "accession_number", "study_instance_uid", "message_control_id", "error_message"]
    ordering = ["-event_at", "-created_at"]

    @action(detail=True, methods=["post"], url_path="reprocessar", url_name="reprocessar")
    def reprocessar(self, request, pk=None):
        event = self.get_object()
        try:
            RadiologyWorkflowService.reprocess_pacs_event(event)
        except DjangoValidationError as exc:
            raise _as_drf_error(exc)
        return Response(self.get_serializer(event).data)


VIEWSET_MAP = {
    "equipment": ImagingEquipmentViewSet,
    "protocol": ImagingProtocolViewSet,
    "study": ImagingStudyViewSet,
    "series": ImagingSeriesViewSet,
    "file": ImagingFileViewSet,
    "report": ImagingReportViewSet,
    "pacs_event": PacsIntegrationEventViewSet,
}
