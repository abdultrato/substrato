from django.http import HttpResponse
from drf_spectacular.utils import extend_schema
from rest_framework.decorators import action
from rest_framework.exceptions import PermissionDenied, ValidationError
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.viewsets import ModelViewSet

from api.v1.viewset_mixins import TenantScopedQuerysetMixin, ValidatedSearchOrderingMixin
from apps.clinical.models.lab_request import LabRequest
from apps.clinical.models.lab_request_item import LabRequestItem
from domain.clinical.result_state import ResultState

from ..filters import LabRequestFilter, LabRequestItemFilter
from ..serializers import (
    LaboratoryResultItemSerializer,
    LabRequestItemSerializer,
    LabRequestSerializer,
)


@extend_schema(
    description="Gerenciamento de requisições de análise",
    tags=["Clínico - Requisições"],
)
class LabRequestViewSet(ValidatedSearchOrderingMixin, TenantScopedQuerysetMixin, ModelViewSet):
    """Viewset for laboratory and medical requests."""

    queryset = LabRequest.objects.all()
    serializer_class = LabRequestSerializer
    filterset_class = LabRequestFilter
    permission_classes = [IsAuthenticated]
    # LabRequest does not expose `nome`/`descricao`/`ativo`/`ordem`/`observacoes`/`status`.
    # Keep search focused on request code, patient, and state.
    search_fields = [
        "id_custom",
        "paciente__id_custom",
        "paciente__nome",
        "paciente__numero_id",
        "analista__username",
        "tipo",
        "estado",
        "status_clinico",
        "empresa_solicitante__nome",
        "empresa_executora_externa__nome",
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
        "paciente",
        "analista",
        "tipo",
        "estado",
        "status_clinico",
        "possui_resultado_critico",
        "versao",
    ]
    ordering = ["-criado_em"]

    @action(detail=True, methods=["get"], url_path="pdf_resultados", url_name="pdf-resultados")
    def results_pdf(self, request, pk=None):
        """
        Generate the institutional PDF for validated laboratory results.

        Access is still restricted via RBAC to avoid accidental exposure.
        """
        from security.permissions.rbac import GROUPS as RBAC_GROUPS, _normalize

        user = getattr(request, "user", None)
        if not user or not getattr(user, "is_authenticated", False):
            raise PermissionDenied("Autenticação obrigatória.")

        if not getattr(user, "is_superuser", False):
            try:
                raw_groups = list(user.groups.values_list("name", flat=True))
            except Exception:
                raw_groups = []
            user_groups = {_normalize(g) for g in raw_groups if g}
            permitidos = {
                _normalize(RBAC_GROUPS["ADMIN"]),
                _normalize(RBAC_GROUPS["LABORATORIO"]),
            }
            if not (user_groups & permitidos):
                raise PermissionDenied("Requer Técnico de Laboratório ou Administrador para emitir PDF de resultados.")

        request_record = self.get_object()
        # Result PDFs only apply to the laboratory workflow.
        if request_record.tipo != request_record.Tipo.LABORATORIO:
            raise PermissionDenied("Esta requisição não possui PDF de resultados laboratoriais.")

        result = getattr(request_record, "resultado", None)
        if not result or not result.itens.filter(estado=ResultState.VALIDATED).exists():
            raise ValidationError("Não é possível emitir PDF sem nenhum resultado validado.")

        from tasks.generate_pdf.result_pdf_generator import generate_results_pdf

        pdf_bytes, filename = generate_results_pdf(request_record, apenas_validados=True)
        resp = HttpResponse(pdf_bytes, content_type="application/pdf")
        resp["Content-Disposition"] = f'inline; filename="{filename}"'
        return resp

    @action(detail=True, methods=["get"], url_path="resultado_itens", url_name="resultado-itens")
    def result_items(self, request, pk=None):
        """
        Return LAB result items with derived fields for inline entry/validation.
        """
        request_record = self.get_object()

        if request_record.tipo != request_record.Tipo.LABORATORIO:
            raise PermissionDenied("Esta requisição não possui resultados laboratoriais.")

        from apps.clinical.models.result import Result

        result, _ = Result.objects.get_or_create(
            requisicao=request_record,
            defaults={"inquilino": request_record.inquilino},
        )

        qs = result.itens.select_related(
            "exame_campo",
            "exame_campo__exame",
            "resultado",
            "resultado__requisicao",
            "resultado__requisicao__paciente",
        ).order_by(
            "exame_campo__exame__nome",
            "exame_campo__nome",
            "id",
        )

        items = LaboratoryResultItemSerializer(qs, many=True).data

        summary = {
            "total": qs.count(),
            "pendente": qs.filter(estado=ResultState.PENDING).count(),
            "em_analise": qs.filter(estado=ResultState.IN_ANALYSIS).count(),
            "aguardando_validacao": qs.filter(estado=ResultState.AWAITING_VALIDATION).count(),
            "validado": qs.filter(estado=ResultState.VALIDATED).count(),
            "rejeitado": qs.filter(estado=ResultState.REJECTED).count(),
        }

        return Response(
            {
                "requisicao": {
                    "id": request_record.id,
                    "id_custom": request_record.id_custom,
                    "paciente": request_record.paciente_id,
                    "paciente_nome": request_record.paciente.nome,
                    "estado": request_record.estado,
                    "status_clinico": request_record.status_clinico,
                    "possui_resultado_critico": request_record.possui_resultado_critico,
                },
                "resumo": summary,
                "itens": items,
            }
        )


@extend_schema(
    description="Gerenciamento de itens de requisição",
    tags=["Clínico - Requisições"],
)
class LabRequestItemViewSet(ValidatedSearchOrderingMixin, TenantScopedQuerysetMixin, ModelViewSet):
    """Viewset for request items."""

    queryset = LabRequestItem.objects.all()
    serializer_class = LabRequestItemSerializer
    filterset_class = LabRequestItemFilter
    permission_classes = [IsAuthenticated]
    # LabRequestItem does not expose `nome`/`descricao`/`ativo`/`ordem`.
    search_fields = [
        "id_custom",
        "requisicao__id_custom",
        "exame__id_custom",
        "exame__nome",
        "exame_medico__id_custom",
        "exame_medico__nome",
    ]
    ordering_fields = [
        "inquilino",
        "deletado",
        "deletado_em",
        "criado_por",
        "atualizado_por",
        "id_custom",
        "criado_em",
        "atualizado_em",
        "requisicao",
        "exame",
        "exame_medico",
        "versao",
    ]
    ordering = ["-criado_em"]


RequisicaoAnaliseViewSet = LabRequestViewSet
RequisicaoItemViewSet = LabRequestItemViewSet
