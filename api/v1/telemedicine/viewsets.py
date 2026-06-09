from django.apps import apps as django_apps
from django.core.exceptions import ValidationError as DjangoValidationError
from rest_framework.decorators import action
from rest_framework.exceptions import ValidationError as DRFValidationError
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.viewsets import ModelViewSet

from api.v1.viewset_mixins import TenantScopedQuerysetMixin, ValidatedSearchOrderingMixin
from apps.telemedicine.models import (
    ChronicMonitoringProgram,
    RemoteClinicalAlert,
    RemoteMonitoringDevice,
    RemoteVitalReading,
    StoreAndForwardCase,
    TelemedicineWaitingRoomEntry,
)
from apps.telemedicine.services import TelemedicineWorkflowService

from .filters import (
    ChronicMonitoringProgramFilter,
    RemoteClinicalAlertFilter,
    RemoteMonitoringDeviceFilter,
    RemoteVitalReadingFilter,
    StoreAndForwardCaseFilter,
    TelemedicineWaitingRoomEntryFilter,
)
from .serializers import (
    ChronicMonitoringProgramSerializer,
    RemoteClinicalAlertSerializer,
    RemoteMonitoringDeviceSerializer,
    RemoteVitalReadingSerializer,
    StoreAndForwardCaseSerializer,
    TelemedicineWaitingRoomEntrySerializer,
)


def _as_drf_error(exc: DjangoValidationError) -> DRFValidationError:
    detail = getattr(exc, "message_dict", None) or getattr(exc, "messages", None) or [str(exc)]
    return DRFValidationError(detail)


def _resolve_employee(request, pk):
    """Resolve um Employee (clínico/revisor/responsável) dentro do tenant da requisição."""
    if pk in (None, "", 0):
        return None
    model = django_apps.get_model("recursos_humanos", "Employee")
    instance = model.objects.filter(pk=pk).first()
    if instance is None:
        raise DRFValidationError({"employee": f"Funcionário {pk} não encontrado."})
    tenant = getattr(request, "tenant", None)
    if tenant is not None and getattr(instance, "tenant_id", None) not in (None, getattr(tenant, "id", None)):
        raise DRFValidationError({"employee": "O funcionário pertence a outro tenant."})
    return instance


def _resolve_program(request, pk):
    if pk in (None, "", 0):
        return None
    instance = ChronicMonitoringProgram.objects.filter(pk=pk).first()
    if instance is None:
        raise DRFValidationError({"program": f"Programa {pk} não encontrado."})
    tenant = getattr(request, "tenant", None)
    if tenant is not None and getattr(instance, "tenant_id", None) not in (None, getattr(tenant, "id", None)):
        raise DRFValidationError({"program": "O programa pertence a outro tenant."})
    return instance


class TelemedicineModelViewSet(ValidatedSearchOrderingMixin, TenantScopedQuerysetMixin, ModelViewSet):
    permission_classes = [IsAuthenticated]
    ordering_fields = "__all__"
    ordering = ["-created_at"]


