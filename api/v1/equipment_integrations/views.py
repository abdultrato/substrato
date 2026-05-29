from __future__ import annotations

from rest_framework import serializers, status
from rest_framework.permissions import BasePermission
from rest_framework.response import Response
from rest_framework.views import APIView

from api.v1.compat import LegacyAliasSerializerMixin
from apps.equipment_integrations.models import (
    IntegrationCredential,
    IntegrationEquipment,
    IntegrationOrder,
)
from apps.equipment_integrations.services import EquipmentIngestionError, ingest_equipment_payload
from drf_spectacular.utils import OpenApiParameter, OpenApiTypes, extend_schema


def _get_integration_key(request) -> str:
    return (
        request.headers.get("X-Integration-Key")
        or request.headers.get("x-integration-key")
        or request.META.get("HTTP_X_INTEGRATION_KEY")
        or ""
    ).strip()


class IntegrationKeyPermission(BasePermission):
    """
    Permissão para integrações de equipamentos baseada no cabeçalho X-Integration-Key.
    Armazena a credencial validada em request.integration_cred para reuso na view.
    """

    message = "Credencial de integração inválida ou revogada."

    def has_permission(self, request, view):
        raw_key = _get_integration_key(request)
        cred = IntegrationCredential.validate_key(raw_key)
        if cred is None or not cred.active or cred.revoked_at:
            return False
        request.integration_cred = cred
        return True


class IntegrationDetailSerializer(serializers.Serializer):
    detail = serializers.CharField()


class WorklistEquipmentSerializer(serializers.Serializer):
    id = serializers.IntegerField()
    code = serializers.CharField()
    name = serializers.CharField()
    modality = serializers.CharField(required=False, allow_blank=True, allow_null=True)
    protocol = serializers.CharField(required=False, allow_blank=True, allow_null=True)


class WorklistPatientSerializer(serializers.Serializer):
    id = serializers.IntegerField()
    code = serializers.CharField()
    name = serializers.CharField()
    birth_date = serializers.DateField(required=False, allow_null=True)
    gender = serializers.CharField(required=False, allow_blank=True, allow_null=True)
    document_number = serializers.CharField(required=False, allow_blank=True, allow_null=True)


class WorklistExamItemSerializer(serializers.Serializer):
    request_item_id = serializers.IntegerField()
    type = serializers.CharField()
    exam_id = serializers.IntegerField()
    exam_code = serializers.CharField(required=False, allow_blank=True, allow_null=True)
    exam_name = serializers.CharField(required=False, allow_blank=True, allow_null=True)
    sector = serializers.CharField(required=False, allow_blank=True, allow_null=True)


class WorklistOrderSerializer(LegacyAliasSerializerMixin, serializers.Serializer):
    accession = serializers.CharField()
    order_id = serializers.IntegerField()
    status = serializers.CharField()
    request_id = serializers.IntegerField()
    request_code = serializers.CharField()
    patient = WorklistPatientSerializer()
    items = WorklistExamItemSerializer(many=True)
    created_at = serializers.DateTimeField(required=False, allow_null=True)
    legacy_output_aliases = {
        "itens": "items",
    }


class WorklistResponseSerializer(serializers.Serializer):
    equipment = WorklistEquipmentSerializer()
    count = serializers.IntegerField()
    results = WorklistOrderSerializer(many=True)


class ResultsInboxResultSerializer(serializers.Serializer):
    code = serializers.CharField()
    value = serializers.JSONField(required=False, allow_null=True)


class ResultsInboxDocumentSerializer(serializers.Serializer):
    filename = serializers.CharField(required=False, allow_blank=True)
    content_type = serializers.CharField(required=False, allow_blank=True)
    base64 = serializers.CharField(required=False, allow_blank=True)
    request_item_id = serializers.IntegerField(required=False, allow_null=True)


class ResultsInboxRequestSerializer(LegacyAliasSerializerMixin, serializers.Serializer):
    message_id = serializers.CharField(required=False, allow_blank=True)
    accession = serializers.CharField()
    results = ResultsInboxResultSerializer(many=True, required=False)
    documents = ResultsInboxDocumentSerializer(many=True, required=False)
    legacy_input_aliases = {
        "documentos": "documents",
    }
    legacy_output_aliases = {
        "documentos": "documents",
    }


