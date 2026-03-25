from __future__ import annotations

import base64
import binascii
from contextlib import suppress
from decimal import Decimal, InvalidOperation
import hashlib

from django.core.exceptions import ValidationError
from django.db import transaction
from django.utils import timezone
from drf_spectacular.utils import OpenApiParameter, OpenApiTypes, extend_schema
from rest_framework import serializers, status
from rest_framework.permissions import BasePermission
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.clinical.models.result import Result
from apps.clinical.models.result_item import ResultItem
from apps.equipment_integrations.models import (
    IntegrationAnalyteMapping,
    IntegrationCredential,
    IntegrationDocument,
    IntegrationEquipment,
    IntegrationMessage,
    IntegrationOrder,
    IntegrationOrderItem,
)


def _sha256_bytes(data: bytes) -> str:
    return hashlib.sha256(data or b"").hexdigest()


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


class WorklistOrderSerializer(serializers.Serializer):
    accession = serializers.CharField()
    order_id = serializers.IntegerField()
    status = serializers.CharField()
    request_id = serializers.IntegerField()
    request_code = serializers.CharField()
    patient = WorklistPatientSerializer()
    itens = WorklistExamItemSerializer(many=True)
    created_at = serializers.DateTimeField(required=False, allow_null=True)


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


class ResultsInboxRequestSerializer(serializers.Serializer):
    message_id = serializers.CharField(required=False, allow_blank=True)
    accession = serializers.CharField()
    results = ResultsInboxResultSerializer(many=True, required=False)
    documentos = ResultsInboxDocumentSerializer(many=True, required=False)


class ResultsInboxAppliedSerializer(serializers.Serializer):
    code = serializers.CharField()
    exam_field_id = serializers.IntegerField()
    exam_field = serializers.CharField()
    value = serializers.CharField()