class TelemedicineWaitingRoomEntryViewSet(TelemedicineModelViewSet):
    queryset = TelemedicineWaitingRoomEntry.objects.select_related("consultation", "patient", "clinician").all()
    serializer_class = TelemedicineWaitingRoomEntrySerializer
    filterset_class = TelemedicineWaitingRoomEntryFilter
    search_fields = ["custom_id", "patient__name", "consultation__custom_id", "chief_complaint", "preliminary_symptoms", "triage_notes"]
    ordering = ["queue_position", "check_in_at"]

    @action(detail=True, methods=["post"], url_path="iniciar-triagem", url_name="iniciar-triagem")
    def iniciar_triagem(self, request, pk=None):
        entry = self.get_object()
        try:
            TelemedicineWorkflowService.start_triage(entry)
        except DjangoValidationError as exc:
            raise _as_drf_error(exc)
        return Response(self.get_serializer(entry).data)

    @action(detail=True, methods=["post"], url_path="marcar-pronto", url_name="marcar-pronto")
    def marcar_pronto(self, request, pk=None):
        entry = self.get_object()
        try:
            TelemedicineWorkflowService.mark_ready(
                entry,
                device_check_passed=request.data.get("device_check_passed"),
                consent_confirmed=request.data.get("consent_confirmed"),
                triage_notes=request.data.get("triage_notes", ""),
            )
        except DjangoValidationError as exc:
            raise _as_drf_error(exc)
        return Response(self.get_serializer(entry).data)

    @action(detail=True, methods=["post"], url_path="iniciar-chamada", url_name="iniciar-chamada")
    def iniciar_chamada(self, request, pk=None):
        entry = self.get_object()
        clinician = _resolve_employee(request, request.data.get("clinician"))
        try:
            TelemedicineWorkflowService.start_call(
                entry,
                video_room_url=request.data.get("video_room_url", ""),
                clinician=clinician,
            )
        except DjangoValidationError as exc:
            raise _as_drf_error(exc)
        return Response(self.get_serializer(entry).data)

    @action(detail=True, methods=["post"], url_path="concluir", url_name="concluir")
    def concluir(self, request, pk=None):
        entry = self.get_object()
        try:
            TelemedicineWorkflowService.complete_call(entry)
        except DjangoValidationError as exc:
            raise _as_drf_error(exc)
        return Response(self.get_serializer(entry).data)

    @action(detail=True, methods=["post"], url_path="faltou", url_name="faltou")
    def faltou(self, request, pk=None):
        entry = self.get_object()
        try:
            TelemedicineWorkflowService.mark_no_show(entry, notes=request.data.get("notes", ""))
        except DjangoValidationError as exc:
            raise _as_drf_error(exc)
        return Response(self.get_serializer(entry).data)

    @action(detail=True, methods=["post"], url_path="cancelar", url_name="cancelar")
    def cancelar(self, request, pk=None):
        entry = self.get_object()
        try:
            TelemedicineWorkflowService.cancel_waiting_entry(entry, reason=request.data.get("reason", ""))
        except DjangoValidationError as exc:
            raise _as_drf_error(exc)
        return Response(self.get_serializer(entry).data)


class RemoteMonitoringDeviceViewSet(TelemedicineModelViewSet):
    queryset = RemoteMonitoringDevice.objects.select_related("patient").prefetch_related("readings")
    serializer_class = RemoteMonitoringDeviceSerializer
    filterset_class = RemoteMonitoringDeviceFilter
    search_fields = ["custom_id", "patient__name", "serial_number", "external_device_id", "manufacturer", "model_name"]
    ordering = ["patient", "device_type", "-last_sync_at"]

    @action(detail=True, methods=["post"], url_path="ativar", url_name="ativar")
    def ativar(self, request, pk=None):
        device = self.get_object()
        try:
            TelemedicineWorkflowService.activate_device(device, paired_at=request.data.get("paired_at") or None)
        except DjangoValidationError as exc:
            raise _as_drf_error(exc)
        return Response(self.get_serializer(device).data)

    @action(detail=True, methods=["post"], url_path="pausar", url_name="pausar")
    def pausar(self, request, pk=None):
        device = self.get_object()
        try:
            TelemedicineWorkflowService.pause_device(device, notes=request.data.get("notes", ""))
        except DjangoValidationError as exc:
            raise _as_drf_error(exc)
        return Response(self.get_serializer(device).data)

    @action(detail=True, methods=["post"], url_path="marcar-perdido", url_name="marcar-perdido")
    def marcar_perdido(self, request, pk=None):
        device = self.get_object()
        try:
            TelemedicineWorkflowService.mark_device_lost(device, notes=request.data.get("notes", ""))
        except DjangoValidationError as exc:
            raise _as_drf_error(exc)
        return Response(self.get_serializer(device).data)

    @action(detail=True, methods=["post"], url_path="retirar", url_name="retirar")
    def retirar(self, request, pk=None):
        device = self.get_object()
        try:
            TelemedicineWorkflowService.retire_device(device, notes=request.data.get("notes", ""))
        except DjangoValidationError as exc:
            raise _as_drf_error(exc)
        return Response(self.get_serializer(device).data)


