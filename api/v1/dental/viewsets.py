from django.apps import apps as django_apps
from django.core.exceptions import ValidationError as DjangoValidationError
from django.db.models import Q
from django.utils import timezone
from rest_framework import status as http_status
from rest_framework.decorators import action
from rest_framework.exceptions import ValidationError as DRFValidationError
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.viewsets import ModelViewSet

from api.v1.viewset_mixins import TenantScopedQuerysetMixin, ValidatedSearchOrderingMixin
from apps.dental.services import DentalWorkflowService
from apps.dental.models import (
    DentalAppointment,
    DentalApproval,
    DentalAuditEvent,
    DentalBillingItem,
    DentalClinicalEvolution,
    DentalConsultation,
    DentalDiagnosis,
    DentalDocument,
    DentalFollowUp,
    DentalImagingOrder,
    DentalMaterialConsumption,
    DentalOdontogram,
    DentalOdontogramEntry,
    DentalPatientTreatmentPlan,
    DentalPayment,
    DentalPrescription,
    DentalProcedure,
    DentalProcedureExecution,
    DentalProsthesisLabOrder,
    DentalQuotation,
    DentalRecord,
    DentalTreatmentPhase,
    DentalTreatmentPlan,
    DentalTreatmentPlanItem,
    PatientDentalPlanSummary,
)

from .filters import (
    DentalAppointmentFilter,
    DentalApprovalFilter,
    DentalAuditEventFilter,
    DentalBillingItemFilter,
    DentalClinicalEvolutionFilter,
    DentalConsultationFilter,
    DentalDiagnosisFilter,
    DentalDocumentFilter,
    DentalFollowUpFilter,
    DentalImagingOrderFilter,
    DentalMaterialConsumptionFilter,
    DentalOdontogramEntryFilter,
    DentalOdontogramFilter,
    DentalPatientTreatmentPlanFilter,
    DentalPaymentFilter,
    DentalPrescriptionFilter,
    DentalProcedureExecutionFilter,
    DentalProcedureFilter,
    DentalProsthesisLabOrderFilter,
    DentalQuotationFilter,
    DentalRecordFilter,
    DentalTreatmentPhaseFilter,
    DentalTreatmentPlanFilter,
    DentalTreatmentPlanItemFilter,
    PatientDentalPlanSummaryFilter,
)
from .serializers import (
    DentalAppointmentSerializer,
    DentalApprovalSerializer,
    DentalAuditEventSerializer,
    DentalBillingItemSerializer,
    DentalClinicalEvolutionSerializer,
    DentalConsultationSerializer,
    DentalDiagnosisSerializer,
    DentalDocumentSerializer,
    DentalFollowUpSerializer,
    DentalImagingOrderSerializer,
    DentalMaterialConsumptionSerializer,
    DentalOdontogramEntrySerializer,
    DentalOdontogramSerializer,
    DentalPatientTreatmentPlanSerializer,
    DentalPaymentSerializer,
    DentalPrescriptionSerializer,
    DentalProcedureExecutionSerializer,
    DentalProcedureSerializer,
    DentalProsthesisLabOrderSerializer,
    DentalQuotationSerializer,
    DentalRecordSerializer,
    DentalTreatmentPhaseSerializer,
    DentalTreatmentPlanItemSerializer,
    DentalTreatmentPlanSerializer,
    PatientDentalPlanSummarySerializer,
)


def _filter_patient_plan_validity(queryset, validity: str):
    today = timezone.localdate()
    normalized = (validity or "").strip().lower()
    if normalized in {"valid", "validos", "válidos", "valido", "válido"}:
        return queryset.filter(
            status=DentalPatientTreatmentPlan.Status.ACTIVE,
            valid_from__lte=today,
        ).filter(Q(valid_until__isnull=True) | Q(valid_until__gte=today))
    if normalized in {"expired", "expirados", "expirado"}:
        return queryset.filter(Q(status=DentalPatientTreatmentPlan.Status.EXPIRED) | Q(valid_until__lt=today))
    return queryset


def _as_drf_error(exc: DjangoValidationError) -> DRFValidationError:
    detail = getattr(exc, "message_dict", None) or getattr(exc, "messages", None) or [str(exc)]
    return DRFValidationError(detail)


def _actor_name(request) -> str:
    user = getattr(request, "user", None)
    if user is None or not getattr(user, "is_authenticated", False):
        return ""
    full_name = user.get_full_name() if hasattr(user, "get_full_name") else ""
    return (full_name or getattr(user, "username", "") or "").strip()


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


