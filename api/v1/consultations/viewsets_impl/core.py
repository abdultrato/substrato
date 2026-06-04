from datetime import datetime, time
from decimal import Decimal

from django.db import transaction
from django.http import HttpResponse
from django.utils import timezone
from django.utils.dateparse import parse_date, parse_datetime
from drf_spectacular.utils import OpenApiParameter, OpenApiTypes, extend_schema
from rest_framework import status
from rest_framework.decorators import action
from rest_framework.exceptions import PermissionDenied, ValidationError
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.viewsets import ModelViewSet, ReadOnlyModelViewSet

from api.utils.async_exports import queue_export_if_requested
from api.v1.clinical.services import build_patient_clinical_history, user_can_view_clinical_history
from api.v1.viewset_mixins import TenantScopedQuerysetMixin, ValidatedSearchOrderingMixin
from apps.billing.models.invoice import Invoice
from apps.consultations.models.consultation_specialty import ConsultationSpecialty
from apps.consultations.models.holiday import Holiday
from apps.consultations.models.medical_consultation import MedicalConsultation
from apps.human_resources.models.employee import Employee

from ..filters import (
    ConsultationSpecialtyFilter,
    DoctorFilter,
    HolidayFilter,
    MedicalConsultationFilter,
)
from ..serializers import (
    CancelConsultationSerializer,
    ConsultationPricePreviewSerializer,
    ConsultationSpecialtySerializer,
    CreateConsultationInvoiceResponseSerializer,
    CreateConsultationInvoiceSerializer,
    DoctorSerializer,
    HolidaySerializer,
    MedicalConsultationSerializer,
    RescheduleConsultationSerializer,
)


class DoctorsViewSet(ValidatedSearchOrderingMixin, TenantScopedQuerysetMixin, ReadOnlyModelViewSet):
    queryset = Employee.objects.select_related("role", "profession").all()
    serializer_class = DoctorSerializer
    filterset_class = DoctorFilter
    permission_classes = [IsAuthenticated]
    search_fields = ["name", "profession__name", "role__name"]
    ordering_fields = ["name", "profession__name", "created_at"]
    ordering = ["name"]

    def get_queryset(self):
        qs = super().get_queryset()
        # Doctors are employees with a role flagged as doctor and active.
        return qs.filter(role__is_doctor=True, status="ATIVO").distinct()


class TenantScopedModelViewSet(ValidatedSearchOrderingMixin, TenantScopedQuerysetMixin, ModelViewSet):
    permission_classes = [IsAuthenticated]


class ConsultationSpecialtyViewSet(TenantScopedModelViewSet):
    queryset = ConsultationSpecialty.objects.all()
    serializer_class = ConsultationSpecialtySerializer
    filterset_class = ConsultationSpecialtyFilter
    search_fields = ["custom_id", "name"]
    ordering_fields = ["name", "base_price", "created_at"]
    ordering = ["name"]


class HolidayViewSet(TenantScopedModelViewSet):
    queryset = Holiday.objects.all()
    serializer_class = HolidaySerializer
    filterset_class = HolidayFilter
    search_fields = ["custom_id", "description"]
    ordering_fields = ["date", "active", "created_at"]
    ordering = ["-date", "-created_at"]


