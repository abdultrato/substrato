from datetime import timedelta

from django.apps import apps as django_apps
from django.core.exceptions import ValidationError as DjangoValidationError
from django.db.models import Q
from django.utils import timezone
from drf_spectacular.utils import extend_schema
from rest_framework import status as http_status
from rest_framework.decorators import action
from rest_framework.exceptions import ValidationError as DRFValidationError
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.viewsets import ModelViewSet, ViewSet

from api.v1.viewset_mixins import TenantScopedQuerysetMixin, ValidatedSearchOrderingMixin
from apps.public_health.services import PublicHealthWorkflowService
from apps.public_health.models import (
    AdverseEventFollowingImmunization,
    ImmunizationRecord,
    PublicHealthNotification,
    VaccinationCampaign,
    VaccinationCampaignTarget,
    VaccineLot,
    VaccineProduct,
)

from .filters import (
    AdverseEventFollowingImmunizationFilter,
    ImmunizationRecordFilter,
    PublicHealthNotificationFilter,
    VaccinationCampaignFilter,
    VaccinationCampaignTargetFilter,
    VaccineLotFilter,
    VaccineProductFilter,
)
from .serializers import (
    AdverseEventFollowingImmunizationSerializer,
    ImmunizationRecordSerializer,
    PublicHealthNotificationSerializer,
    PublicHealthDashboardSerializer,
    VaccinationCampaignSerializer,
    VaccinationCampaignTargetSerializer,
    VaccineLotSerializer,
    VaccineProductSerializer,
)


def _as_drf_error(exc: DjangoValidationError) -> DRFValidationError:
    detail = getattr(exc, "message_dict", None) or getattr(exc, "messages", None) or [str(exc)]
    return DRFValidationError(detail)


def _resolve(label: str, model_name: str, pk, tenant):
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


class PublicHealthModelViewSet(ValidatedSearchOrderingMixin, TenantScopedQuerysetMixin, ModelViewSet):
    permission_classes = [IsAuthenticated]
    ordering_fields = "__all__"
    ordering = ["-created_at"]


def _tenant_filter(queryset, request):
    tenant = getattr(request, "tenant", None)
    if tenant is None:
        return queryset
    return queryset.filter(tenant=tenant)


def _stock_risk_label(lot: VaccineLot, today):
    reasons = []
    if lot.expiration_date < today:
        reasons.append("Expirado")
    elif lot.expiration_date <= today + timedelta(days=30):
        reasons.append("Validade próxima")
    if lot.cold_chain_status == VaccineLot.ColdChainStatus.BREACH:
        reasons.append("Quebra de cadeia fria")
    if lot.doses_available == 0:
        reasons.append("Sem doses")
    elif lot.doses_available <= 10:
        reasons.append("Stock baixo")
    if lot.status in {VaccineLot.Status.QUARANTINED, VaccineLot.Status.RECALLED}:
        reasons.append(lot.get_status_display())
    return ", ".join(reasons) or "Acompanhar"