class ResultsInboxResponseSerializer(serializers.Serializer):
    message = serializers.CharField()
    order = serializers.CharField()
    order_status = serializers.CharField()
    aplicados = ResultsInboxAppliedSerializer(many=True)
    erros = serializers.ListField(child=serializers.CharField())


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
            estados = [IntegrationOrder.Estado.PENDENTE, IntegrationOrder.Estado.EM_EXECUCAO]

        ordens = (
            IntegrationOrder.objects.filter(
                equipment=equipment,
                status__in=estados,
                deleted=False,
            )
            .select_related("request__patient")
            .prefetch_related(
                "itens__request_item__exam",
                "itens__request_item__medical_exam",
            )
            .order_by("created_at")[:limit]
        )

        out = []
        for order in ordens:
            req = order.request
            pac = req.patient

            itens = []
            for oi in order.itens.all():
                ri = oi.request_item
                if ri.exam_id:
                    itens.append(
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
                    itens.append(
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
                    "itens": itens,
                    "created_at": order.created_at.isoformat() if order.created_at else None,
                }
            )

        return Response(
            {
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
        )


class EquipmentResultsInboxView(APIView):
    """
    Inbox de resultados para equipamentos (HTTP JSON).

    Autenticação: header `X-Integration-Key`.

    Payload (exemplo):
    {
      "message_id": "uuid-externo-opcional",
      "accession": "ORD-....",
      "results": [{"code": "HB", "value": "13.2"}, ...],
      "documentos": [{"filename":"ecg.pdf","content_type":"application/pdf","base64":"...","request_item_id": 123}]
    }
    """

    permission_classes = [IntegrationKeyPermission]
    authentication_classes: list = []

    @transaction.atomic
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

        # DRF expõe o payload parseado em `request.data`.
        raw_body = request.body or b""
        payload = request.data if isinstance(request.data, dict) else {}

        message_id = str(payload.get("message_id") or "").strip()
        accession = str(payload.get("accession") or "").strip()
        content_type = request.content_type or "application/json"

        if not accession:
            return Response(
                {"detail": "Campo 'accession' é obrigatório."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        order = (
            IntegrationOrder.objects.filter(
                custom_id=accession,
                equipment=equipment,
                deleted=False,
            )
            .select_related("request__patient")
            .first()
        )
        if order is None:
            return Response(
                {"detail": "Ordem não encontrada para este equipment."},
                status=status.HTTP_404_NOT_FOUND,
            )

        # Idempotência leve: se message_id já existe para este equipment, devolve OK.
        if message_id:
            dup = IntegrationMessage.objects.filter(
                equipment=equipment,
                message_id=message_id,
                sha256=_sha256_bytes(raw_body),
                deleted=False,
            ).first()
            if dup is not None:
                return Response(
                    {
                        "detail": "Mensagem já processada (idempotência).",
                        "message_id": dup.custom_id,
                        "status": dup.status,
                    }
                )

        msg = IntegrationMessage.create_from_payload(
            equipment=equipment,
            order=order,
            direction=IntegrationMessage.Direction.ENTRADA,
            protocol=equipment.protocol,
            message_id=message_id,
            content_type=content_type,
            raw_body=raw_body,
            payload_json=payload if isinstance(payload, dict) else {},
        )

        results = payload.get("results") or []
        documentos = payload.get("documentos") or []

        aplicados = []
        erros = []

        try:
            # Garante Resultado (e itens) para a requisição.
            request = order.request
            result, _ = Result.objects.get_or_create(
                request=request,
                defaults={"tenant": request.tenant},
            )

            # Garante que os itens de result existam para cada item do pedido.
            for oi in order.itens.select_related("request_item").all():
                with suppress(Exception):
                    oi.request_item._criar_resultados()

            # Aplica resultados numéricos via mapeamento de analitos.
            for r in results if isinstance(results, list) else []:
                code = str((r or {}).get("code") or "").strip()
                value_raw = (r or {}).get("value", None)

                if not code:
                    erros.append("Resultado sem 'code'.")
                    continue

                mapping = (
                    IntegrationAnalyteMapping.objects.filter(
                        equipment=equipment,
                        code=code,
                        active=True,
                        deleted=False,
                    )
                    .select_related("exam_field")
                    .first()
                )
                if mapping is None:
                    erros.append(f"Sem mapeamento para code '{code}'.")
                    continue

                exam_field = mapping.exam_field

                item = ResultItem.objects.filter(
                    result=result,
                    exam_field=exam_field,
                    deleted=False,
                ).first()

                if item is None:
                    erros.append(f"Campo '{exam_field.name}' não pertence à requisição desta order.")
                    continue

                try:
                    if value_raw is None or value_raw == "":
                        raise InvalidOperation
                    value = Decimal(str(value_raw))
                except (InvalidOperation, ValueError, TypeError):
                    erros.append(f"Valor inválido para '{code}': {value_raw!r}.")
                    continue

                # Nota: ResultadoItem.save interpreta/alerta automaticamente.
                item.result_value = value
                item.save(update_fields=["result_value", "updated_at"])

                aplicados.append(
                    {
                        "code": code,
                        "exam_field_id": exam_field.id,
                        "exam_field": exam_field.name,
                        "value": str(value),
                    }
                )

            # Anexos/documentos (PDF, imagens, etc).
            for d in documentos if isinstance(documentos, list) else []:
                filename = str((d or {}).get("filename") or "").strip() or "documento.bin"
                ctype = str((d or {}).get("content_type") or "").strip() or "application/octet-stream"
                b64 = (d or {}).get("base64") or ""
                request_item_id = (d or {}).get("request_item_id")

                try:
                    raw = base64.b64decode(b64, validate=True)
                except (binascii.Error, ValueError):
                    erros.append(f"Documento '{filename}' com base64 inválido.")
                    continue

                order_item = None
                if request_item_id:
                    order_item = IntegrationOrderItem.objects.filter(
                        order=order,
                        request_item_id=request_item_id,
                        deleted=False,
                    ).first()

                # Salva em FileField via ContentFile.
                from django.core.files.base import ContentFile

                doc = IntegrationDocument(
                    tenant=equipment.tenant,
                    message=msg,
                    order_item=order_item,
                    filename=filename,
                    content_type=ctype,
                    sha256=_sha256_bytes(raw),
                )
                doc.file.save(filename, ContentFile(raw), save=True)

            # Atualiza status da order de forma simples:
            # se houver erros, marca ERRO; senão, EXEC/DONE dependendo de completude.
            if erros:
                order.status = IntegrationOrder.Estado.ERRO
                order.save(update_fields=["status", "updated_at"])
                msg.status = IntegrationMessage.Estado.ERRO
                msg.error = "\n".join(erros)[:8000]
            else:
                # Completa se todos os campos dos exams (LAB) tiverem value preenchido.
                completo = True
                for oi in order.itens.select_related("request_item__exam").all():
                    ri = oi.request_item
                    if not ri.exam_id:
                        continue
                    campos = list(getattr(ri.exam, "campos", []).all())
                    if not campos:
                        continue
                    for campo in campos:
                        if not ResultItem.objects.filter(
                            result=result,
                            exam_field=campo,
                            result_value__isnull=False,
                            deleted=False,
                        ).exists():
                            completo = False
                            break
                    if not completo:
                        break

                order.status = IntegrationOrder.Estado.CONCLUIDA if completo else IntegrationOrder.Estado.EM_EXECUCAO
                order.save(update_fields=["status", "updated_at"])

                msg.status = IntegrationMessage.Estado.PROCESSADA

            msg.processed_at = timezone.now()
            msg.save(update_fields=["status", "error", "processed_at", "updated_at"])

        except ValidationError as e:
            msg.status = IntegrationMessage.Estado.ERRO
            msg.error = str(e)
            msg.processed_at = timezone.now()
            msg.save(update_fields=["status", "error", "processed_at", "updated_at"])
            raise

        return Response(
            {
                "message": msg.custom_id,
                "order": order.custom_id,
                "order_status": order.status,
                "aplicados": aplicados,
                "erros": erros,
            },
            status=status.HTTP_200_OK if not erros else status.HTTP_400_BAD_REQUEST,
        )


IntegracaoDetailSerializer = IntegrationDetailSerializer
WorklistEquipamentoSerializer = WorklistEquipmentSerializer
WorklistPacienteSerializer = WorklistPatientSerializer
WorklistExameItemSerializer = WorklistExamItemSerializer
WorklistOrdemSerializer = WorklistOrderSerializer
ResultadosInboxResultadoSerializer = ResultsInboxResultSerializer
ResultadosInboxDocumentoSerializer = ResultsInboxDocumentSerializer
ResultadosInboxRequestSerializer = ResultsInboxRequestSerializer
ResultadosInboxAplicadoSerializer = ResultsInboxAppliedSerializer
ResultadosInboxResponseSerializer = ResultsInboxResponseSerializer
EquipamentoWorklistView = EquipmentWorklistView
EquipamentoResultadosInboxView = EquipmentResultsInboxView