class MedicalConsultationViewSet(ValidatedSearchOrderingMixin, TenantScopedQuerysetMixin, ModelViewSet):
    queryset = MedicalConsultation.objects.select_related("patient", "doctor", "specialty").all()
    serializer_class = MedicalConsultationSerializer
    filterset_class = MedicalConsultationFilter
    permission_classes = [IsAuthenticated]
    search_fields = ["custom_id", "type", "patient__name", "doctor__name"]
    ordering_fields = ["scheduled_for", "created_at", "type", "status", "price"]
    ordering = ["-scheduled_for", "-created_at"]

    @action(detail=True, methods=["get"], url_path="clinical-history", url_name="clinical-history")
    def clinical_history(self, request, pk=None):
        """
        Return the aggregated clinical history for the consultation patient.

        This endpoint keeps sensitive clinical aggregation on the backend.
        """
        if not user_can_view_clinical_history(getattr(request, "user", None)):
            raise PermissionDenied("Requer Médico/Medicina Ocupacional/Administrador para ver a história clínica.")

        consultation = self.get_object()
        patient = getattr(consultation, "patient", None)
        if not patient:
            raise ValidationError("Consulta sem paciente associado.")

        return Response(build_patient_clinical_history(request, patient))

    @action(detail=True, methods=["get"], url_path="clinical-history/pdf", url_name="clinical-history-pdf")
    def clinical_history_pdf(self, request, pk=None):
        """
        Return the aggregated clinical history PDF for the consultation patient.
        """
        if not user_can_view_clinical_history(getattr(request, "user", None)):
            raise PermissionDenied("Requer Médico/Medicina Ocupacional/Administrador para emitir a história clínica.")

        consultation = self.get_object()
        patient = getattr(consultation, "patient", None)
        if not patient:
            raise ValidationError("Consulta sem paciente associado.")

        payload = build_patient_clinical_history(request, patient)
        queued = queue_export_if_requested(
            request,
            export_key="patient_history_pdf",
            payload=payload,
            content_disposition="inline",
        )
        if queued is not None:
            return queued

        from tasks.generate_pdf.patient_history_pdf_generator import generate_patient_history_pdf

        pdf_bytes, filename = generate_patient_history_pdf(payload, request=request)
        response = HttpResponse(pdf_bytes, content_type="application/pdf")
        response["Content-Disposition"] = f'inline; filename="{filename}"'
        return response

    @extend_schema(
        parameters=[
            OpenApiParameter("specialty", OpenApiTypes.INT, OpenApiParameter.QUERY, required=True),
            OpenApiParameter("scheduled_for", OpenApiTypes.DATETIME, OpenApiParameter.QUERY, required=False),
            OpenApiParameter("manual_holiday", OpenApiTypes.BOOL, OpenApiParameter.QUERY, required=False),
        ],
        responses=ConsultationPricePreviewSerializer,
    )
    @action(detail=False, methods=["get"], url_path="price", url_name="price")
    def price_preview(self, request):
        """
        Price preview for a specialty at a given date/time.

        Query params:
        - specialty: id (required)
        - scheduled_for: ISO datetime (optional; default: now)
        - manual_holiday: bool (optional; default: False)
        """
        tenant = getattr(request, "tenant", None)
        if tenant is None:
            raise ValidationError("Tenant não identificado.")

        specialty_id = (request.query_params.get("specialty") or "").strip()
        if not specialty_id:
            raise ValidationError({"specialty": "Informe o id da specialty."})

        specialty = ConsultationSpecialty.objects.filter(tenant=tenant, pk=specialty_id).first()
        if not specialty:
            raise ValidationError({"specialty": "Especialidade não encontrada."})

        raw_dt = (request.query_params.get("scheduled_for") or "").strip()
        dt = parse_datetime(raw_dt) if raw_dt else None
        if raw_dt and not dt:
            # Accept YYYY-MM-DD as a convenience fallback.
            d = parse_date(raw_dt)
            if not d:
                raise ValidationError({"scheduled_for": "Datetime inválido (use ISO 8601)."})
            dt = timezone.make_aware(datetime.combine(d, time.min))

        if not dt:
            dt = timezone.now()

        manual_holiday_raw = request.query_params.get("manual_holiday") or ""
        manual_holiday = manual_holiday_raw.lower() in {"1", "true", "t", "yes"}

        consultation = MedicalConsultation(
            tenant=tenant,
            specialty=specialty,
            scheduled_for=dt,
            type="tmp",
            price=Decimal("0.00"),
            manual_holiday=manual_holiday,
        )

        # Reuse the model pricing rules (holiday + percentage uplift).
        consultation._sync_specialty_and_price(None)

        try:
            currency = getattr(getattr(tenant, "configuracao", None), "currency", "MZN")
        except Exception:
            currency = "MZN"

        payload = {
            "specialty": specialty.id,
            "specialty_name": specialty.name,
            "base_price": str(specialty.base_price or Decimal("0.00")),
            "manual_holiday": bool(manual_holiday),
            "is_holiday": bool(consultation._is_holiday()),
            "schedule_type": consultation.schedule_type,
            "price_multiplier": str(consultation.price_multiplier or Decimal("1.00")),
            "price_final": str(consultation.price or Decimal("0.00")),
            "currency": currency,
        }
        return Response(payload, status=status.HTTP_200_OK)

    @extend_schema(
        parameters=[
            OpenApiParameter("doctor", OpenApiTypes.INT, OpenApiParameter.QUERY, required=False),
            OpenApiParameter("start", OpenApiTypes.DATETIME, OpenApiParameter.QUERY, required=False),
            OpenApiParameter("end", OpenApiTypes.DATETIME, OpenApiParameter.QUERY, required=False),
            OpenApiParameter("status", OpenApiTypes.STR, OpenApiParameter.QUERY, required=False),
        ],
        responses=MedicalConsultationSerializer(many=True),
    )
    @action(detail=False, methods=["get"], url_path="schedule", url_name="schedule")
    def schedule(self, request):
        """
        List consultations by doctor and time range.

        Query params:
        - doctor: user id (optional)
        - start: ISO datetime (optional)
        - end: ISO datetime (optional)
        - status: MARCADA|CONCLUIDA|CANCELADA (optional)
        """

        qs = self.get_queryset()

        doctor_id = (request.query_params.get("doctor") or "").strip()
        if doctor_id:
            qs = qs.filter(doctor_id=doctor_id)

        requested_status = (request.query_params.get("status") or "").strip()
        if requested_status:
            qs = qs.filter(status=requested_status)

        start = (request.query_params.get("start") or "").strip()
        if start:
            dt = parse_datetime(start)
            if not dt:
                raise ValidationError({"start": "Datetime inválido (use ISO 8601)."})
            qs = qs.filter(scheduled_for__gte=dt)

        end = (request.query_params.get("end") or "").strip()
        if end:
            dt = parse_datetime(end)
            if not dt:
                raise ValidationError({"end": "Datetime inválido (use ISO 8601)."})
            qs = qs.filter(scheduled_for__lte=dt)

        qs = qs.order_by("scheduled_for", "id")

        page = self.paginate_queryset(qs)
        if page is not None:
            ser = self.get_serializer(page, many=True)
            return self.get_paginated_response(ser.data)

        ser = self.get_serializer(qs, many=True)
        return Response(ser.data, status=status.HTTP_200_OK)

    @extend_schema(
        request=CreateConsultationInvoiceSerializer,
        responses=CreateConsultationInvoiceResponseSerializer,
    )
    @transaction.atomic
    @action(detail=True, methods=["post"], url_path="create-invoice", url_name="create-invoice")
    def create_invoice(self, request, pk=None):
        consultation = self.get_object()

        payload = CreateConsultationInvoiceSerializer(data=request.data or {})
        payload.is_valid(raise_exception=True)
        should_issue = payload.validated_data.get("issue", True)

        if hasattr(consultation, "invoice") and getattr(consultation, "invoice", None):
            invoice = consultation.invoice
        else:
            invoice = Invoice(
                tenant=consultation.tenant,
                origin=Invoice.Origin.CONSULTATION,
                consultation=consultation,
                patient=consultation.patient,
            )
            invoice.full_clean()
            invoice.save()

        # Keep the draft invoice aligned with the consultation pricing.
        if invoice.status != Invoice.Status.DRAFT:
            raise ValidationError("A fatura vinculada já foi emitida/paga/cancelada.")

        # Replace draft items from the current consultation state.
        invoice.sync_items_from_origin()

        if should_issue:
            invoice.issue()

        return Response(
            {
                "consultation_id": consultation.id,
                "invoice_id": invoice.id,
                "invoice_code": invoice.custom_id,
                "invoice_status": invoice.status,
                "total": str(invoice.total or Decimal("0.00")),
            },
            status=status.HTTP_200_OK,
        )

    @extend_schema(
        request=RescheduleConsultationSerializer,
        responses=MedicalConsultationSerializer,
    )
    @transaction.atomic
    @action(detail=True, methods=["post"], url_path="reschedule", url_name="reschedule")
    def reschedule(self, request, pk=None):
        consultation = self.get_object()

        if consultation.status in {MedicalConsultation.Status.CANCELED, MedicalConsultation.Status.COMPLETED}:
            raise ValidationError("Consulta não pode ser remarcada (já finalizada).")

        payload = RescheduleConsultationSerializer(data=request.data or {})
        payload.is_valid(raise_exception=True)

        consultation.scheduled_for = payload.validated_data["scheduled_for"]
        consultation.save(update_fields=["scheduled_for"])

        return Response(
            MedicalConsultationSerializer(consultation).data,
            status=status.HTTP_200_OK,
        )

    @extend_schema(
        request=CancelConsultationSerializer,
        responses=MedicalConsultationSerializer,
    )
    @transaction.atomic
    @action(detail=True, methods=["post"], url_path="cancel", url_name="cancel")
    def cancel(self, request, pk=None):
        consultation = self.get_object()

        if consultation.status == MedicalConsultation.Status.COMPLETED:
            raise ValidationError("Consulta concluída não pode ser cancelada.")

        # Keep accepting a payload for future extensions (reason, actor, etc).
        payload = CancelConsultationSerializer(data=request.data or {})
        payload.is_valid(raise_exception=True)

        consultation.status = MedicalConsultation.Status.CANCELED
        consultation.canceled_at = timezone.now()
        consultation.save(update_fields=["status", "canceled_at"])

        return Response(
            MedicalConsultationSerializer(consultation).data,
            status=status.HTTP_200_OK,
        )

    @extend_schema(
        request=None,
        responses=MedicalConsultationSerializer,
    )
    @transaction.atomic
    @action(detail=True, methods=["post"], url_path="complete", url_name="complete")
    def complete(self, request, pk=None):
        consultation = self.get_object()

        if consultation.status == MedicalConsultation.Status.CANCELED:
            raise ValidationError("Consulta cancelada não pode ser concluída.")

        consultation.status = MedicalConsultation.Status.COMPLETED
        consultation.completed_at = timezone.now()
        consultation.save(update_fields=["status", "completed_at"])

        return Response(
            MedicalConsultationSerializer(consultation).data,
            status=status.HTTP_200_OK,
        )

VIEWSET_MAP = {
    "consultation": MedicalConsultationViewSet,
    "doctors": DoctorsViewSet,
    "holiday": HolidayViewSet,
    "specialty": ConsultationSpecialtyViewSet,
}

__all__ = [
    "VIEWSET_MAP",
    "DoctorsViewSet",
    "MedicalConsultationViewSet",
]