class PublicHealthDashboardViewSet(ViewSet):
    permission_classes = [IsAuthenticated]
    http_method_names = ["get", "head", "options"]

    @extend_schema(responses={200: PublicHealthDashboardSerializer})
    def list(self, request):
        today = timezone.localdate()
        now = timezone.now()

        vaccines_qs = _tenant_filter(VaccineProduct.objects.filter(deleted=False), request)
        lots_qs = _tenant_filter(VaccineLot.objects.filter(deleted=False).select_related("vaccine"), request)
        campaigns_qs = _tenant_filter(
            VaccinationCampaign.objects.filter(deleted=False).select_related("vaccine"),
            request,
        )
        immunizations_qs = _tenant_filter(
            ImmunizationRecord.objects.filter(deleted=False).select_related("patient", "vaccine"),
            request,
        )
        aefi_qs = _tenant_filter(
            AdverseEventFollowingImmunization.objects.filter(deleted=False).select_related("patient", "vaccine"),
            request,
        )
        notifications_qs = _tenant_filter(PublicHealthNotification.objects.filter(deleted=False), request)

        active_lots_qs = lots_qs.filter(status=VaccineLot.Status.ACTIVE)
        active_campaigns_qs = campaigns_qs.filter(status=VaccinationCampaign.Status.ACTIVE)
        due_boosters_qs = immunizations_qs.filter(
            status__in=[ImmunizationRecord.Status.ADMINISTERED, ImmunizationRecord.Status.REPORTED],
            next_due_date__isnull=False,
            next_due_date__lte=today,
        )
        open_serious_aefi_qs = aefi_qs.filter(
            serious=True,
            status__in=[
                AdverseEventFollowingImmunization.Status.REPORTED,
                AdverseEventFollowingImmunization.Status.UNDER_INVESTIGATION,
                AdverseEventFollowingImmunization.Status.SENT_TO_AUTHORITY,
            ],
        )
        pending_notifications_qs = notifications_qs.filter(
            status__in=[
                PublicHealthNotification.Status.PENDING,
                PublicHealthNotification.Status.FAILED,
                PublicHealthNotification.Status.REJECTED,
            ]
        )
        low_stock_lots_qs = active_lots_qs.filter(doses_available__lte=10)
        cold_chain_breach_qs = lots_qs.filter(cold_chain_status=VaccineLot.ColdChainStatus.BREACH)
        expired_lots_qs = lots_qs.filter(expiration_date__lt=today)

        stock_risk_qs = lots_qs.filter(
            Q(expiration_date__lt=today)
            | Q(expiration_date__lte=today + timedelta(days=30))
            | Q(doses_available__lte=10)
            | Q(cold_chain_status=VaccineLot.ColdChainStatus.BREACH)
            | Q(status__in=[VaccineLot.Status.QUARANTINED, VaccineLot.Status.RECALLED, VaccineLot.Status.EXPIRED])
        ).order_by("expiration_date", "doses_available", "lot_number")[:8]

        campaign_progress = []
        for campaign in active_campaigns_qs.order_by("end_date", "-start_date", "name")[:8]:
            campaign_progress.append(
                {
                    "id": campaign.id,
                    "custom_id": campaign.custom_id or "",
                    "name": campaign.name,
                    "vaccine_name": getattr(campaign.vaccine, "name", "") or "",
                    "status": campaign.status,
                    "target_region": campaign.target_region or "",
                    "start_date": campaign.start_date,
                    "end_date": campaign.end_date,
                    "target_doses": campaign.target_doses,
                    "administered_doses": campaign.administered_doses,
                    "coverage_percent": campaign.coverage_percent,
                }
            )

        booster_queue = []
        for record in due_boosters_qs.order_by("next_due_date", "patient__name")[:8]:
            booster_queue.append(
                {
                    "id": record.id,
                    "custom_id": record.custom_id or "",
                    "patient_id": record.patient_id,
                    "patient_name": getattr(record.patient, "name", "") or "",
                    "vaccine_name": getattr(record.vaccine, "name", "") or "",
                    "dose_number": record.dose_number,
                    "administered_at": record.administered_at,
                    "next_due_date": record.next_due_date,
                    "days_overdue": max(0, (today - record.next_due_date).days),
                }
            )

        payload = {
            "summary": {
                "vaccines": vaccines_qs.count(),
                "active_lots": active_lots_qs.count(),
                "active_campaigns": active_campaigns_qs.count(),
                "immunizations_30d": immunizations_qs.filter(administered_at__gte=now - timedelta(days=30)).count(),
                "due_boosters": due_boosters_qs.count(),
                "serious_aefi_open": open_serious_aefi_qs.count(),
                "pending_notifications": pending_notifications_qs.count(),
                "low_stock_lots": low_stock_lots_qs.count(),
                "cold_chain_breaches": cold_chain_breach_qs.count(),
                "expired_lots": expired_lots_qs.count(),
            },
            "stock_risks": [
                {
                    "id": lot.id,
                    "custom_id": lot.custom_id or "",
                    "vaccine_name": getattr(lot.vaccine, "name", "") or "",
                    "lot_number": lot.lot_number or "",
                    "status": lot.status,
                    "expiration_date": lot.expiration_date,
                    "doses_available": lot.doses_available,
                    "reserved_doses": lot.reserved_doses,
                    "cold_chain_status": lot.cold_chain_status,
                    "storage_location": lot.storage_location or "",
                    "risk": _stock_risk_label(lot, today),
                }
                for lot in stock_risk_qs
            ],
            "campaign_progress": campaign_progress,
            "booster_queue": booster_queue,
            "aefi_queue": [
                {
                    "id": event.id,
                    "custom_id": event.custom_id or "",
                    "patient_name": getattr(event.patient, "name", "") or "",
                    "vaccine_name": getattr(event.vaccine, "name", "") or "",
                    "severity": event.severity,
                    "status": event.status,
                    "serious": event.serious,
                    "reported_at": event.reported_at,
                    "investigation_due_at": event.investigation_due_at,
                }
                for event in open_serious_aefi_qs.order_by("investigation_due_at", "-reported_at")[:8]
            ],
            "notification_queue": [
                {
                    "id": notification.id,
                    "custom_id": notification.custom_id or "",
                    "official_system": notification.official_system,
                    "event_type": notification.event_type,
                    "status": notification.status,
                    "external_reference": notification.external_reference or "",
                    "attempt_count": notification.attempt_count,
                    "next_retry_at": notification.next_retry_at,
                    "error_message": notification.error_message or "",
                }
                for notification in pending_notifications_qs.filter(
                    Q(next_retry_at__isnull=True) | Q(next_retry_at__lte=now)
                ).order_by("next_retry_at", "-created_at")[:8]
            ],
        }
        return Response(PublicHealthDashboardSerializer(instance=payload).data)