class DentalProcedureViewSet(ValidatedSearchOrderingMixin, TenantScopedQuerysetMixin, ModelViewSet):
    queryset = DentalProcedure.objects.all()
    serializer_class = DentalProcedureSerializer
    filterset_class = DentalProcedureFilter
    permission_classes = [IsAuthenticated]
    search_fields = ["custom_id", "code", "name", "category", "notes"]
    ordering_fields = ["code", "name", "category", "base_price", "default_duration_minutes", "active", "created_at"]
    ordering = ["name", "code"]


class DentalAppointmentViewSet(ValidatedSearchOrderingMixin, TenantScopedQuerysetMixin, ModelViewSet):
    queryset = DentalAppointment.objects.select_related("patient", "dentist", "consultation").all()
    serializer_class = DentalAppointmentSerializer
    filterset_class = DentalAppointmentFilter
    permission_classes = [IsAuthenticated]
    search_fields = [
        "custom_id",
        "patient__name",
        "patient__document_number",
        "dentist__name",
        "reason",
        "chair",
        "notes",
    ]
    ordering_fields = ["scheduled_start", "scheduled_end", "status", "patient", "dentist", "created_at"]
    ordering = ["-scheduled_start", "-created_at"]

    @action(detail=True, methods=["post"], url_path="confirmar", url_name="confirmar")
    def confirmar(self, request, pk=None):
        appointment = self.get_object()
        try:
            DentalWorkflowService.confirm_appointment(appointment, actor_name=_actor_name(request))
        except DjangoValidationError as exc:
            raise _as_drf_error(exc)
        return Response(self.get_serializer(appointment).data)

    @action(detail=True, methods=["post"], url_path="iniciar-atendimento", url_name="iniciar-atendimento")
    def iniciar_atendimento(self, request, pk=None):
        appointment = self.get_object()
        tenant = getattr(request, "tenant", None)
        dentist = _resolve_instance("recursos_humanos", "Employee", request.data.get("dentist"), tenant)
        try:
            consultation = DentalWorkflowService.start_consultation(
                appointment,
                dentist=dentist,
                chief_complaint=request.data.get("chief_complaint", ""),
                actor_name=_actor_name(request),
            )
        except DjangoValidationError as exc:
            raise _as_drf_error(exc)
        return Response(
            DentalConsultationSerializer(consultation, context=self.get_serializer_context()).data,
            status=http_status.HTTP_201_CREATED,
        )

    @action(detail=True, methods=["post"], url_path="finalizar", url_name="finalizar")
    def finalizar(self, request, pk=None):
        appointment = self.get_object()
        try:
            DentalWorkflowService.finalize_appointment(appointment, actor_name=_actor_name(request))
        except DjangoValidationError as exc:
            raise _as_drf_error(exc)
        return Response(self.get_serializer(appointment).data)

    @action(detail=True, methods=["post"], url_path="cancelar", url_name="cancelar")
    def cancelar(self, request, pk=None):
        appointment = self.get_object()
        try:
            DentalWorkflowService.cancel_appointment(
                appointment, reason=request.data.get("reason", ""), actor_name=_actor_name(request)
            )
        except DjangoValidationError as exc:
            raise _as_drf_error(exc)
        return Response(self.get_serializer(appointment).data)

    @action(detail=True, methods=["post"], url_path="faltou", url_name="faltou")
    def faltou(self, request, pk=None):
        appointment = self.get_object()
        try:
            DentalWorkflowService.mark_no_show(appointment, actor_name=_actor_name(request))
        except DjangoValidationError as exc:
            raise _as_drf_error(exc)
        return Response(self.get_serializer(appointment).data)


class DentalRecordViewSet(ValidatedSearchOrderingMixin, TenantScopedQuerysetMixin, ModelViewSet):
    queryset = (
        DentalRecord.objects.select_related("patient", "dentist", "appointment")
        .prefetch_related("odontogram_entries")
        .all()
    )
    serializer_class = DentalRecordSerializer
    filterset_class = DentalRecordFilter
    permission_classes = [IsAuthenticated]
    search_fields = [
        "custom_id",
        "patient__name",
        "patient__document_number",
        "dentist__name",
        "chief_complaint",
        "dental_history",
        "diagnosis",
        "treatment_summary",
        "notes",
    ]
    ordering_fields = ["opened_at", "closed_at", "status", "patient", "dentist", "created_at"]
    ordering = ["-opened_at", "-created_at"]

    @action(detail=True, methods=["post"], url_path="registar-odontograma", url_name="registar-odontograma")
    def registar_odontograma(self, request, pk=None):
        record = self.get_object()
        data = request.data
        try:
            entry = DentalWorkflowService.record_odontogram_entry(
                record,
                tooth_number=data.get("tooth_number", ""),
                surface=data.get("surface") or DentalOdontogramEntry.Surface.WHOLE,
                condition=data.get("condition") or DentalOdontogramEntry.Condition.HEALTHY,
                status=data.get("status") or DentalOdontogramEntry.Status.OBSERVED,
                severity=data.get("severity", ""),
                diagnosis=data.get("diagnosis", ""),
                notes=data.get("notes", ""),
                actor_name=_actor_name(request),
            )
        except DjangoValidationError as exc:
            raise _as_drf_error(exc)
        return Response(
            DentalOdontogramEntrySerializer(entry, context=self.get_serializer_context()).data,
            status=http_status.HTTP_201_CREATED,
        )