class RemoteVitalReadingViewSet(TelemedicineModelViewSet):
    queryset = RemoteVitalReading.objects.select_related("patient", "device").all()
    serializer_class = RemoteVitalReadingSerializer
    filterset_class = RemoteVitalReadingFilter
    search_fields = ["custom_id", "patient__name", "device__serial_number", "device__external_device_id", "notes"]
    ordering = ["-measured_at", "-created_at"]

    @action(detail=True, methods=["post"], url_path="gerar-alerta", url_name="gerar-alerta")
    def gerar_alerta(self, request, pk=None):
        reading = self.get_object()
        program = _resolve_program(request, request.data.get("program"))
        try:
            alert = TelemedicineWorkflowService.raise_alert_from_reading(
                reading,
                severity=request.data.get("severity") or None,
                message=request.data.get("message", ""),
                recommended_action=request.data.get("recommended_action", ""),
                program=program,
            )
        except DjangoValidationError as exc:
            raise _as_drf_error(exc)
        return Response(RemoteClinicalAlertSerializer(alert, context=self.get_serializer_context()).data, status=201)


class StoreAndForwardCaseViewSet(TelemedicineModelViewSet):
    queryset = StoreAndForwardCase.objects.select_related("patient", "consultation", "requested_by", "reviewer").all()
    serializer_class = StoreAndForwardCaseSerializer
    filterset_class = StoreAndForwardCaseFilter
    search_fields = ["custom_id", "title", "patient__name", "clinical_question", "clinical_summary", "findings", "recommendation"]
    ordering = ["-submitted_at", "-created_at"]

    @action(detail=True, methods=["post"], url_path="triar", url_name="triar")
    def triar(self, request, pk=None):
        case = self.get_object()
        reviewer = _resolve_employee(request, request.data.get("reviewer"))
        try:
            TelemedicineWorkflowService.triage_case(case, reviewer=reviewer)
        except DjangoValidationError as exc:
            raise _as_drf_error(exc)
        return Response(self.get_serializer(case).data)

    @action(detail=True, methods=["post"], url_path="iniciar-revisao", url_name="iniciar-revisao")
    def iniciar_revisao(self, request, pk=None):
        case = self.get_object()
        reviewer = _resolve_employee(request, request.data.get("reviewer"))
        try:
            TelemedicineWorkflowService.start_case_review(case, reviewer=reviewer)
        except DjangoValidationError as exc:
            raise _as_drf_error(exc)
        return Response(self.get_serializer(case).data)

    @action(detail=True, methods=["post"], url_path="pedir-informacao", url_name="pedir-informacao")
    def pedir_informacao(self, request, pk=None):
        case = self.get_object()
        try:
            TelemedicineWorkflowService.request_case_info(case, message=request.data.get("message", ""))
        except DjangoValidationError as exc:
            raise _as_drf_error(exc)
        return Response(self.get_serializer(case).data)

    @action(detail=True, methods=["post"], url_path="concluir", url_name="concluir")
    def concluir(self, request, pk=None):
        case = self.get_object()
        reviewer = _resolve_employee(request, request.data.get("reviewer"))
        try:
            TelemedicineWorkflowService.complete_case(
                case,
                findings=request.data.get("findings", ""),
                recommendation=request.data.get("recommendation", ""),
                reviewer=reviewer,
            )
        except DjangoValidationError as exc:
            raise _as_drf_error(exc)
        return Response(self.get_serializer(case).data)

    @action(detail=True, methods=["post"], url_path="cancelar", url_name="cancelar")
    def cancelar(self, request, pk=None):
        case = self.get_object()
        try:
            TelemedicineWorkflowService.cancel_case(case, reason=request.data.get("reason", ""))
        except DjangoValidationError as exc:
            raise _as_drf_error(exc)
        return Response(self.get_serializer(case).data)