class ResultsInboxAppliedSerializer(serializers.Serializer):
    code = serializers.CharField()
    exam_field_id = serializers.IntegerField(required=False)
    exam_field = serializers.CharField(required=False)
    value = serializers.CharField(required=False)
    filename = serializers.CharField(required=False)
    content_type = serializers.CharField(required=False)


class ResultsInboxResponseSerializer(LegacyAliasSerializerMixin, serializers.Serializer):
    message = serializers.CharField(required=False)
    order = serializers.CharField(required=False)
    order_status = serializers.CharField(required=False)
    target = serializers.CharField(required=False)
    detail = serializers.CharField(required=False)
    applied = ResultsInboxAppliedSerializer(many=True)
    errors = serializers.ListField(child=serializers.CharField())
    legacy_output_aliases = {
        "aplicados": "applied",
        "erros": "errors",
    }


class EquipmentWorklistView(APIView):
    """
    Worklist para equipamentos (HTTP JSON).

    Autenticação: header `X-Integration-Key`.
    """

    permission_classes = [IntegrationKeyPermission]
    authentication_classes: list = []

    @extend_schema(
        parameters=[
            OpenApiParameter(
                "X-Integration-Key",
                OpenApiTypes.STR,
                OpenApiParameter.HEADER,
                description="Chave de integração",
                required=True,
            ),
            OpenApiParameter("limit", OpenApiTypes.INT, OpenApiParameter.QUERY, description="Limite (1-200)"),
            OpenApiParameter(
                "status",
                OpenApiTypes.STR,
                OpenApiParameter.QUERY,
                description="Filtrar por status (pode repetir ?status=...)",
                many=True,
                required=False,
            ),
        ],
        responses={
            200: WorklistResponseSerializer,
            401: IntegrationDetailSerializer,
            403: IntegrationDetailSerializer,
            404: IntegrationDetailSerializer,
        },
    )
    def get(self, request, equipment_custom_id: str):
        cred = getattr(request, "integration_cred", None)
        if cred is None:
            return Response({"detail": "Credencial de integração inválida."}, status=status.HTTP_401_UNAUTHORIZED)

        if not cred.has_scope(IntegrationCredential.Scope.WORKLIST_READ):
            return Response(
                {"detail": "Sem permissão para ler worklist."},
                status=status.HTTP_403_FORBIDDEN,
            )

        equipment = (
            IntegrationEquipment.objects.filter(
                custom_id=equipment_custom_id,
                deleted=False,
            )
            .select_related("tenant")
            .first()
        )

        if equipment is None:
            return Response(
                {"detail": "Equipamento não encontrado."},
                status=status.HTTP_404_NOT_FOUND,
            )

        if cred.equipment_id != equipment.id:
            return Response(
                {"detail": "Credencial não corresponde ao equipment."},
                status=status.HTTP_403_FORBIDDEN,
            )

        limit = int(request.query_params.get("limit") or 50)
        limit = max(1, min(limit, 200))

        estados = request.query_params.getlist("status")
        if not estados:
            estados = [IntegrationOrder.Status.PENDING, IntegrationOrder.Status.IN_PROGRESS]

        ordens = (
            IntegrationOrder.objects.filter(
                equipment=equipment,
                status__in=estados,
                deleted=False,
            )
            .select_related("request__patient")
            .prefetch_related(
                "items__request_item__exam",
                "items__request_item__medical_exam",
            )
            .order_by("created_at")[:limit]
        )

        out = []
        for order in ordens:
            req = order.request
            pac = req.patient

            items = []
            for oi in order.items.all():
                ri = oi.request_item
                if ri.exam_id:
                    items.append(
                        {
                            "request_item_id": ri.id,
                            "type": "LAB",
                            "exam_id": ri.exam_id,
                            "exam_code": getattr(ri.exam, "custom_id", None),
                            "exam_name": getattr(ri.exam, "name", None),
                            "sector": getattr(ri.exam, "sector", None),
                        }
                    )
                elif ri.medical_exam_id:
                    items.append(
                        {
                            "request_item_id": ri.id,
                            "type": "MED",
                            "exam_id": ri.medical_exam_id,
                            "exam_code": getattr(ri.medical_exam, "custom_id", None),
                            "exam_name": getattr(ri.medical_exam, "name", None),
                            "sector": getattr(ri.medical_exam, "sector", None),
                        }
                    )

            out.append(
                {
                    "accession": order.custom_id,
                    "order_id": order.id,
                    "status": order.status,
                    "request_id": req.id,
                    "request_code": req.custom_id,
                    "patient": {
                        "id": pac.id,
                        "code": pac.custom_id,
                        "name": pac.name,
                        "birth_date": pac.birth_date.isoformat() if pac.birth_date else None,
                        "gender": pac.gender,
                        "document_number": pac.document_number,
                    },
                    "items": items,
                    "created_at": order.created_at.isoformat() if order.created_at else None,
                }
            )

        payload = {
            "equipment": {
                "id": equipment.id,
                "code": equipment.custom_id,
                "name": equipment.name,
                "modality": equipment.modality,
                "protocol": equipment.protocol,
            },
            "count": len(out),
            "results": out,
        }
        return Response(WorklistResponseSerializer(instance=payload).data)