class VaccineProductViewSet(PublicHealthModelViewSet):
    queryset = VaccineProduct.objects.prefetch_related("lots").all()
    serializer_class = VaccineProductSerializer
    filterset_class = VaccineProductFilter
    search_fields = ["custom_id", "name", "code", "official_code", "disease", "manufacturer", "notes"]
    ordering = ["name", "disease"]

    @action(detail=True, methods=["post"], url_path="ativar", url_name="ativar")
    def ativar(self, request, pk=None):
        obj = self.get_object()
        try:
            PublicHealthWorkflowService.activate_vaccine(obj)
        except DjangoValidationError as exc:
            raise _as_drf_error(exc)
        return Response(self.get_serializer(obj).data)

    @action(detail=True, methods=["post"], url_path="inativar", url_name="inativar")
    def inativar(self, request, pk=None):
        obj = self.get_object()
        try:
            PublicHealthWorkflowService.deactivate_vaccine(obj)
        except DjangoValidationError as exc:
            raise _as_drf_error(exc)
        return Response(self.get_serializer(obj).data)


class VaccineLotViewSet(PublicHealthModelViewSet):
    queryset = VaccineLot.objects.select_related("vaccine").all()
    serializer_class = VaccineLotSerializer
    filterset_class = VaccineLotFilter
    search_fields = ["custom_id", "vaccine__name", "lot_number", "official_batch_code", "storage_location", "notes"]
    ordering = ["expiration_date", "vaccine", "lot_number"]

    @action(detail=True, methods=["post"], url_path="ativar", url_name="ativar")
    def ativar(self, request, pk=None):
        obj = self.get_object()
        try:
            PublicHealthWorkflowService.activate_lot(obj)
        except DjangoValidationError as exc:
            raise _as_drf_error(exc)
        return Response(self.get_serializer(obj).data)

    @action(detail=True, methods=["post"], url_path="bloquear", url_name="bloquear")
    def bloquear(self, request, pk=None):
        obj = self.get_object()
        try:
            PublicHealthWorkflowService.block_lot(obj, reason=request.data.get("reason", ""))
        except DjangoValidationError as exc:
            raise _as_drf_error(exc)
        return Response(self.get_serializer(obj).data)

    @action(detail=True, methods=["post"], url_path="liberar", url_name="liberar")
    def liberar(self, request, pk=None):
        obj = self.get_object()
        try:
            PublicHealthWorkflowService.release_lot(obj)
        except DjangoValidationError as exc:
            raise _as_drf_error(exc)
        return Response(self.get_serializer(obj).data)

    @action(detail=True, methods=["post"], url_path="recolher", url_name="recolher")
    def recolher(self, request, pk=None):
        obj = self.get_object()
        try:
            PublicHealthWorkflowService.recall_lot(obj, reason=request.data.get("reason", ""))
        except DjangoValidationError as exc:
            raise _as_drf_error(exc)
        return Response(self.get_serializer(obj).data)