class DentalConsultationViewSet(ValidatedSearchOrderingMixin, TenantScopedQuerysetMixin, ModelViewSet):
    queryset = DentalConsultation.objects.select_related("patient", "dentist", "appointment", "record").all()
    serializer_class = DentalConsultationSerializer
    filterset_class = DentalConsultationFilter
    permission_classes = [IsAuthenticated]
    search_fields = [
        "custom_id",
        "patient__name",
        "patient__document_number",
        "dentist__name",
        "chief_complaint",
        "present_illness_history",
        "clinical_observations",
    ]
    ordering_fields = ["started_at", "ended_at", "status", "patient", "dentist", "created_at"]
    ordering = ["-started_at", "-created_at"]

    @action(detail=True, methods=["post"], url_path="finalizar", url_name="finalizar")
    def finalizar(self, request, pk=None):
        consultation = self.get_object()
        try:
            DentalWorkflowService.complete_consultation(consultation, actor_name=_actor_name(request))
        except DjangoValidationError as exc:
            raise _as_drf_error(exc)
        return Response(self.get_serializer(consultation).data)


class DentalOdontogramViewSet(ValidatedSearchOrderingMixin, TenantScopedQuerysetMixin, ModelViewSet):
    queryset = (
        DentalOdontogram.objects.select_related(
            "patient",
            "consultation",
            "record",
            "created_by_dentist",
        )
        .prefetch_related("entries")
        .all()
    )
    serializer_class = DentalOdontogramSerializer
    filterset_class = DentalOdontogramFilter
    permission_classes = [IsAuthenticated]
    search_fields = ["custom_id", "patient__name", "record__custom_id", "dentition_type", "status", "notes"]
    ordering_fields = ["charted_at", "dentition_type", "status", "patient", "created_at"]
    ordering = ["-charted_at", "-created_at"]


class DentalOdontogramEntryViewSet(ValidatedSearchOrderingMixin, TenantScopedQuerysetMixin, ModelViewSet):
    queryset = DentalOdontogramEntry.objects.select_related(
        "odontogram", "record", "record__patient", "procedure"
    ).all()
    serializer_class = DentalOdontogramEntrySerializer
    filterset_class = DentalOdontogramEntryFilter
    permission_classes = [IsAuthenticated]
    search_fields = [
        "custom_id",
        "record__custom_id",
        "record__patient__name",
        "tooth_number",
        "condition",
        "diagnosis",
        "procedure_suggested",
        "notes",
    ]
    ordering_fields = ["record", "tooth_number", "surface", "condition", "severity", "status", "created_at"]
    ordering = ["record", "tooth_number", "surface", "id"]


class DentalDiagnosisViewSet(ValidatedSearchOrderingMixin, TenantScopedQuerysetMixin, ModelViewSet):
    queryset = DentalDiagnosis.objects.select_related(
        "patient",
        "consultation",
        "record",
        "odontogram_entry",
        "responsible_dentist",
    ).all()
    serializer_class = DentalDiagnosisSerializer
    filterset_class = DentalDiagnosisFilter
    permission_classes = [IsAuthenticated]
    search_fields = ["custom_id", "patient__name", "diagnosis", "code", "tooth_number", "notes"]
    ordering_fields = ["diagnosed_at", "severity", "patient", "responsible_dentist", "created_at"]
    ordering = ["-diagnosed_at", "-created_at"]