class EquipmentResultsInboxView(APIView):
    """
    Inbox de resultados para equipamentos (HTTP JSON).

    Autenticação: header `X-Integration-Key`.

    Payload (exemplo):
    {
      "message_id": "uuid-externo-opcional",
      "accession": "ORD-....",
      "results": [{"code": "HB", "value": "13.2"}, ...],
      "documents": [{"filename":"ecg.pdf","content_type":"application/pdf","base64":"...","request_item_id": 123}]
    }
    """

    permission_classes = [IntegrationKeyPermission]
    authentication_classes: list = []

    @extend_schema(
        parameters=[
            OpenApiParameter(
                "X-Integration-Key",
                OpenApiTypes.STR,
                OpenApiParameter.HEADER,
                description="Chave de integração",
                required=True,
            ),
        ],
        request=ResultsInboxRequestSerializer,
        responses={
            200: ResultsInboxResponseSerializer,
            400: ResultsInboxResponseSerializer,
            401: IntegrationDetailSerializer,
            403: IntegrationDetailSerializer,
            404: IntegrationDetailSerializer,
        },
    )
    def post(self, request, equipment_custom_id: str):
        cred = getattr(request, "integration_cred", None)
        if cred is None:
            return Response({"detail": "Credencial de integração inválida."}, status=status.HTTP_401_UNAUTHORIZED)

        if not cred.has_scope(IntegrationCredential.Scope.RESULT_WRITE):
            return Response(
                {"detail": "Sem permissão para enviar resultados."},
                status=status.HTTP_403_FORBIDDEN,
            )

        equipment = (
            IntegrationEquipment.objects.filter(
                custom_id=equipment_custom_id,
                deleted=False,
            )
            .select_related("tenant")
            .first()
        )
        if equipment is None:
            return Response(
                {"detail": "Equipamento não encontrado."},
                status=status.HTTP_404_NOT_FOUND,
            )

        if cred.equipment_id != equipment.id:
            return Response(
                {"detail": "Credencial não corresponde ao equipment."},
                status=status.HTTP_403_FORBIDDEN,
            )

        raw_body = request.body or b""
        payload = dict(request.data) if isinstance(request.data, dict) else {}
        accession = str(
            payload.get("accession")
            or payload.get("accession_number")
            or payload.get("order_number")
            or payload.get("external_order_id")
            or ""
        ).strip()
        content_type = request.content_type or "application/json"

        if not accession:
            return Response(
                {"detail": "Campo 'accession' é obrigatório."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            response_payload = ingest_equipment_payload(
                equipment=equipment,
                payload=payload,
                raw_body=raw_body,
                content_type=content_type,
            )
        except EquipmentIngestionError as exc:
            return Response(
                {
                    "detail": exc.detail,
                    "order": accession,
                    "applied": [],
                    "errors": [exc.detail],
                },
                status=exc.status_code,
            )
        errors = response_payload.get("errors") or []
        return Response(
            ResultsInboxResponseSerializer(instance=response_payload).data,
            status=status.HTTP_200_OK if not errors else status.HTTP_400_BAD_REQUEST,
        )


EquipamentoWorklistView = EquipmentWorklistView
EquipamentoResultadosInboxView = EquipmentResultsInboxView
