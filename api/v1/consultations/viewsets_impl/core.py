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
from apps.consultations.models.medical_consultation import MedicalConsultation
from apps.consultations.models.consultation_specialty import ConsultationSpecialty
from apps.consultations.models.holiday import Holiday
from apps.billing.models.invoice import Invoice
from apps.human_resources.models.employee import Employee

from ..filters import (
    ConsultaMedicaFilter,
    EspecialidadeConsultaFilter,
    FeriadoFilter,
    MedicoFilter,
)
from ..serializers import (
    CancelarConsultaSerializer,
    ConsultaMedicaSerializer,
    CriarFaturaConsultaSerializer,
    EspecialidadeConsultaSerializer,
    FeriadoSerializer,
    MedicoSerializer,
    RemarcarConsultaSerializer,
)


class MedicosViewSet(ValidatedSearchOrderingMixin, TenantScopedQuerysetMixin, ReadOnlyModelViewSet):
    queryset = Employee.objects.select_related("cargo").all()
    serializer_class = MedicoSerializer
    filterset_class = MedicoFilter
    permission_classes = [IsAuthenticated]
    search_fields = ["nome", "profissao", "cargo__nome"]
    ordering_fields = ["nome", "profissao", "criado_em"]
    ordering = ["nome"]

    def get_queryset(self):
        qs = super().get_queryset()
        # Médicos são funcionários com cargo marcado como médico e ativos.
        return qs.filter(cargo__eh_medico=True, estado="ATIVO").distinct()


class TenantScopedModelViewSet(ValidatedSearchOrderingMixin, TenantScopedQuerysetMixin, ModelViewSet):
    permission_classes = [IsAuthenticated]


class EspecialidadeConsultaViewSet(TenantScopedModelViewSet):
    queryset = ConsultationSpecialty.objects.all()
    serializer_class = EspecialidadeConsultaSerializer
    filterset_class = EspecialidadeConsultaFilter
    search_fields = ["id_custom", "nome"]
    ordering_fields = ["nome", "preco_base", "criado_em"]
    ordering = ["nome"]


class FeriadoViewSet(TenantScopedModelViewSet):
    queryset = Holiday.objects.all()
    serializer_class = FeriadoSerializer
    filterset_class = FeriadoFilter
    search_fields = ["id_custom", "descricao"]
    ordering_fields = ["data", "ativo", "criado_em"]
    ordering = ["-data", "-criado_em"]