class DentalTreatmentPlanViewSet(ValidatedSearchOrderingMixin, TenantScopedQuerysetMixin, ModelViewSet):
    queryset = (
        DentalTreatmentPlan.objects.select_related("patient", "dentist", "record")
        .prefetch_related(
            "phases",
            "items",
            "patient_assignments",
        )
        .all()
    )
    serializer_class = DentalTreatmentPlanSerializer
    filterset_class = DentalTreatmentPlanFilter
    permission_classes = [IsAuthenticated]
    search_fields = ["custom_id", "title", "patient__name", "dentist__name", "objectives", "notes"]
    ordering_fields = [
        "planned_start",
        "planned_end",
        "priority",
        "status",
        "estimated_total",
        "approved_amount",
        "patient",
        "dentist",
        "created_at",
    ]
    ordering = ["-created_at"]

    @action(detail=True, methods=["post"], url_path="apresentar", url_name="apresentar")
    def apresentar(self, request, pk=None):
        plan = self.get_object()
        try:
            DentalWorkflowService.propose_plan(plan, actor_name=_actor_name(request))
        except DjangoValidationError as exc:
            raise _as_drf_error(exc)
        return Response(self.get_serializer(plan).data)

    @action(detail=True, methods=["post"], url_path="gerar-orcamento", url_name="gerar-orcamento")
    def gerar_orcamento(self, request, pk=None):
        plan = self.get_object()
        tenant = getattr(request, "tenant", None)
        issued_by = _resolve_instance("recursos_humanos", "Employee", request.data.get("issued_by"), tenant)
        try:
            quotation = DentalWorkflowService.generate_quotation(
                plan,
                valid_until=request.data.get("valid_until") or None,
                discount_amount=request.data.get("discount_amount", "0"),
                tax_amount=request.data.get("tax_amount", "0"),
                issued_by=issued_by,
                payment_terms=request.data.get("payment_terms", ""),
                actor_name=_actor_name(request),
            )
        except DjangoValidationError as exc:
            raise _as_drf_error(exc)
        return Response(
            DentalQuotationSerializer(quotation, context=self.get_serializer_context()).data,
            status=http_status.HTTP_201_CREATED,
        )

    @action(detail=True, methods=["post"], url_path="concluir", url_name="concluir")
    def concluir(self, request, pk=None):
        plan = self.get_object()
        try:
            DentalWorkflowService.complete_plan(plan, actor_name=_actor_name(request))
        except DjangoValidationError as exc:
            raise _as_drf_error(exc)
        return Response(self.get_serializer(plan).data)

    @action(detail=True, methods=["post"], url_path="cancelar", url_name="cancelar")
    def cancelar(self, request, pk=None):
        plan = self.get_object()
        try:
            DentalWorkflowService.cancel_plan(
                plan, reason=request.data.get("reason", ""), actor_name=_actor_name(request)
            )
        except DjangoValidationError as exc:
            raise _as_drf_error(exc)
        return Response(self.get_serializer(plan).data)


class DentalTreatmentPhaseViewSet(ValidatedSearchOrderingMixin, TenantScopedQuerysetMixin, ModelViewSet):
    queryset = DentalTreatmentPhase.objects.select_related("treatment_plan").all()
    serializer_class = DentalTreatmentPhaseSerializer
    filterset_class = DentalTreatmentPhaseFilter
    permission_classes = [IsAuthenticated]
    search_fields = ["custom_id", "title", "treatment_plan__title", "phase_type", "status", "notes"]
    ordering_fields = [
        "position",
        "planned_start",
        "planned_end",
        "phase_type",
        "status",
        "estimated_amount",
        "created_at",
    ]
    ordering = ["treatment_plan", "position", "id"]


class DentalTreatmentPlanItemViewSet(ValidatedSearchOrderingMixin, TenantScopedQuerysetMixin, ModelViewSet):
    queryset = DentalTreatmentPlanItem.objects.select_related(
        "treatment_plan",
        "phase",
        "procedure",
        "appointment",
    ).all()
    serializer_class = DentalTreatmentPlanItemSerializer
    filterset_class = DentalTreatmentPlanItemFilter
    permission_classes = [IsAuthenticated]
    search_fields = [
        "custom_id",
        "treatment_plan__title",
        "phase__title",
        "procedure__name",
        "tooth_number",
        "clinical_notes",
    ]
    ordering_fields = [
        "position",
        "scheduled_date",
        "completed_at",
        "status",
        "financial_status",
        "quantity",
        "unit_price",
        "created_at",
    ]
    ordering = ["treatment_plan", "position", "id"]

    @action(detail=True, methods=["post"], url_path="executar", url_name="executar")
    def executar(self, request, pk=None):
        item = self.get_object()
        tenant = getattr(request, "tenant", None)
        performed_by = _resolve_instance(
            "recursos_humanos", "Employee", request.data.get("performed_by"), tenant
        ) or item.treatment_plan.dentist
        consultation = _resolve_instance(
            "odontologia", "DentalConsultation", request.data.get("consultation"), tenant
        )
        try:
            execution = DentalWorkflowService.execute_procedure(
                treatment_item=item,
                performed_by=performed_by,
                consultation=consultation,
                tooth_number=request.data.get("tooth_number", ""),
                surface=request.data.get("surface", ""),
                materials=request.data.get("materials") or [],
                anesthesia_used=request.data.get("anesthesia_used", ""),
                clinical_notes=request.data.get("clinical_notes", ""),
                evolution_summary=request.data.get("evolution_summary", ""),
                update_odontogram=bool(request.data.get("update_odontogram", True)),
                generate_billing=bool(request.data.get("generate_billing", True)),
                actor_name=_actor_name(request),
            )
        except DjangoValidationError as exc:
            raise _as_drf_error(exc)
        return Response(
            DentalProcedureExecutionSerializer(execution, context=self.get_serializer_context()).data,
            status=http_status.HTTP_201_CREATED,
        )


