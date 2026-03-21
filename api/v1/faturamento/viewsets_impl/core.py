from django.http import HttpResponse
from rest_framework.decorators import action
from rest_framework.exceptions import ValidationError
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.viewsets import ModelViewSet

from api.v1.viewset_mixins import TenantScopedQuerysetMixin, ValidatedSearchOrderingMixin
from aplicativos.faturamento.modelos.fatura import Fatura
from aplicativos.faturamento.modelos.fatura_itens import FaturaItem
from aplicativos.faturamento.modelos.historico_fatura import HistoricoFatura
from tarefas.gerar_pdf.pdf_generator_fatura import gerar_pdf_fatura

from ..filters import FaturaFilter, FaturaItemFilter, HistoricoFaturaFilter
from ..serializers import FaturaItemSerializer, FaturaSerializer, HistoricoFaturaSerializer
from aplicativos.pagamentos.modelos.pagamentos import Pagamento


class FaturaViewSet(ValidatedSearchOrderingMixin, TenantScopedQuerysetMixin, ModelViewSet):
    queryset = Fatura.objects.all()
    serializer_class = FaturaSerializer
    filterset_class = FaturaFilter
    permission_classes = [IsAuthenticated]
    search_fields = [
        "id_custom",
        "paciente__id_custom",
        "paciente__nome",
        "requisicao__id_custom",
        "consulta__id_custom",
        "venda__numero",
        "estado",
        "origem",
    ]
    ordering_fields = [
        "inquilino",
        "id_custom",
        "deletado",
        "deletado_em",
        "criado_em",
        "atualizado_em",
        "criado_por",
        "atualizado_por",
        "requisicao",
        "paciente",
        "consulta",
        "venda",
        "origem",
        "subtotal",
        "iva_valor",
        "total",
        "valor_seguro",
        "valor_paciente",
        "estado",
        "versao",
    ]
    ordering = ["-criado_em"]

    @action(detail=True, methods=["post"])
    def emitir(self, request, pk=None):
        fatura = self.get_object()
        fatura.emitir()
        return Response(self.get_serializer(fatura).data)

    @action(detail=True, methods=["post"])
    def anular(self, request, pk=None):
        fatura = self.get_object()
        if fatura.estado != Fatura.Estado.CANCELADA:
            fatura.estado = Fatura.Estado.CANCELADA
            fatura.save(update_fields=["estado"])
            try:
                linhas = [
                    f"Origem: {fatura.get_origem_display()}",
                    f"Paciente: {getattr(fatura.paciente, 'nome', '-')}",
                    f"Total com IVA: {getattr(fatura, 'total', 0):.2f}",
                ]
                fatura.registrar_historico("CANCELAMENTO", "Fatura cancelada", linhas=linhas)
            except Exception:
                pass
        return Response(self.get_serializer(fatura).data)

    @action(detail=True, methods=["post"])
    def confirmar_pagamento(self, request, pk=None):
        fatura = self.get_object()
        pagamento = (
            fatura.pagamentos.filter(status=Pagamento.Status.PENDENTE, deletado=False)
            .order_by("-criado_em")
            .first()
        )
        if not pagamento:
            raise ValidationError("Nenhum pagamento pendente para confirmar.")

        try:
            pagamento.confirmar()
        except ValidationError as exc:
            raise ValidationError(str(exc)) from exc

        fatura.refresh_from_db()
        return Response(self.get_serializer(fatura).data)

    @action(detail=True, methods=["get"])
    def pdf(self, request, pk=None):
        fatura = self.get_object()
        pdf_bytes, filename = gerar_pdf_fatura(fatura, request=request)
        resp = HttpResponse(pdf_bytes, content_type="application/pdf")
        resp["Content-Disposition"] = f'inline; filename="{filename}"'
        return resp


class FaturaItemViewSet(ValidatedSearchOrderingMixin, TenantScopedQuerysetMixin, ModelViewSet):
    queryset = FaturaItem.objects.all()
    serializer_class = FaturaItemSerializer
    filterset_class = FaturaItemFilter
    permission_classes = [IsAuthenticated]
    search_fields = [
        "id_custom",
        "descricao",
        "fatura__id_custom",
        "exame__nome",
        "exame_medico__nome",
        "item_venda__nome",
        "tipo_item",
    ]
    ordering_fields = [
        "inquilino",
        "id_custom",
        "deletado",
        "deletado_em",
        "criado_em",
        "atualizado_em",
        "criado_por",
        "atualizado_por",
        "fatura",
        "exame",
        "exame_medico",
        "item_venda",
        "procedimento_item",
        "procedimento_material",
        "descricao",
        "quantidade",
        "preco_unitario",
        "iva_percentual",
        "tipo_item",
        "versao",
    ]
    ordering = ["-criado_em"]


class HistoricoFaturaViewSet(ValidatedSearchOrderingMixin, TenantScopedQuerysetMixin, ModelViewSet):
    queryset = HistoricoFatura.objects.all()
    serializer_class = HistoricoFaturaSerializer
    filterset_class = HistoricoFaturaFilter
    permission_classes = [IsAuthenticated]
    search_fields = ["descricao", "tipo_evento"]
    ordering_fields = ["fatura", "descricao", "tipo_evento", "criado_em"]
    ordering = ["-criado_em"]


VIEWSET_MAP = {
    "fatura": FaturaViewSet,
    "faturaitem": FaturaItemViewSet,
    "historicofatura": HistoricoFaturaViewSet,
}

__all__ = [
    "VIEWSET_MAP",
    "FaturaItemViewSet",
    "FaturaViewSet",
    "HistoricoFaturaViewSet",
]