class ConsultaMedicaViewSet(ValidatedSearchOrderingMixin, TenantScopedQuerysetMixin, ModelViewSet):
    queryset = MedicalConsultation.objects.select_related("paciente", "medico", "especialidade").all()
    serializer_class = ConsultaMedicaSerializer
    filterset_class = ConsultaMedicaFilter
    permission_classes = [IsAuthenticated]
    search_fields = ["id_custom", "tipo", "paciente__nome", "medico__nome"]
    ordering_fields = ["agendada_para", "criado_em", "tipo", "estado", "preco"]
    ordering = ["-agendada_para", "-criado_em"]

    @action(detail=False, methods=["get"], url_path="preco")
    def preco(self, request):
        """
        Preview de preço (horário, fim de semana, fora de expediente, feriado manual)
        para uma especialidade + data/hora.

        Query params:
        - especialidade: id (obrigatório)
        - agendada_para: datetime ISO (opcional; default: now)
        - feriado_manual: bool (opcional; default: False)
        """
        inquilino = getattr(request, "inquilino", None)
        if inquilino is None:
            raise ValidationError("Tenant não identificado.")

        especialidade_id = (request.query_params.get("especialidade") or "").strip()
        if not especialidade_id:
            raise ValidationError({"especialidade": "Informe o id da especialidade."})

        especialidade = ConsultationSpecialty.objects.filter(inquilino=inquilino, pk=especialidade_id).first()
        if not especialidade:
            raise ValidationError({"especialidade": "Especialidade não encontrada."})

        raw_dt = (request.query_params.get("agendada_para") or "").strip()
        dt = parse_datetime(raw_dt) if raw_dt else None
        if raw_dt and not dt:
            # Aceita YYYY-MM-DD também.
            d = parse_date(raw_dt)
            if not d:
                raise ValidationError({"agendada_para": "Datetime inválido (use ISO 8601)."})
            dt = timezone.make_aware(datetime.combine(d, time.min))

        if not dt:
            dt = timezone.now()

        feriado_manual = (request.query_params.get("feriado_manual") or "").lower() in {"1", "true", "t", "sim"}

        consulta = MedicalConsultation(
            inquilino=inquilino,
            especialidade=especialidade,
            agendada_para=dt,
            tipo="tmp",
            preco=Decimal("0.00"),
            feriado_manual=feriado_manual,
        )

        # Reusa a mesma regra do model (feriado + acrescimo percentual).
        consulta._sincronizar_especialidade_e_preco(None)

        try:
            moeda = getattr(getattr(inquilino, "configuracao", None), "moeda", "MZN")
        except Exception:
            moeda = "MZN"

        return Response(
            {
                "especialidade": especialidade.id,
                "especialidade_nome": especialidade.nome,
                "preco_base": str(especialidade.preco_base or Decimal("0.00")),
                "feriado_manual": bool(feriado_manual),
                "eh_feriado": bool(consulta._is_feriado()),
                "tipo_horario": consulta.tipo_horario,
                "multiplicador_preco": str(consulta.multiplicador_preco or Decimal("1.00")),
                "preco_final": str(consulta.preco or Decimal("0.00")),
                "moeda": moeda,
            },
            status=status.HTTP_200_OK,
        )

    @action(detail=False, methods=["get"])
    def agenda(self, request):
        """
        Lista agenda de consultas por médico e intervalo.

        Query params:
        - medico: id do usuário (opcional)
        - start: datetime ISO (opcional)
        - end: datetime ISO (opcional)
        - estado: MARCADA|CONCLUIDA|CANCELADA (opcional)
        """

        qs = self.get_queryset()

        medico = (request.query_params.get("medico") or "").strip()
        if medico:
            qs = qs.filter(medico_id=medico)

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
    @action(detail=True, methods=["post"])
    def criar_fatura(self, request, pk=None):
        consulta = self.get_object()

        payload = CriarFaturaConsultaSerializer(data=request.data or {})
        payload.is_valid(raise_exception=True)
        emitir = payload.validated_data.get("emitir", True)

        if hasattr(consulta, "fatura") and getattr(consulta, "fatura", None):
            fatura = consulta.fatura
        else:
            fatura = Invoice(
                inquilino=consulta.inquilino,
                origem=Invoice.Origem.CONSULTA,
                consulta=consulta,
                paciente=consulta.paciente,
            )
            fatura.full_clean()
            fatura.save()

        # Sincroniza itens: 1 item AJUSTE com descrição/preço da consulta.
        if fatura.estado != Invoice.Estado.RASCUNHO:
            raise ValidationError("A fatura vinculada já foi emitida/paga/cancelada.")

        # Remove itens atuais (rascunho) e recria de origem.
        fatura.sincronizar_itens_da_origem()

        if emitir:
            fatura.emitir()

        return Response(
            {
                "consulta_id": consulta.id,
                "fatura_id": fatura.id,
                "fatura_codigo": fatura.id_custom,
                "fatura_estado": fatura.estado,
                "total": str(fatura.total or Decimal("0.00")),
            },
            status=status.HTTP_200_OK,
        )

    @transaction.atomic
    @action(detail=True, methods=["post"])
    def remarcar(self, request, pk=None):
        consulta = self.get_object()

        if consulta.estado in {MedicalConsultation.Estado.CANCELADA, MedicalConsultation.Estado.CONCLUIDA}:
            raise ValidationError("Consulta não pode ser remarcada (já finalizada).")

        payload = RemarcarConsultaSerializer(data=request.data or {})
        payload.is_valid(raise_exception=True)

        consulta.agendada_para = payload.validated_data["agendada_para"]
        consulta.save(update_fields=["agendada_para"])

        return Response(
            ConsultaMedicaSerializer(consulta).data,
            status=status.HTTP_200_OK,
        )

    @transaction.atomic
    @action(detail=True, methods=["post"])
    def cancelar(self, request, pk=None):
        consulta = self.get_object()

        if consulta.estado == MedicalConsultation.Estado.CONCLUIDA:
            raise ValidationError("Consulta concluída não pode ser cancelada.")

        # Aceita payload para extensão futura (motivo).
        payload = CancelarConsultaSerializer(data=request.data or {})
        payload.is_valid(raise_exception=True)

        consulta.estado = MedicalConsultation.Estado.CANCELADA
        consulta.cancelada_em = timezone.now()
        consulta.save(update_fields=["estado", "cancelada_em"])

        return Response(
            ConsultaMedicaSerializer(consulta).data,
            status=status.HTTP_200_OK,
        )

    @transaction.atomic
    @action(detail=True, methods=["post"])
    def concluir(self, request, pk=None):
        consulta = self.get_object()

        if consulta.estado == MedicalConsultation.Estado.CANCELADA:
            raise ValidationError("Consulta cancelada não pode ser concluída.")

        consulta.estado = MedicalConsultation.Estado.CONCLUIDA
        consulta.concluida_em = timezone.now()
        consulta.save(update_fields=["estado", "concluida_em"])

        return Response(
            ConsultaMedicaSerializer(consulta).data,
            status=status.HTTP_200_OK,
        )


VIEWSET_MAP = {
    "consulta": ConsultaMedicaViewSet,
    "medicos": MedicosViewSet,
    "especialidade": EspecialidadeConsultaViewSet,
    "feriado": FeriadoViewSet,
}

__all__ = [
    "VIEWSET_MAP",
    "ConsultaMedicaViewSet",
    "MedicosViewSet",
]