class DentalPatientTreatmentPlanViewSet(ValidatedSearchOrderingMixin, TenantScopedQuerysetMixin, ModelViewSet):
    queryset = (
        DentalPatientTreatmentPlan.objects.select_related(
            "patient",
            "treatment_plan",
            "dentist",
            "record",
        )
        .prefetch_related("treatment_plan__items")
        .all()
    )
    serializer_class = DentalPatientTreatmentPlanSerializer
    filterset_class = DentalPatientTreatmentPlanFilter
    permission_classes = [IsAuthenticated]
    search_fields = [
        "custom_id",
        "patient__name",
        "patient__document_number",
        "treatment_plan__title",
        "dentist__name",
        "notes",
    ]
    ordering_fields = [
        "assigned_at",
        "valid_from",
        "valid_until",
        "status",
        "patient",
        "treatment_plan",
        "dentist",
        "created_at",
    ]
    ordering = ["-valid_from", "-created_at"]

    def get_queryset(self):
        queryset = super().get_queryset()
        request = getattr(self, "request", None)
        validity = ""
        if request is not None:
            validity = request.query_params.get("validity", "")
        return _filter_patient_plan_validity(queryset, validity)

    @action(detail=False, methods=["get"], url_path="valid", url_name="valid")
    def valid(self, request):
        queryset = self.filter_queryset(_filter_patient_plan_validity(super().get_queryset(), "valid"))
        page = self.paginate_queryset(queryset)
        if page is not None:
            return self.get_paginated_response(self.get_serializer(page, many=True).data)
        return Response(self.get_serializer(queryset, many=True).data)

    @action(detail=False, methods=["get"], url_path="expired", url_name="expired")
    def expired(self, request):
        queryset = self.filter_queryset(_filter_patient_plan_validity(super().get_queryset(), "expired"))
        page = self.paginate_queryset(queryset)
        if page is not None:
            return self.get_paginated_response(self.get_serializer(page, many=True).data)
        return Response(self.get_serializer(queryset, many=True).data)


class DentalQuotationViewSet(ValidatedSearchOrderingMixin, TenantScopedQuerysetMixin, ModelViewSet):
    queryset = DentalQuotation.objects.select_related("treatment_plan", "patient", "issued_by").all()
    serializer_class = DentalQuotationSerializer
    filterset_class = DentalQuotationFilter
    permission_classes = [IsAuthenticated]
    search_fields = ["custom_id", "treatment_plan__title", "patient__name", "payment_terms", "notes"]
    ordering_fields = ["issued_at", "valid_until", "status", "subtotal", "total_amount", "created_at"]
    ordering = ["-issued_at", "-created_at"]

    @action(detail=True, methods=["post"], url_path="aprovar", url_name="aprovar")
    def aprovar(self, request, pk=None):
        quotation = self.get_object()
        try:
            approval = DentalWorkflowService.approve_quotation(
                quotation,
                approved_by_name=request.data.get("approved_by_name", ""),
                approval_scope=request.data.get("approval_scope") or DentalApproval.Scope.FULL_PLAN,
                consent_signed=bool(request.data.get("consent_signed", False)),
                consent_document_reference=request.data.get("consent_document_reference", ""),
                actor_name=_actor_name(request),
            )
        except DjangoValidationError as exc:
            raise _as_drf_error(exc)
        return Response(
            DentalApprovalSerializer(approval, context=self.get_serializer_context()).data,
            status=http_status.HTTP_201_CREATED,
        )

    @action(detail=True, methods=["post"], url_path="rejeitar", url_name="rejeitar")
    def rejeitar(self, request, pk=None):
        quotation = self.get_object()
        try:
            DentalWorkflowService.reject_quotation(
                quotation, reason=request.data.get("reason", ""), actor_name=_actor_name(request)
            )
        except DjangoValidationError as exc:
            raise _as_drf_error(exc)
        return Response(self.get_serializer(quotation).data)