class ChronicMonitoringProgramViewSet(TelemedicineModelViewSet):
    queryset = ChronicMonitoringProgram.objects.select_related("patient", "care_manager").prefetch_related("alerts")
    serializer_class = ChronicMonitoringProgramSerializer
    filterset_class = ChronicMonitoringProgramFilter
    search_fields = ["custom_id", "patient__name", "care_plan", "escalation_protocol", "notes"]
    ordering = ["-start_date", "-created_at"]

    @action(detail=True, methods=["post"], url_path="ativar", url_name="ativar")
    def ativar(self, request, pk=None):
        program = self.get_object()
        try:
            TelemedicineWorkflowService.activate_program(program)
        except DjangoValidationError as exc:
            raise _as_drf_error(exc)
        return Response(self.get_serializer(program).data)

    @action(detail=True, methods=["post"], url_path="pausar", url_name="pausar")
    def pausar(self, request, pk=None):
        program = self.get_object()
        try:
            TelemedicineWorkflowService.pause_program(program, reason=request.data.get("reason", ""))
        except DjangoValidationError as exc:
            raise _as_drf_error(exc)
        return Response(self.get_serializer(program).data)

    @action(detail=True, methods=["post"], url_path="registar-revisao", url_name="registar-revisao")
    def registar_revisao(self, request, pk=None):
        program = self.get_object()
        try:
            TelemedicineWorkflowService.record_review(
                program, next_review_date=request.data.get("next_review_date") or None
            )
        except DjangoValidationError as exc:
            raise _as_drf_error(exc)
        return Response(self.get_serializer(program).data)

    @action(detail=True, methods=["post"], url_path="concluir", url_name="concluir")
    def concluir(self, request, pk=None):
        program = self.get_object()
        try:
            TelemedicineWorkflowService.complete_program(program, end_date=request.data.get("end_date") or None)
        except DjangoValidationError as exc:
            raise _as_drf_error(exc)
        return Response(self.get_serializer(program).data)

    @action(detail=True, methods=["post"], url_path="cancelar", url_name="cancelar")
    def cancelar(self, request, pk=None):
        program = self.get_object()
        try:
            TelemedicineWorkflowService.cancel_program(program, reason=request.data.get("reason", ""))
        except DjangoValidationError as exc:
            raise _as_drf_error(exc)
        return Response(self.get_serializer(program).data)


class RemoteClinicalAlertViewSet(TelemedicineModelViewSet):
    queryset = RemoteClinicalAlert.objects.select_related(
        "patient",
        "program",
        "reading",
        "device",
        "acknowledged_by",
        "resolved_by",
    ).all()
    serializer_class = RemoteClinicalAlertSerializer
    filterset_class = RemoteClinicalAlertFilter
    search_fields = ["custom_id", "patient__name", "message", "recommended_action", "action_taken", "notes"]
    ordering = ["-triggered_at", "-created_at"]

    @action(detail=True, methods=["post"], url_path="reconhecer", url_name="reconhecer")
    def reconhecer(self, request, pk=None):
        alert = self.get_object()
        actor = _resolve_employee(request, request.data.get("actor") or request.data.get("acknowledged_by"))
        try:
            TelemedicineWorkflowService.acknowledge_alert(alert, actor=actor)
        except DjangoValidationError as exc:
            raise _as_drf_error(exc)
        return Response(self.get_serializer(alert).data)

    @action(detail=True, methods=["post"], url_path="escalar", url_name="escalar")
    def escalar(self, request, pk=None):
        alert = self.get_object()
        actor = _resolve_employee(request, request.data.get("actor") or request.data.get("acknowledged_by"))
        try:
            TelemedicineWorkflowService.escalate_alert(alert, actor=actor, notes=request.data.get("notes", ""))
        except DjangoValidationError as exc:
            raise _as_drf_error(exc)
        return Response(self.get_serializer(alert).data)

    @action(detail=True, methods=["post"], url_path="resolver", url_name="resolver")
    def resolver(self, request, pk=None):
        alert = self.get_object()
        actor = _resolve_employee(request, request.data.get("actor") or request.data.get("resolved_by"))
        try:
            TelemedicineWorkflowService.resolve_alert(
                alert, actor=actor, action_taken=request.data.get("action_taken", "")
            )
        except DjangoValidationError as exc:
            raise _as_drf_error(exc)
        return Response(self.get_serializer(alert).data)

    @action(detail=True, methods=["post"], url_path="descartar", url_name="descartar")
    def descartar(self, request, pk=None):
        alert = self.get_object()
        actor = _resolve_employee(request, request.data.get("actor") or request.data.get("acknowledged_by"))
        try:
            TelemedicineWorkflowService.dismiss_alert(alert, actor=actor, reason=request.data.get("reason", ""))
        except DjangoValidationError as exc:
            raise _as_drf_error(exc)
        return Response(self.get_serializer(alert).data)


VIEWSET_MAP = {
    "waiting_room": TelemedicineWaitingRoomEntryViewSet,
    "device": RemoteMonitoringDeviceViewSet,
    "vital_reading": RemoteVitalReadingViewSet,
    "async_case": StoreAndForwardCaseViewSet,
    "program": ChronicMonitoringProgramViewSet,
    "alert": RemoteClinicalAlertViewSet,
}
