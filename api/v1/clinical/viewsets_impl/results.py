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

from ..filters import ResultItemFilter
from ..serializers import LaboratoryResultItemSerializer, ResultItemSerializer


@extend_schema(
    description="Gerenciamento de resultados de análises",
    tags=["Clínico - Resultados"],
)
class ResultItemViewSet(ValidatedSearchOrderingMixin, TenantScopedQuerysetMixin, ModelViewSet):
    """Viewset for laboratory result items."""

    queryset = ResultItem.objects.all()
    serializer_class = ResultItemSerializer
    filterset_class = ResultItemFilter
    permission_classes = [IsAuthenticated]
    # ResultItem does not expose `nome`/`descricao`/`ativo`/`ordem`.
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

    # Direct PUT/PATCH can bypass the state machine.
    # Non-admin users must go through the dedicated actions below.

    def update(self, request, *args, **kwargs):
        if not self._is_admin_user(getattr(request, "user", None)):
            raise PermissionDenied("Use as ações: lancar, gravar e validar.")
        return super().update(request, *args, **kwargs)

    def partial_update(self, request, *args, **kwargs):
        if not self._is_admin_user(getattr(request, "user", None)):
            raise PermissionDenied("Use as ações: lancar, gravar e validar.")
        return super().partial_update(request, *args, **kwargs)

    @action(detail=True, methods=["post"], url_path="lancar", url_name="lancar")
    def start_analysis(self, request, pk=None):
        """Move the result item to EM_ANALISE."""
        item = self.get_object()
        if item.estado == EstadoResultado.EM_ANALISE:
            return Response(LaboratoryResultItemSerializer(item).data)

        try:
            item.transicionar(EstadoResultado.EM_ANALISE, usuario=getattr(request, "user", None))
        except Exception as err:
            raise ValidationError(str(err)) from err

        item.refresh_from_db()
        return Response(LaboratoryResultItemSerializer(item).data)

    @action(detail=True, methods=["post"], url_path="gravar", url_name="gravar")
    def save_result(self, request, pk=None):
        """
        Save the result value and move to AGUARDANDO_VALIDACAO.
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
        return Response(LaboratoryResultItemSerializer(locked).data)

    @action(detail=True, methods=["post"], url_path="validar", url_name="validar")
    def validate_result(self, request, pk=None):
        """Move the result item to VALIDADO."""
        item = self.get_object()
        if item.estado == EstadoResultado.VALIDADO:
            return Response(LaboratoryResultItemSerializer(item).data)

        try:
            item.transicionar(EstadoResultado.VALIDADO, usuario=getattr(request, "user", None))
        except Exception as err:
            raise ValidationError(str(err)) from err

        item.refresh_from_db()
        return Response(LaboratoryResultItemSerializer(item).data)


ResultadoItemViewSet = ResultItemViewSet