class DentalApprovalViewSet(ValidatedSearchOrderingMixin, TenantScopedQuerysetMixin, ModelViewSet):
    queryset = DentalApproval.objects.select_related("treatment_plan", "quotation", "patient").all()
    serializer_class = DentalApprovalSerializer
    filterset_class = DentalApprovalFilter
    permission_classes = [IsAuthenticated]
    search_fields = [
        "custom_id",
        "treatment_plan__title",
        "patient__name",
        "approved_by_name",
        "accepted_terms",
        "notes",
    ]
    ordering_fields = ["approved_at", "approval_scope", "approved_amount", "consent_signed", "created_at"]
    ordering = ["-approved_at", "-created_at"]


class DentalPaymentViewSet(ValidatedSearchOrderingMixin, TenantScopedQuerysetMixin, ModelViewSet):
    queryset = DentalPayment.objects.select_related(
        "patient",
        "treatment_plan",
        "treatment_item",
        "quotation",
        "payment",
    ).all()
    serializer_class = DentalPaymentSerializer
    filterset_class = DentalPaymentFilter
    permission_classes = [IsAuthenticated]
    search_fields = [
        "custom_id",
        "patient__name",
        "treatment_plan__title",
        "method",
        "external_reference",
        "notes",
    ]
    ordering_fields = ["due_date", "paid_at", "payment_kind", "status", "amount_due", "amount_paid", "created_at"]
    ordering = ["-due_date", "-created_at"]

    @action(detail=False, methods=["post"], url_path="registar", url_name="registar")
    def registar(self, request):
        tenant = getattr(request, "tenant", None)
        patient = _resolve_instance("clinical", "Patient", request.data.get("patient"), tenant)
        if patient is None:
            raise DRFValidationError({"patient": "Paciente é obrigatório."})
        plan = _resolve_instance("odontologia", "DentalTreatmentPlan", request.data.get("treatment_plan"), tenant)
        item = _resolve_instance("odontologia", "DentalTreatmentPlanItem", request.data.get("treatment_item"), tenant)
        quotation = _resolve_instance("odontologia", "DentalQuotation", request.data.get("quotation"), tenant)
        try:
            payment = DentalWorkflowService.register_payment(
                patient=patient,
                amount=request.data.get("amount", "0"),
                amount_due=request.data.get("amount_due"),
                treatment_plan=plan,
                treatment_item=item,
                quotation=quotation,
                payment_kind=request.data.get("payment_kind") or DentalPayment.PaymentKind.DEPOSIT,
                method=request.data.get("method", ""),
                external_reference=request.data.get("external_reference", ""),
                due_date=request.data.get("due_date") or None,
                actor_name=_actor_name(request),
            )
        except DjangoValidationError as exc:
            raise _as_drf_error(exc)
        return Response(self.get_serializer(payment).data, status=http_status.HTTP_201_CREATED)


class DentalProcedureExecutionViewSet(ValidatedSearchOrderingMixin, TenantScopedQuerysetMixin, ModelViewSet):
    queryset = DentalProcedureExecution.objects.select_related(
        "patient",
        "consultation",
        "treatment_plan",
        "treatment_item",
        "appointment",
        "procedure",
        "performed_by",
    ).all()
    serializer_class = DentalProcedureExecutionSerializer
    filterset_class = DentalProcedureExecutionFilter
    permission_classes = [IsAuthenticated]
    search_fields = [
        "custom_id",
        "patient__name",
        "procedure__name",
        "performed_by__name",
        "tooth_number",
        "materials_used",
        "clinical_notes",
    ]
    ordering_fields = ["scheduled_at", "started_at", "performed_at", "status", "patient", "procedure", "created_at"]
    ordering = ["-performed_at", "-scheduled_at", "-created_at"]

    @action(detail=True, methods=["post"], url_path="estornar", url_name="estornar")
    def estornar(self, request, pk=None):
        execution = self.get_object()
        try:
            DentalWorkflowService.refund_procedure(
                execution, reason=request.data.get("reason", ""), actor_name=_actor_name(request)
            )
        except DjangoValidationError as exc:
            raise _as_drf_error(exc)
        return Response(self.get_serializer(execution).data)


class DentalProsthesisLabOrderViewSet(ValidatedSearchOrderingMixin, TenantScopedQuerysetMixin, ModelViewSet):
    queryset = DentalProsthesisLabOrder.objects.select_related(
        "patient",
        "dentist",
        "treatment_item",
        "procedure_execution",
        "lab_company",
    ).all()
    serializer_class = DentalProsthesisLabOrderSerializer
    filterset_class = DentalProsthesisLabOrderFilter
    permission_classes = [IsAuthenticated]
    search_fields = [
        "custom_id",
        "order_number",
        "patient__name",
        "dentist__name",
        "lab_company__name",
        "tooth_numbers",
        "shade",
        "material",
        "lab_notes",
    ]
    ordering_fields = [
        "created_at",
        "due_date",
        "sent_at",
        "received_at",
        "delivered_at",
        "installed_at",
        "status",
        "cost",
        "patient_price",
    ]
    ordering = ["-created_at"]


