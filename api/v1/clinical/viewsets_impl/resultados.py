from decimal import Decimal, InvalidOperation

from django.db import transaction
from drf_spectacular.utils import extend_schema
from rest_framework.decorators import action
from rest_framework.exceptions import PermissionDenied, ValidationError
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.viewsets import ModelViewSet

from api.v1.viewset_mixins import TenantScopedQuerysetMixin, ValidatedSearchOrderingMixin
from apps.clinical.models.result_item import ResultItem
from domain.clinical.estado_resultado import EstadoResultado

from ..filters import ResultadoItemFilter
from ..serializers import ResultadoItemLaboratorioSerializer, ResultadoItemSerializer


@extend_schema(
    description="Gerenciamento de resultados de análises",
    tags=["Clínico - Resultados"],
)
class ResultadoItemViewSet(ValidatedSearchOrderingMixin, TenantScopedQuerysetMixin, ModelViewSet):
    """ViewSet para gerenciar resultados de análises laboratoriais."""

    queryset = ResultItem.objects.all()
    serializer_class = ResultadoItemSerializer
    filterset_class = ResultadoItemFilter
    permission_classes = [IsAuthenticated]
    # ResultadoItem (NoNameCoreModel) nao possui `nome`/`descricao`/`ativo`/`ordem`.
    search_fields = [
        "id_custom",
        "resultado__requisicao__id_custom",
        "resultado__requisicao__paciente__nome",
        "resultado__requisicao__paciente__numero_id",
        "exame_campo__id_custom",
        "exame_campo__nome",
        "exame_campo__exame__nome",
        "estado",
        "status_clinico",
        "cor_laudo",
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
        "resultado",
        "exame_campo",
        "status_clinico",
        "cor_laudo",
        "alerta_critico",
        "resultado_valor",
        "validado_por",
        "data_validacao",
        "estado",
        "versao",
    ]
    ordering = ["-criado_em"]

    def _is_admin_user(self, user) -> bool:
        if not user or not getattr(user, "is_authenticated", False):
            return False
        if getattr(user, "is_superuser", False):
            return True
        try:
            from security.permissions.rbac import GROUPS as RBAC_GROUPS, _normalize

            raw_groups = list(user.groups.values_list("name", flat=True))
            user_groups = {_normalize(g) for g in raw_groups if g}
            return _normalize(RBAC_GROUPS["ADMIN"]) in user_groups
        except Exception:
            return False

    # -----------------------------------------------------------------
    # Restrição: alterações diretas no ResultadoItem (PUT/PATCH) podem
    # burlar a máquina de estados. Para perfis não-admin, obrigamos o uso
    # das ações `lancar`, `gravar` e `validar`.
    # -----------------------------------------------------------------

    def update(self, request, *args, **kwargs):
        if not self._is_admin_user(getattr(request, "user", None)):
            raise PermissionDenied("Use as ações: lancar, gravar e validar.")
        return super().update(request, *args, **kwargs)

    def partial_update(self, request, *args, **kwargs):
        if not self._is_admin_user(getattr(request, "user", None)):
            raise PermissionDenied("Use as ações: lancar, gravar e validar.")
        return super().partial_update(request, *args, **kwargs)

    @action(detail=True, methods=["post"])
    def lancar(self, request, pk=None):
        """Transiciona o item de resultado para EM_ANALISE (passo 1: lançar)."""
        item = self.get_object()
        if item.estado == EstadoResultado.EM_ANALISE:
            return Response(ResultadoItemLaboratorioSerializer(item).data)

        try:
            item.transicionar(EstadoResultado.EM_ANALISE, usuario=getattr(request, "user", None))
        except Exception as err:
            raise ValidationError(str(err)) from err

        item.refresh_from_db()
        return Response(ResultadoItemLaboratorioSerializer(item).data)

    @action(detail=True, methods=["post"])
    def gravar(self, request, pk=None):
        """
        Salva o valor do resultado e transiciona para AGUARDANDO_VALIDACAO
        (passo 2: gravar).
        """
        item = self.get_object()

        raw = (request.data or {}).get("resultado_valor", None)
        if raw is None:
            raw = (request.data or {}).get("valor", None)

        if raw is None or (isinstance(raw, str) and not raw.strip()):
            raise ValidationError({"resultado_valor": "Informe um valor antes de gravar."})

        try:
            valor = Decimal(str(raw).replace(",", "."))
        except (InvalidOperation, TypeError, ValueError) as err:
            raise ValidationError({"resultado_valor": "Valor inválido."}) from err

        from domain.clinical.state_machine_resultado import ResultadoStateMachine, TransicaoInvalidaError

        with transaction.atomic():
            locked = (
                ResultItem.all_objects.select_for_update()
                .select_related(
                    "resultado",
                    "resultado__requisicao",
                    "resultado__requisicao__paciente",
                    "exame_campo",
                    "exame_campo__exame",
                )
                .get(pk=item.pk)
            )

            try:
                ResultadoStateMachine.validar_transicao(
                    locked.estado,
                    EstadoResultado.AGUARDANDO_VALIDACAO,
                )
            except TransicaoInvalidaError as err:
                raise ValidationError(str(err)) from err

            locked.resultado_valor = valor
            locked.estado = EstadoResultado.AGUARDANDO_VALIDACAO
            locked.save()

        locked.refresh_from_db()
        return Response(ResultadoItemLaboratorioSerializer(locked).data)

    @action(detail=True, methods=["post"])
    def validar(self, request, pk=None):
        """Transiciona o item de resultado para VALIDADO (passo 3: validar)."""
        item = self.get_object()
        if item.estado == EstadoResultado.VALIDADO:
            return Response(ResultadoItemLaboratorioSerializer(item).data)

        try:
            item.transicionar(EstadoResultado.VALIDADO, usuario=getattr(request, "user", None))
        except Exception as err:
            raise ValidationError(str(err)) from err

        item.refresh_from_db()
        return Response(ResultadoItemLaboratorioSerializer(item).data)
