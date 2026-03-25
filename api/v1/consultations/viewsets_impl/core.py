from datetime import datetime, time
from decimal import Decimal

from django.db import transaction
from django.utils import timezone
from django.utils.dateparse import parse_date, parse_datetime
from rest_framework import status
from rest_framework.decorators import action
from rest_framework.exceptions import ValidationError
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.viewsets import ModelViewSet, ReadOnlyModelViewSet

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
    ConsultationSpecialtySerializer,
    CreateConsultationInvoiceSerializer,
    DoctorSerializer,
    HolidaySerializer,
    MedicalConsultationSerializer,
    RescheduleConsultationSerializer,
)


class DoctorsViewSet(ValidatedSearchOrderingMixin, TenantScopedQuerysetMixin, ReadOnlyModelViewSet):
    queryset = Employee.objects.select_related("cargo").all()
    serializer_class = DoctorSerializer
    filterset_class = DoctorFilter
    permission_classes = [IsAuthenticated]
    search_fields = ["nome", "profissao", "cargo__nome"]
    ordering_fields = ["nome", "profissao", "criado_em"]
    ordering = ["nome"]

    def get_queryset(self):
        qs = super().get_queryset()
        # Doctors are employees with a role flagged as doctor and active.
        return qs.filter(cargo__eh_medico=True, estado="ATIVO").distinct()


class TenantScopedModelViewSet(ValidatedSearchOrderingMixin, TenantScopedQuerysetMixin, ModelViewSet):
    permission_classes = [IsAuthenticated]


class ConsultationSpecialtyViewSet(TenantScopedModelViewSet):
    queryset = ConsultationSpecialty.objects.all()
    serializer_class = ConsultationSpecialtySerializer
    filterset_class = ConsultationSpecialtyFilter
    search_fields = ["id_custom", "nome"]
    ordering_fields = ["nome", "preco_base", "criado_em"]
    ordering = ["nome"]


class HolidayViewSet(TenantScopedModelViewSet):
    queryset = Holiday.objects.all()
    serializer_class = HolidaySerializer
    filterset_class = HolidayFilter
    search_fields = ["id_custom", "descricao"]
    ordering_fields = ["data", "ativo", "criado_em"]
    ordering = ["-data", "-criado_em"]