class DentalImagingOrderViewSet(ValidatedSearchOrderingMixin, TenantScopedQuerysetMixin, ModelViewSet):
    queryset = DentalImagingOrder.objects.select_related(
        "patient",
        "dentist",
        "consultation",
        "record",
        "treatment_item",
        "procedure_execution",
    ).all()
    serializer_class = DentalImagingOrderSerializer
    filterset_class = DentalImagingOrderFilter
    permission_classes = [IsAuthenticated]
    search_fields = [
        "custom_id",
        "patient__name",
        "dentist__name",
        "clinical_indication",
        "result_summary",
        "image_reference",
        "notes",
    ]
    ordering_fields = [
        "requested_at",
        "scheduled_at",
        "acquired_at",
        "reviewed_at",
        "imaging_type",
        "status",
        "created_at",
    ]
    ordering = ["-requested_at", "-created_at"]


class DentalPrescriptionViewSet(ValidatedSearchOrderingMixin, TenantScopedQuerysetMixin, ModelViewSet):
    queryset = DentalPrescription.objects.select_related(
        "patient",
        "dentist",
        "consultation",
        "record",
        "procedure_execution",
        "medication_product",
    ).all()
    serializer_class = DentalPrescriptionSerializer
    filterset_class = DentalPrescriptionFilter
    permission_classes = [IsAuthenticated]
    search_fields = [
        "custom_id",
        "patient__name",
        "dentist__name",
        "medication",
        "dose",
        "frequency",
        "instructions",
        "notes",
    ]
    ordering_fields = ["prescribed_at", "status", "patient", "dentist", "created_at"]
    ordering = ["-prescribed_at", "-created_at"]


class DentalFollowUpViewSet(ValidatedSearchOrderingMixin, TenantScopedQuerysetMixin, ModelViewSet):
    queryset = DentalFollowUp.objects.select_related(
        "patient",
        "procedure_execution",
        "appointment",
        "treatment_plan",
    ).all()
    serializer_class = DentalFollowUpSerializer
    filterset_class = DentalFollowUpFilter
    permission_classes = [IsAuthenticated]
    search_fields = ["custom_id", "patient__name", "followup_reason", "findings", "notes"]
    ordering_fields = ["due_date", "completed_at", "status", "patient", "created_at"]
    ordering = ["due_date", "-created_at"]


class DentalMaterialConsumptionViewSet(ValidatedSearchOrderingMixin, TenantScopedQuerysetMixin, ModelViewSet):
    queryset = DentalMaterialConsumption.objects.select_related(
        "procedure_execution",
        "product",
        "warehouse_item",
        "inventory_movement",
    ).all()
    serializer_class = DentalMaterialConsumptionSerializer
    filterset_class = DentalMaterialConsumptionFilter
    permission_classes = [IsAuthenticated]
    search_fields = [
        "custom_id",
        "procedure_execution__custom_id",
        "material_name",
        "product__name",
        "warehouse_item__name",
        "notes",
    ]
    ordering_fields = ["consumed_at", "material_name", "quantity", "unit_cost", "created_at"]
    ordering = ["-consumed_at", "-created_at"]


class DentalClinicalEvolutionViewSet(ValidatedSearchOrderingMixin, TenantScopedQuerysetMixin, ModelViewSet):
    queryset = DentalClinicalEvolution.objects.select_related(
        "patient",
        "record",
        "consultation",
        "procedure_execution",
        "treatment_plan",
        "dentist",
    ).all()
    serializer_class = DentalClinicalEvolutionSerializer
    filterset_class = DentalClinicalEvolutionFilter
    permission_classes = [IsAuthenticated]
    search_fields = ["custom_id", "patient__name", "dentist__name", "summary", "next_steps", "notes"]
    ordering_fields = ["evolved_at", "patient", "dentist", "created_at"]
    ordering = ["-evolved_at", "-created_at"]


class DentalDocumentViewSet(ValidatedSearchOrderingMixin, TenantScopedQuerysetMixin, ModelViewSet):
    queryset = DentalDocument.objects.select_related("patient", "consultation", "record", "treatment_plan").all()
    serializer_class = DentalDocumentSerializer
    filterset_class = DentalDocumentFilter
    permission_classes = [IsAuthenticated]
    search_fields = ["custom_id", "patient__name", "title", "file_reference", "notes"]
    ordering_fields = ["created_at", "document_type", "signed", "signed_at", "patient"]
    ordering = ["-created_at"]