class VaccinationCampaignViewSet(PublicHealthModelViewSet):
    queryset = (
        VaccinationCampaign.objects.select_related("vaccine", "manager")
        .prefetch_related("targets", "immunization_records")
        .all()
    )
    serializer_class = VaccinationCampaignSerializer
    filterset_class = VaccinationCampaignFilter
    search_fields = [
        "custom_id",
        "name",
        "vaccine__name",
        "manager__name",
        "target_region",
        "official_program_code",
        "official_system",
        "notes",
    ]
    ordering = ["-start_date", "name"]

    @action(detail=True, methods=["post"], url_path="ativar", url_name="ativar")
    def ativar(self, request, pk=None):
        obj = self.get_object()
        try:
            PublicHealthWorkflowService.activate_campaign(obj)
        except DjangoValidationError as exc:
            raise _as_drf_error(exc)
        return Response(self.get_serializer(obj).data)

    @action(detail=True, methods=["post"], url_path="suspender", url_name="suspender")
    def suspender(self, request, pk=None):
        obj = self.get_object()
        try:
            PublicHealthWorkflowService.pause_campaign(obj, reason=request.data.get("reason", ""))
        except DjangoValidationError as exc:
            raise _as_drf_error(exc)
        return Response(self.get_serializer(obj).data)

    @action(detail=True, methods=["post"], url_path="encerrar", url_name="encerrar")
    def encerrar(self, request, pk=None):
        obj = self.get_object()
        try:
            PublicHealthWorkflowService.complete_campaign(obj)
        except DjangoValidationError as exc:
            raise _as_drf_error(exc)
        return Response(self.get_serializer(obj).data)

    @action(detail=True, methods=["post"], url_path="cancelar", url_name="cancelar")
    def cancelar(self, request, pk=None):
        obj = self.get_object()
        try:
            PublicHealthWorkflowService.cancel_campaign(obj, reason=request.data.get("reason", ""))
        except DjangoValidationError as exc:
            raise _as_drf_error(exc)
        return Response(self.get_serializer(obj).data)


class VaccinationCampaignTargetViewSet(PublicHealthModelViewSet):
    queryset = VaccinationCampaignTarget.objects.select_related("campaign", "campaign__vaccine").all()
    serializer_class = VaccinationCampaignTargetSerializer
    filterset_class = VaccinationCampaignTargetFilter
    search_fields = ["custom_id", "campaign__name", "region", "district", "notes"]
    ordering = ["campaign", "region", "district", "age_min_months"]


class ImmunizationRecordViewSet(PublicHealthModelViewSet):
    queryset = ImmunizationRecord.objects.select_related(
        "patient",
        "vaccine",
        "lot",
        "campaign",
        "target_group",
        "administered_by",
    ).all()
    serializer_class = ImmunizationRecordSerializer
    filterset_class = ImmunizationRecordFilter
    search_fields = [
        "custom_id",
        "patient__name",
        "vaccine__name",
        "lot__lot_number",
        "campaign__name",
        "administered_by__name",
        "official_notification_id",
        "notes",
    ]
    ordering = ["-administered_at", "-created_at"]

    @action(detail=False, methods=["post"], url_path="registar", url_name="registar")
    def registar(self, request):
        tenant = getattr(request, "tenant", None)
        patient = _resolve("clinical", "Patient", request.data.get("patient"), tenant)
        lot = _resolve("saude_publica", "VaccineLot", request.data.get("lot"), tenant)
        if patient is None or lot is None:
            raise DRFValidationError({"patient": "Paciente e lote são obrigatórios."})
        campaign = _resolve("saude_publica", "VaccinationCampaign", request.data.get("campaign"), tenant)
        target = _resolve("saude_publica", "VaccinationCampaignTarget", request.data.get("target_group"), tenant)
        administered_by = _resolve("recursos_humanos", "Employee", request.data.get("administered_by"), tenant)
        try:
            record = PublicHealthWorkflowService.register_immunization(
                patient=patient,
                lot=lot,
                campaign=campaign,
                target_group=target,
                administered_by=administered_by,
                dose_number=int(request.data.get("dose_number", 1) or 1),
                route=request.data.get("route") or ImmunizationRecord.Route.IM,
                source=request.data.get("source") or ImmunizationRecord.Source.ROUTINE,
                body_site=request.data.get("body_site", ""),
                allow_duplicate=bool(request.data.get("allow_duplicate", False)),
            )
        except DjangoValidationError as exc:
            raise _as_drf_error(exc)
        return Response(self.get_serializer(record).data, status=http_status.HTTP_201_CREATED)

    @action(detail=True, methods=["post"], url_path="cancelar", url_name="cancelar")
    def cancelar(self, request, pk=None):
        record = self.get_object()
        try:
            PublicHealthWorkflowService.cancel_immunization(record, reason=request.data.get("reason", ""))
        except DjangoValidationError as exc:
            raise _as_drf_error(exc)
        return Response(self.get_serializer(record).data)


