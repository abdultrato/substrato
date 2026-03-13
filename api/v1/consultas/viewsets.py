from decimal import Decimal

from django.db import transaction
from rest_framework import status
from rest_framework.decorators import action
from rest_framework.exceptions import ValidationError
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.viewsets import ModelViewSet, ReadOnlyModelViewSet

from aplicativos.consultas.modelos.consulta_medica import ConsultaMedica
from aplicativos.faturamento.modelos.fatura import Fatura
from aplicativos.faturamento.modelos.fatura_itens import FaturaItem
from aplicativos.identidade.modelos.usuario import Usuario

from .filters import ConsultaMedicaFilter, MedicoFilter
from .serializers import (
    ConsultaMedicaSerializer,
    CriarFaturaConsultaSerializer,
    MedicoSerializer,
)


class MedicosViewSet(ReadOnlyModelViewSet):
    queryset = Usuario.objects.all()
    serializer_class = MedicoSerializer
    filterset_class = MedicoFilter
    permission_classes = [IsAuthenticated]
    search_fields = ["username", "first_name", "last_name"]
    ordering_fields = ["username", "first_name", "last_name"]
    ordering = ["username"]

    def get_queryset(self):
        qs = super().get_queryset()
        inquilino = getattr(self.request, "inquilino", None)
        if inquilino is not None:
            qs = qs.filter(inquilino=inquilino)
        # Grupo canônico com acento.
        return qs.filter(groups__name="Médico")


class ConsultaMedicaViewSet(ModelViewSet):
    queryset = ConsultaMedica.objects.select_related("paciente", "medico").all()
    serializer_class = ConsultaMedicaSerializer
    filterset_class = ConsultaMedicaFilter
    permission_classes = [IsAuthenticated]
    search_fields = ["id_custom", "tipo", "paciente__nome", "medico__username"]
    ordering_fields = ["agendada_para", "criado_em", "tipo", "estado", "preco"]
    ordering = ["-agendada_para", "-criado_em"]

    def get_queryset(self):
        qs = super().get_queryset()
        inquilino = getattr(self.request, "inquilino", None)
        if inquilino is not None:
            qs = qs.filter(inquilino=inquilino)
        return qs

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
            fatura = Fatura(
                inquilino=consulta.inquilino,
                origem=Fatura.Origem.CONSULTA,
                consulta=consulta,
                paciente=consulta.paciente,
            )
            fatura.full_clean()
            fatura.save()

        # Sincroniza itens: 1 item AJUSTE com descrição/preço da consulta.
        if fatura.estado != Fatura.Estado.RASCUNHO:
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


VIEWSET_MAP = {
    "consulta": ConsultaMedicaViewSet,
    "medicos": MedicosViewSet,
}

__all__ = [
    "ConsultaMedicaViewSet",
    "MedicosViewSet",
    "VIEWSET_MAP",
]