class DentalAuditEventViewSet(ValidatedSearchOrderingMixin, TenantScopedQuerysetMixin, ModelViewSet):
    queryset = DentalAuditEvent.objects.select_related("patient", "treatment_plan").all()
    serializer_class = DentalAuditEventSerializer
    filterset_class = DentalAuditEventFilter
    permission_classes = [IsAuthenticated]
    search_fields = ["custom_id", "event_type", "actor_name", "summary", "patient__name", "treatment_plan__title"]
    ordering_fields = ["event_at", "event_type", "patient", "created_at"]
    ordering = ["-event_at", "-created_at"]


class DentalBillingItemViewSet(ValidatedSearchOrderingMixin, TenantScopedQuerysetMixin, ModelViewSet):
    queryset = DentalBillingItem.objects.select_related(
        "patient",
        "treatment_plan",
        "treatment_item",
        "procedure_execution",
        "quotation",
        "invoice",
        "invoice_item",
    ).all()
    serializer_class = DentalBillingItemSerializer
    filterset_class = DentalBillingItemFilter
    permission_classes = [IsAuthenticated]
    search_fields = ["custom_id", "patient__name", "description", "notes"]
    ordering_fields = ["billable_at", "billed_at", "status", "quantity", "unit_price", "created_at"]
    ordering = ["-billable_at", "-created_at"]


class PatientDentalPlanSummaryViewSet(ValidatedSearchOrderingMixin, TenantScopedQuerysetMixin, ModelViewSet):
    queryset = PatientDentalPlanSummary.objects.select_related("patient", "active_plan", "next_appointment").all()
    serializer_class = PatientDentalPlanSummarySerializer
    filterset_class = PatientDentalPlanSummaryFilter
    permission_classes = [IsAuthenticated]
    search_fields = ["custom_id", "patient__name", "active_plan__title", "plan_status", "notes"]
    ordering_fields = [
        "generated_at",
        "plan_status",
        "total_planned_amount",
        "total_paid",
        "balance_amount",
        "created_at",
    ]
    ordering = ["-generated_at", "-created_at"]


VIEWSET_MAP = {
    "procedure": DentalProcedureViewSet,
    "appointment": DentalAppointmentViewSet,
    "consultation": DentalConsultationViewSet,
    "record": DentalRecordViewSet,
    "odontogram_chart": DentalOdontogramViewSet,
    "odontogram": DentalOdontogramEntryViewSet,
    "diagnosis": DentalDiagnosisViewSet,
    "treatment_plan": DentalTreatmentPlanViewSet,
    "treatment_phase": DentalTreatmentPhaseViewSet,
    "treatment_item": DentalTreatmentPlanItemViewSet,
    "patient_treatment_plan": DentalPatientTreatmentPlanViewSet,
    "quotation": DentalQuotationViewSet,
    "approval": DentalApprovalViewSet,
    "payment": DentalPaymentViewSet,
    "procedure_execution": DentalProcedureExecutionViewSet,
    "prosthesis_lab_order": DentalProsthesisLabOrderViewSet,
    "imaging_order": DentalImagingOrderViewSet,
    "prescription": DentalPrescriptionViewSet,
    "followup": DentalFollowUpViewSet,
    "material_consumption": DentalMaterialConsumptionViewSet,
    "clinical_evolution": DentalClinicalEvolutionViewSet,
    "document": DentalDocumentViewSet,
    "audit_event": DentalAuditEventViewSet,
    "billing_item": DentalBillingItemViewSet,
    "patient_plan_summary": PatientDentalPlanSummaryViewSet,
}

__all__ = [
    "VIEWSET_MAP",
    "DentalAppointmentViewSet",
    "DentalApprovalViewSet",
    "DentalAuditEventViewSet",
    "DentalBillingItemViewSet",
    "DentalClinicalEvolutionViewSet",
    "DentalConsultationViewSet",
    "DentalDiagnosisViewSet",
    "DentalDocumentViewSet",
    "DentalFollowUpViewSet",
    "DentalImagingOrderViewSet",
    "DentalMaterialConsumptionViewSet",
    "DentalOdontogramEntryViewSet",
    "DentalOdontogramViewSet",
    "DentalPatientTreatmentPlanViewSet",
    "DentalPaymentViewSet",
    "DentalPrescriptionViewSet",
    "DentalProcedureExecutionViewSet",
    "DentalProcedureViewSet",
    "DentalProsthesisLabOrderViewSet",
    "DentalQuotationViewSet",
    "DentalRecordViewSet",
    "DentalTreatmentPhaseViewSet",
    "DentalTreatmentPlanItemViewSet",
    "DentalTreatmentPlanViewSet",
    "PatientDentalPlanSummaryViewSet",
]
