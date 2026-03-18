from django.http import HttpResponse
from drf_spectacular.utils import extend_schema
from rest_framework.decorators import action
from rest_framework.exceptions import PermissionDenied, ValidationError
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.viewsets import ModelViewSet

from api.v1.viewset_mixins import TenantScopedQuerysetMixin, ValidatedSearchOrderingMixin
from aplicativos.clinico.modelos.requisicao_analise import RequisicaoAnalise
from aplicativos.clinico.modelos.requisicao_item import RequisicaoItem
from dominio.clinico.estado_resultado import EstadoResultado

from ..filters import RequisicaoAnaliseFilter, RequisicaoItemFilter
from ..serializers import (
    RequisicaoAnaliseSerializer,
    RequisicaoItemSerializer,
    ResultadoItemLaboratorioSerializer,
)


@extend_schema(
    description="Gerenciamento de requisições de análise",
    tags=["Clínico - Requisições"],
)
class RequisicaoAnaliseViewSet(ValidatedSearchOrderingMixin, TenantScopedQuerysetMixin, ModelViewSet):
    """ViewSet para gerenciar requisições de análise laboratorial."""

    queryset = RequisicaoAnalise.objects.all()
    serializer_class = RequisicaoAnaliseSerializer
    filterset_class = RequisicaoAnaliseFilter
    permission_classes = [IsAuthenticated]
    # RequisicaoAnalise (NoNameCoreModel) nao possui `nome`/`descricao`/`ativo`/`ordem`/`observacoes`/`status`.
    # A busca mais util e por codigo da requisicao, paciente e estado.
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

    @action(detail=True, methods=["get"])
    def pdf_resultados(self, request, pk=None):
        """
        Gera o PDF institucional de resultados laboratoriais (validados).

        - Autenticação via JWT (API v1)
        - RBAC controla acesso; reforçamos aqui para evitar exposição acidental
          do PDF a perfis de consulta de requisições.
        """
        from seguranca.permissoes.rbac import GROUPS as RBAC_GROUPS, _normalize

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

        requisicao = self.get_object()
        # PDF de resultados aplica-se ao fluxo laboratorial.
        if requisicao.tipo != requisicao.Tipo.LABORATORIO:
            raise PermissionDenied("Esta requisição não possui PDF de resultados laboratoriais.")

        # Não gerar PDF se nenhum resultado estiver validado.
        resultado = getattr(requisicao, "resultado", None)
        if not resultado or not resultado.itens.filter(estado=EstadoResultado.VALIDADO).exists():
            raise ValidationError("Não é possível emitir PDF sem nenhum resultado validado.")

        from tarefas.gerar_pdf.pdf_generator_resultado import gerar_pdf_resultados

        pdf_bytes, filename = gerar_pdf_resultados(requisicao, apenas_validados=True)
        resp = HttpResponse(pdf_bytes, content_type="application/pdf")
        resp["Content-Disposition"] = f'inline; filename="{filename}"'
        return resp

    @action(detail=True, methods=["get"])
    def resultado_itens(self, request, pk=None):
        """
        Retorna os itens de resultados de uma requisição LAB com campos derivados
        para suportar o lançamento/validação inline no frontend.
        """
        requisicao = self.get_object()

        if requisicao.tipo != requisicao.Tipo.LABORATORIO:
            raise PermissionDenied("Esta requisição não possui resultados laboratoriais.")

        from aplicativos.clinico.modelos.resultado import Resultado

        resultado, _ = Resultado.objects.get_or_create(
            requisicao=requisicao,
            defaults={"inquilino": requisicao.inquilino},
        )

        qs = resultado.itens.select_related(
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

        itens = ResultadoItemLaboratorioSerializer(qs, many=True).data

        resumo = {
            "total": qs.count(),
            "pendente": qs.filter(estado=EstadoResultado.PENDENTE).count(),
            "em_analise": qs.filter(estado=EstadoResultado.EM_ANALISE).count(),
            "aguardando_validacao": qs.filter(estado=EstadoResultado.AGUARDANDO_VALIDACAO).count(),
            "validado": qs.filter(estado=EstadoResultado.VALIDADO).count(),
            "rejeitado": qs.filter(estado=EstadoResultado.REJEITADO).count(),
        }

        return Response(
            {
                "requisicao": {
                    "id": requisicao.id,
                    "id_custom": requisicao.id_custom,
                    "paciente": requisicao.paciente_id,
                    "paciente_nome": requisicao.paciente.nome,
                    "estado": requisicao.estado,
                    "status_clinico": requisicao.status_clinico,
                    "possui_resultado_critico": requisicao.possui_resultado_critico,
                },
                "resumo": resumo,
                "itens": itens,
            }
        )


@extend_schema(
    description="Gerenciamento de itens de requisição",
    tags=["Clínico - Requisições"],
)
class RequisicaoItemViewSet(ValidatedSearchOrderingMixin, TenantScopedQuerysetMixin, ModelViewSet):
    """ViewSet para gerenciar itens (exames) de uma requisição."""

    queryset = RequisicaoItem.objects.all()
    serializer_class = RequisicaoItemSerializer
    filterset_class = RequisicaoItemFilter
    permission_classes = [IsAuthenticated]
    # RequisicaoItem (NoNameCoreModel) nao possui `nome`/`descricao`/`ativo`/`ordem`.
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