class MedicalConsultationViewSet(ValidatedSearchOrderingMixin, TenantScopedQuerysetMixin, ModelViewSet):
    queryset = MedicalConsultation.objects.select_related("paciente", "medico", "especialidade").all()
    serializer_class = MedicalConsultationSerializer
    filterset_class = MedicalConsultationFilter
    permission_classes = [IsAuthenticated]
    search_fields = ["id_custom", "tipo", "paciente__nome", "medico__nome"]
    ordering_fields = ["agendada_para", "criado_em", "tipo", "estado", "preco"]
    ordering = ["-agendada_para", "-criado_em"]

    @action(detail=False, methods=["get"], url_path="preco", url_name="preco")
    def price_preview(self, request):
        """
        Price preview for a specialty at a given date/time.

        Query params:
        - especialidade: id (required)
        - agendada_para: ISO datetime (optional; default: now)
        - feriado_manual: bool (optional; default: False)
        """
        tenant = getattr(request, "inquilino", None)
        if tenant is None:
            raise ValidationError("Tenant não identificado.")

        specialty_id = (request.query_params.get("especialidade") or "").strip()
        if not specialty_id:
            raise ValidationError({"especialidade": "Informe o id da especialidade."})

        specialty = ConsultationSpecialty.objects.filter(inquilino=tenant, pk=specialty_id).first()
        if not specialty:
            raise ValidationError({"especialidade": "Especialidade não encontrada."})

        raw_dt = (request.query_params.get("agendada_para") or "").strip()
        dt = parse_datetime(raw_dt) if raw_dt else None
        if raw_dt and not dt:
            # Accept YYYY-MM-DD as a convenience fallback.
            d = parse_date(raw_dt)
            if not d:
                raise ValidationError({"agendada_para": "Datetime inválido (use ISO 8601)."})
            dt = timezone.make_aware(datetime.combine(d, time.min))

        if not dt:
            dt = timezone.now()

        manual_holiday = (request.query_params.get("feriado_manual") or "").lower() in {"1", "true", "t", "sim"}

        consultation = MedicalConsultation(
            inquilino=tenant,
            especialidade=specialty,
            agendada_para=dt,
            tipo="tmp",
            preco=Decimal("0.00"),
            feriado_manual=manual_holiday,
        )

        # Reuse the model pricing rules (holiday + percentage uplift).
        consultation._sincronizar_especialidade_e_preco(None)

        try:
            currency = getattr(getattr(tenant, "configuracao", None), "moeda", "MZN")
        except Exception:
            currency = "MZN"

        return Response(
            {
                "especialidade": specialty.id,
                "especialidade_nome": specialty.nome,
                "preco_base": str(specialty.preco_base or Decimal("0.00")),
                "feriado_manual": bool(manual_holiday),
                "eh_feriado": bool(consultation._is_feriado()),
                "tipo_horario": consultation.tipo_horario,
                "multiplicador_preco": str(consultation.multiplicador_preco or Decimal("1.00")),
                "preco_final": str(consultation.preco or Decimal("0.00")),
                "moeda": currency,
            },
            status=status.HTTP_200_OK,
        )

    @action(detail=False, methods=["get"], url_path="agenda", url_name="agenda")
    def schedule(self, request):
        """
        List consultations by doctor and time range.

        Query params:
        - medico: user id (optional)
        - start: ISO datetime (optional)
        - end: ISO datetime (optional)
        - estado: MARCADA|CONCLUIDA|CANCELADA (optional)
        """

        qs = self.get_queryset()

        doctor_id = (request.query_params.get("medico") or "").strip()
        if doctor_id:
            qs = qs.filter(medico_id=doctor_id)

        estado = (request.query_params.get("estado") or "").strip()
        if estado:
            qs = qs.filter(estado=estado)

        start = (request.query_params.get("start") or "").strip()
        if start:
            dt = parse_datetime(start)
            if not dt:
                raise ValidationError({"start": "Datetime inválido (use ISO 8601)."})
            qs = qs.filter(agendada_para__gte=dt)

        end = (request.query_params.get("end") or "").strip()
        if end:
            dt = parse_datetime(end)
            if not dt:
                raise ValidationError({"end": "Datetime inválido (use ISO 8601)."})
            qs = qs.filter(agendada_para__lte=dt)

        qs = qs.order_by("agendada_para", "id")

        page = self.paginate_queryset(qs)
        if page is not None:
            ser = self.get_serializer(page, many=True)
            return self.get_paginated_response(ser.data)

        ser = self.get_serializer(qs, many=True)
        return Response(ser.data, status=status.HTTP_200_OK)

    @transaction.atomic
    @action(detail=True, methods=["post"], url_path="criar_fatura", url_name="criar-fatura")
    def create_invoice(self, request, pk=None):
        consultation = self.get_object()

        payload = CreateConsultationInvoiceSerializer(data=request.data or {})
        payload.is_valid(raise_exception=True)
        should_issue = payload.validated_data.get("emitir", True)

        if hasattr(consultation, "fatura") and getattr(consultation, "fatura", None):
            invoice = consultation.fatura
        else:
            invoice = Invoice(
                inquilino=consultation.inquilino,
                origem=Invoice.Origem.CONSULTA,
                consulta=consultation,
                paciente=consultation.paciente,
            )
            invoice.full_clean()
            invoice.save()

        # Keep the invoice draft aligned with the consultation pricing.
        if invoice.estado != Invoice.Estado.RASCUNHO:
            raise ValidationError("A fatura vinculada já foi emitida/paga/cancelada.")

        # Replace draft items from the current consultation state.
        invoice.sincronizar_itens_da_origem()

        if should_issue:
            invoice.emitir()

        return Response(
            {
                "consulta_id": consultation.id,
                "fatura_id": invoice.id,
                "fatura_codigo": invoice.id_custom,
                "fatura_estado": invoice.estado,
                "total": str(invoice.total or Decimal("0.00")),
            },
            status=status.HTTP_200_OK,
        )

    @transaction.atomic
    @action(detail=True, methods=["post"], url_path="remarcar", url_name="remarcar")
    def reschedule(self, request, pk=None):
        consultation = self.get_object()

        if consultation.estado in {MedicalConsultation.Estado.CANCELADA, MedicalConsultation.Estado.CONCLUIDA}:
            raise ValidationError("Consulta não pode ser remarcada (já finalizada).")

        payload = RescheduleConsultationSerializer(data=request.data or {})
        payload.is_valid(raise_exception=True)

        consultation.agendada_para = payload.validated_data["agendada_para"]
        consultation.save(update_fields=["agendada_para"])

        return Response(
            MedicalConsultationSerializer(consultation).data,
            status=status.HTTP_200_OK,
        )

    @transaction.atomic
    @action(detail=True, methods=["post"], url_path="cancelar", url_name="cancelar")
    def cancel(self, request, pk=None):
        consultation = self.get_object()

        if consultation.estado == MedicalConsultation.Estado.CONCLUIDA:
            raise ValidationError("Consulta concluída não pode ser cancelada.")

        # Keep accepting a payload for future extensions (reason, actor, etc).
        payload = CancelConsultationSerializer(data=request.data or {})
        payload.is_valid(raise_exception=True)

        consultation.estado = MedicalConsultation.Estado.CANCELADA
        consultation.cancelada_em = timezone.now()
        consultation.save(update_fields=["estado", "cancelada_em"])

        return Response(
            MedicalConsultationSerializer(consultation).data,
            status=status.HTTP_200_OK,
        )

    @transaction.atomic
    @action(detail=True, methods=["post"], url_path="concluir", url_name="concluir")
    def complete(self, request, pk=None):
        consultation = self.get_object()

        if consultation.estado == MedicalConsultation.Estado.CANCELADA:
            raise ValidationError("Consulta cancelada não pode ser concluída.")

        consultation.estado = MedicalConsultation.Estado.CONCLUIDA
        consultation.concluida_em = timezone.now()
        consultation.save(update_fields=["estado", "concluida_em"])

        return Response(
            MedicalConsultationSerializer(consultation).data,
            status=status.HTTP_200_OK,
        )


VIEWSET_MAP = {
    "consulta": MedicalConsultationViewSet,
    "medicos": DoctorsViewSet,
    "especialidade": ConsultationSpecialtyViewSet,
    "feriado": HolidayViewSet,
}

__all__ = [
    "VIEWSET_MAP",
    "DoctorsViewSet",
    "MedicalConsultationViewSet",
]

# Backwards-compatible aliases while imports are migrated module by module.
MedicosViewSet = DoctorsViewSet
EspecialidadeConsultaViewSet = ConsultationSpecialtyViewSet
FeriadoViewSet = HolidayViewSet
ConsultaMedicaViewSet = MedicalConsultationViewSet
