from decimal import Decimal, InvalidOperation

from django.db import transaction
from rest_framework.decorators import action
from rest_framework.exceptions import PermissionDenied, ValidationError
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.viewsets import ModelViewSet

from api.v1.viewset_mixins import TenantScopedQuerysetMixin, ValidatedSearchOrderingMixin
from apps.clinical.models.result_item import ResultItem
from domain.clinical.result_state import ResultState
from drf_spectacular.utils import extend_schema

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
    # ResultItem does not expose `name`/`description`/`active`/`order`.
    search_fields = [
        "custom_id",
        "result__request__custom_id",
        "result__request__patient__name",
        "result__request__patient__document_number",
        "exam_field__custom_id",
        "exam_field__name",
        "exam_field__exam__name",
        "status",
        "clinical_status",
        "report_color",
    ]
    ordering_fields = [
        "tenant",
        "custom_id",
        "deleted",
        "deleted_at",
        "created_at",
        "updated_at",
        "created_by",
        "updated_by",
        "result",
        "exam_field",
        "clinical_status",
        "report_color",
        "critical_alert",
        "result_value",
        "validated_by",
        "validation_date",
        "status",
        "version",
    ]
    ordering = ["-created_at"]

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
        if item.status == ResultState.IN_ANALYSIS:
            return Response(LaboratoryResultItemSerializer(item).data)

        try:
            item.transition(ResultState.IN_ANALYSIS, user=getattr(request, "user", None))
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

        payload = request.data or {}
        raw = None
        for field_name in ("result_value", "resultado_valor", "value", "valor"):
            if payload.get(field_name, None) is not None:
                raw = payload.get(field_name)
                break

        if raw is None or (isinstance(raw, str) and not raw.strip()):
            raise ValidationError({"result_value": "Informe um valor antes de gravar."})

        try:
            value = Decimal(str(raw).replace(",", "."))
        except (InvalidOperation, TypeError, ValueError) as err:
            raise ValidationError({"result_value": "Valor inválido."}) from err

        from domain.clinical.result_state_machine import InvalidTransitionError, ResultStateMachine

        with transaction.atomic():
            locked = (
                ResultItem.all_objects.select_for_update()
                .select_related(
                    "result",
                    "result__request",
                    "result__request__patient",
                    "exam_field",
                    "exam_field__exam",
                )
                .get(pk=item.pk)
            )

            try:
                ResultStateMachine.validate_transition(
                    locked.status,
                    ResultState.AWAITING_VALIDATION,
                )
            except InvalidTransitionError as err:
                raise ValidationError(str(err)) from err

            locked.result_value = value
            locked.status = ResultState.AWAITING_VALIDATION
            locked.save()

        locked.refresh_from_db()
        return Response(LaboratoryResultItemSerializer(locked).data)

    @action(detail=True, methods=["post"], url_path="validar", url_name="validar")
    def validate_result(self, request, pk=None):
        """Move the result item to VALIDADO."""
        item = self.get_object()
        if item.status == ResultState.VALIDATED:
            return Response(LaboratoryResultItemSerializer(item).data)

        try:
            item.transition(ResultState.VALIDATED, user=getattr(request, "user", None))
        except Exception as err:
            raise ValidationError(str(err)) from err

        item.refresh_from_db()
        return Response(LaboratoryResultItemSerializer(item).data)

