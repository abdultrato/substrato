from django.core.exceptions import ValidationError as DjangoValidationError
from rest_framework.decorators import action
from rest_framework.exceptions import PermissionDenied, ValidationError
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.viewsets import ModelViewSet

from api.v1.clinical.lab_permissions import ensure_laboratory_result_privilege
from api.v1.viewset_mixins import TenantScopedQuerysetMixin, ValidatedSearchOrderingMixin
from application.clinical.commands import (
    DisregardResultCommand,
    SaveResultValueCommand,
    StartResultAnalysisCommand,
    ValidateResultCommand,
)
from application.clinical.handlers import (
    handle_disregard_result,
    handle_save_result_value,
    handle_start_result_analysis,
    handle_validate_result,
)
from apps.clinical.models.result_item import ResultItem
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
    # ResultItem expõe `position` para ordenar os campos no laudo.
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
        "position",
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
    ordering = ["result", "position", "id"]

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
            raise PermissionDenied("Use the actions: start-analysis, save-result and validate-result.")
        return super().update(request, *args, **kwargs)

    def partial_update(self, request, *args, **kwargs):
        if not self._is_admin_user(getattr(request, "user", None)):
            raise PermissionDenied("Use the actions: start-analysis, save-result and validate-result.")
        return super().partial_update(request, *args, **kwargs)

    def _execute_command(self, handler, command):
        try:
            return handler(command)
        except DjangoValidationError as err:
            if hasattr(err, "message_dict"):
                raise ValidationError(err.message_dict) from err
            if hasattr(err, "messages"):
                raise ValidationError(err.messages) from err
            raise ValidationError(str(err)) from err
        except Exception as err:
            raise ValidationError(str(err)) from err

    @action(detail=True, methods=["post"], url_path="start-analysis", url_name="start-analysis")
    def start_analysis(self, request, pk=None):
        """Move the result item to EM_ANALISE."""
        ensure_laboratory_result_privilege(getattr(request, "user", None))
        updated = self._execute_command(
            handle_start_result_analysis,
            StartResultAnalysisCommand(
                result_item=self.get_object(),
                user=getattr(request, "user", None),
                idempotent=True,
            ),
        )
        return Response(LaboratoryResultItemSerializer(updated).data)

    @action(detail=True, methods=["post"], url_path="save-result", url_name="save-result")
    def save_result(self, request, pk=None):
        """
        Save the result value and move to AGUARDANDO_VALIDACAO.
        """
        ensure_laboratory_result_privilege(getattr(request, "user", None))
        payload = request.data or {}
        raw = payload.get("result_value")

        updated = self._execute_command(
            handle_save_result_value,
            SaveResultValueCommand(
                result_item=self.get_object(),
                raw_value=raw,
                idempotent=True,
            ),
        )
        return Response(LaboratoryResultItemSerializer(updated).data)

    @action(detail=True, methods=["post"], url_path="validate-result", url_name="validate-result")
    def validate_result(self, request, pk=None):
        """Move the result item to VALIDADO."""
        ensure_laboratory_result_privilege(getattr(request, "user", None))
        updated = self._execute_command(
            handle_validate_result,
            ValidateResultCommand(
                result_item=self.get_object(),
                user=getattr(request, "user", None),
                idempotent=True,
            ),
        )
        return Response(LaboratoryResultItemSerializer(updated).data)

    @action(detail=True, methods=["post"], url_path="disregard-result", url_name="disregard-result")
    def disregard_result(self, request, pk=None):
        """Mark an empty result item as disregarded with a required reason."""
        ensure_laboratory_result_privilege(getattr(request, "user", None))
        payload = request.data or {}
        updated = self._execute_command(
            handle_disregard_result,
            DisregardResultCommand(
                result_item=self.get_object(),
                reason=payload.get("reason") or "",
                user=getattr(request, "user", None),
                idempotent=True,
            ),
        )
        return Response(LaboratoryResultItemSerializer(updated).data)