class AdverseEventFollowingImmunizationViewSet(PublicHealthModelViewSet):
    queryset = AdverseEventFollowingImmunization.objects.select_related(
        "immunization_record",
        "patient",
        "vaccine",
        "lot",
        "reported_by",
        "investigated_by",
    ).all()
    serializer_class = AdverseEventFollowingImmunizationSerializer
    filterset_class = AdverseEventFollowingImmunizationFilter
    search_fields = [
        "custom_id",
        "patient__name",
        "vaccine__name",
        "lot__lot_number",
        "reported_by__name",
        "investigated_by__name",
        "symptoms",
        "causality_assessment",
        "official_notification_id",
        "notes",
    ]
    ordering = ["-reported_at", "-created_at"]

    @action(detail=True, methods=["post"], url_path="classificar", url_name="classificar")
    def classificar(self, request, pk=None):
        obj = self.get_object()
        tenant = getattr(request, "tenant", None)
        try:
            PublicHealthWorkflowService.classify_adverse_event(
                obj,
                severity=request.data.get("severity"),
                investigated_by=_resolve("recursos_humanos", "Employee", request.data.get("investigated_by"), tenant),
            )
        except DjangoValidationError as exc:
            raise _as_drf_error(exc)
        return Response(self.get_serializer(obj).data)

    @action(detail=True, methods=["post"], url_path="encerrar", url_name="encerrar")
    def encerrar(self, request, pk=None):
        obj = self.get_object()
        try:
            PublicHealthWorkflowService.resolve_adverse_event(
                obj,
                outcome=request.data.get("outcome", AdverseEventFollowingImmunization.Outcome.UNKNOWN),
                causality_assessment=request.data.get("causality_assessment", ""),
            )
        except DjangoValidationError as exc:
            raise _as_drf_error(exc)
        return Response(self.get_serializer(obj).data)

    @action(detail=True, methods=["post"], url_path="descartar", url_name="descartar")
    def descartar(self, request, pk=None):
        obj = self.get_object()
        try:
            PublicHealthWorkflowService.discard_adverse_event(obj, reason=request.data.get("reason", ""))
        except DjangoValidationError as exc:
            raise _as_drf_error(exc)
        return Response(self.get_serializer(obj).data)

    @action(detail=True, methods=["post"], url_path="gerar-notificacao", url_name="gerar-notificacao")
    def gerar_notificacao(self, request, pk=None):
        obj = self.get_object()
        try:
            notification = PublicHealthWorkflowService.generate_aefi_notification(
                obj, official_system=request.data.get("official_system") or PublicHealthNotification.OfficialSystem.CUSTOM
            )
        except DjangoValidationError as exc:
            raise _as_drf_error(exc)
        return Response(
            PublicHealthNotificationSerializer(notification, context=self.get_serializer_context()).data,
            status=http_status.HTTP_201_CREATED,
        )


class PublicHealthNotificationViewSet(PublicHealthModelViewSet):
    queryset = PublicHealthNotification.objects.select_related(
        "campaign",
        "immunization_record",
        "adverse_event",
    ).all()
    serializer_class = PublicHealthNotificationSerializer
    filterset_class = PublicHealthNotificationFilter
    search_fields = ["custom_id", "external_reference", "error_message", "notes"]
    ordering = ["-created_at"]

    @action(detail=True, methods=["post"], url_path="enviar", url_name="enviar")
    def enviar(self, request, pk=None):
        obj = self.get_object()
        try:
            PublicHealthWorkflowService.send_notification(obj, external_reference=request.data.get("external_reference", ""))
        except DjangoValidationError as exc:
            raise _as_drf_error(exc)
        return Response(self.get_serializer(obj).data)

    @action(detail=True, methods=["post"], url_path="responder", url_name="responder")
    def responder(self, request, pk=None):
        obj = self.get_object()
        try:
            PublicHealthWorkflowService.acknowledge_notification(
                obj,
                accepted=bool(request.data.get("accepted", True)),
                external_reference=request.data.get("external_reference", ""),
                error_message=request.data.get("error_message", ""),
            )
        except DjangoValidationError as exc:
            raise _as_drf_error(exc)
        return Response(self.get_serializer(obj).data)

    @action(detail=True, methods=["post"], url_path="reprocessar", url_name="reprocessar")
    def reprocessar(self, request, pk=None):
        obj = self.get_object()
        try:
            PublicHealthWorkflowService.retry_notification(obj)
        except DjangoValidationError as exc:
            raise _as_drf_error(exc)
        return Response(self.get_serializer(obj).data)


VIEWSET_MAP = {
    "dashboard": PublicHealthDashboardViewSet,
    "vaccine": VaccineProductViewSet,
    "lot": VaccineLotViewSet,
    "campaign": VaccinationCampaignViewSet,
    "target": VaccinationCampaignTargetViewSet,
    "immunization": ImmunizationRecordViewSet,
    "adverse_event": AdverseEventFollowingImmunizationViewSet,
    "notification": PublicHealthNotificationViewSet,
}
