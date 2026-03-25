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
        if cred is None or not cred.ativo or cred.revogada_em:
            return False
        request.integration_cred = cred
        return True


class IntegrationDetailSerializer(serializers.Serializer):
    detail = serializers.CharField()


class WorklistEquipmentSerializer(serializers.Serializer):
    id = serializers.IntegerField()
    codigo = serializers.CharField()
    nome = serializers.CharField()
    modalidade = serializers.CharField(required=False, allow_blank=True, allow_null=True)
    protocolo = serializers.CharField(required=False, allow_blank=True, allow_null=True)


class WorklistPatientSerializer(serializers.Serializer):
    id = serializers.IntegerField()
    codigo = serializers.CharField()
    nome = serializers.CharField()
    data_nascimento = serializers.DateField(required=False, allow_null=True)
    genero = serializers.CharField(required=False, allow_blank=True, allow_null=True)
    numero_id = serializers.CharField(required=False, allow_blank=True, allow_null=True)


class WorklistExamItemSerializer(serializers.Serializer):
    requisicao_item_id = serializers.IntegerField()
    tipo = serializers.CharField()
    exame_id = serializers.IntegerField()
    exame_codigo = serializers.CharField(required=False, allow_blank=True, allow_null=True)
    exame_nome = serializers.CharField(required=False, allow_blank=True, allow_null=True)
    setor = serializers.CharField(required=False, allow_blank=True, allow_null=True)


class WorklistOrderSerializer(serializers.Serializer):
    accession = serializers.CharField()
    ordem_id = serializers.IntegerField()
    estado = serializers.CharField()
    requisicao_id = serializers.IntegerField()
    requisicao_codigo = serializers.CharField()
    paciente = WorklistPatientSerializer()
    itens = WorklistExamItemSerializer(many=True)
    criado_em = serializers.DateTimeField(required=False, allow_null=True)


class WorklistResponseSerializer(serializers.Serializer):
    equipamento = WorklistEquipmentSerializer()
    count = serializers.IntegerField()
    results = WorklistOrderSerializer(many=True)


class ResultsInboxResultSerializer(serializers.Serializer):
    codigo = serializers.CharField()
    valor = serializers.JSONField(required=False, allow_null=True)


class ResultsInboxDocumentSerializer(serializers.Serializer):
    filename = serializers.CharField(required=False, allow_blank=True)
    content_type = serializers.CharField(required=False, allow_blank=True)
    base64 = serializers.CharField(required=False, allow_blank=True)
    requisicao_item_id = serializers.IntegerField(required=False, allow_null=True)


class ResultsInboxRequestSerializer(serializers.Serializer):
    message_id = serializers.CharField(required=False, allow_blank=True)
    accession = serializers.CharField()
    results = ResultsInboxResultSerializer(many=True, required=False)
    documentos = ResultsInboxDocumentSerializer(many=True, required=False)


class ResultsInboxAppliedSerializer(serializers.Serializer):
    codigo = serializers.CharField()
    exame_campo_id = serializers.IntegerField()
    exame_campo = serializers.CharField()
    valor = serializers.CharField()


class ResultsInboxResponseSerializer(serializers.Serializer):
    mensagem = serializers.CharField()
    ordem = serializers.CharField()
    ordem_estado = serializers.CharField()
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
                "estado",
                OpenApiTypes.STR,
                OpenApiParameter.QUERY,
                description="Filtrar por estado (pode repetir ?estado=...)",
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
    def get(self, request, equipment_id_custom: str):
        cred = getattr(request, "integration_cred", None)
        if cred is None:
            return Response({"detail": "Credencial de integração inválida."}, status=status.HTTP_401_UNAUTHORIZED)

        if not cred.has_scope(IntegrationCredential.Scope.WORKLIST_READ):
            return Response(
                {"detail": "Sem permissão para ler worklist."},
                status=status.HTTP_403_FORBIDDEN,
            )

        equipamento = (
            IntegrationEquipment.objects.filter(
                id_custom=equipment_id_custom,
                deletado=False,
            )
            .select_related("inquilino")
            .first()
        )

        if equipamento is None:
            return Response(
                {"detail": "Equipamento não encontrado."},
                status=status.HTTP_404_NOT_FOUND,
            )

        if cred.equipamento_id != equipamento.id:
            return Response(
                {"detail": "Credencial não corresponde ao equipamento."},
                status=status.HTTP_403_FORBIDDEN,
            )

        limit = int(request.query_params.get("limit") or 50)
        limit = max(1, min(limit, 200))

        estados = request.query_params.getlist("estado")
        if not estados:
            estados = [IntegrationOrder.Estado.PENDENTE, IntegrationOrder.Estado.EM_EXECUCAO]

        ordens = (
            IntegrationOrder.objects.filter(
                equipamento=equipamento,
                estado__in=estados,
                deletado=False,
            )
            .select_related("requisicao__paciente")
            .prefetch_related(
                "itens__requisicao_item__exame",
                "itens__requisicao_item__exame_medico",
            )
            .order_by("criado_em")[:limit]
        )

        out = []
        for ordem in ordens:
            req = ordem.requisicao
            pac = req.paciente

            itens = []
            for oi in ordem.itens.all():
                ri = oi.requisicao_item
                if ri.exame_id:
                    itens.append(
                        {
                            "requisicao_item_id": ri.id,
                            "tipo": "LAB",
                            "exame_id": ri.exame_id,
                            "exame_codigo": getattr(ri.exame, "id_custom", None),
                            "exame_nome": getattr(ri.exame, "nome", None),
                            "setor": getattr(ri.exame, "setor", None),
                        }
                    )
                elif ri.exame_medico_id:
                    itens.append(
                        {
                            "requisicao_item_id": ri.id,
                            "tipo": "MED",
                            "exame_id": ri.exame_medico_id,
                            "exame_codigo": getattr(ri.exame_medico, "id_custom", None),
                            "exame_nome": getattr(ri.exame_medico, "nome", None),
                            "setor": getattr(ri.exame_medico, "setor", None),
                        }
                    )

            out.append(
                {
                    "accession": ordem.id_custom,
                    "ordem_id": ordem.id,
                    "estado": ordem.estado,
                    "requisicao_id": req.id,
                    "requisicao_codigo": req.id_custom,
                    "paciente": {
                        "id": pac.id,
                        "codigo": pac.id_custom,
                        "nome": pac.nome,
                        "data_nascimento": pac.data_nascimento.isoformat() if pac.data_nascimento else None,
                        "genero": pac.genero,
                        "numero_id": pac.numero_id,
                    },
                    "itens": itens,
                    "criado_em": ordem.criado_em.isoformat() if ordem.criado_em else None,
                }
            )

        return Response(
            {
                "equipamento": {
                    "id": equipamento.id,
                    "codigo": equipamento.id_custom,
                    "nome": equipamento.nome,
                    "modalidade": equipamento.modalidade,
                    "protocolo": equipamento.protocolo,
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
      "results": [{"codigo": "HB", "valor": "13.2"}, ...],
      "documentos": [{"filename":"ecg.pdf","content_type":"application/pdf","base64":"...","requisicao_item_id": 123}]
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
    def post(self, request, equipment_id_custom: str):
        cred = getattr(request, "integration_cred", None)
        if cred is None:
            return Response({"detail": "Credencial de integração inválida."}, status=status.HTTP_401_UNAUTHORIZED)

        if not cred.has_scope(IntegrationCredential.Scope.RESULT_WRITE):
            return Response(
                {"detail": "Sem permissão para enviar resultados."},
                status=status.HTTP_403_FORBIDDEN,
            )

        equipamento = (
            IntegrationEquipment.objects.filter(
                id_custom=equipment_id_custom,
                deletado=False,
            )
            .select_related("inquilino")
            .first()
        )
        if equipamento is None:
            return Response(
                {"detail": "Equipamento não encontrado."},
                status=status.HTTP_404_NOT_FOUND,
            )

        if cred.equipamento_id != equipamento.id:
            return Response(
                {"detail": "Credencial não corresponde ao equipamento."},
                status=status.HTTP_403_FORBIDDEN,
            )

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

        ordem = (
            IntegrationOrder.objects.filter(
                id_custom=accession,
                equipamento=equipamento,
                deletado=False,
            )
            .select_related("requisicao__paciente")
            .first()
        )
        if ordem is None:
            return Response(
                {"detail": "Ordem não encontrada para este equipamento."},
                status=status.HTTP_404_NOT_FOUND,
            )

        # Idempotência leve: se message_id já existe para este equipamento, devolve OK.
        if message_id:
            dup = IntegrationMessage.objects.filter(
                equipamento=equipamento,
                message_id=message_id,
                sha256=_sha256_bytes(raw_body),
                deletado=False,
            ).first()
            if dup is not None:
                return Response(
                    {
                        "detail": "Mensagem já processada (idempotência).",
                        "mensagem_id": dup.id_custom,
                        "estado": dup.estado,
                    }
                )

        msg = IntegrationMessage.create_from_payload(
            equipment=equipamento,
            order=ordem,
            direction=IntegrationMessage.Direction.ENTRADA,
            protocol=equipamento.protocolo,
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
            requisicao = ordem.requisicao
            resultado, _ = Result.objects.get_or_create(
                requisicao=requisicao,
                defaults={"inquilino": requisicao.inquilino},
            )

            # Garante que os itens de resultado existam para cada item do pedido.
            for oi in ordem.itens.select_related("requisicao_item").all():
                with suppress(Exception):
                    oi.requisicao_item._criar_resultados()

            # Aplica resultados numéricos via mapeamento de analitos.
            for r in results if isinstance(results, list) else []:
                codigo = str((r or {}).get("codigo") or "").strip()
                valor_raw = (r or {}).get("valor", None)

                if not codigo:
                    erros.append("Resultado sem 'codigo'.")
                    continue

                mapping = (
                    IntegrationAnalyteMapping.objects.filter(
                        equipamento=equipamento,
                        codigo=codigo,
                        ativo=True,
                        deletado=False,
                    )
                    .select_related("exame_campo")
                    .first()
                )
                if mapping is None:
                    erros.append(f"Sem mapeamento para codigo '{codigo}'.")
                    continue

                exame_campo = mapping.exame_campo

                item = ResultItem.objects.filter(
                    resultado=resultado,
                    exame_campo=exame_campo,
                    deletado=False,
                ).first()

                if item is None:
                    erros.append(f"Campo '{exame_campo.nome}' não pertence à requisição desta ordem.")
                    continue

                try:
                    if valor_raw is None or valor_raw == "":
                        raise InvalidOperation
                    valor = Decimal(str(valor_raw))
                except (InvalidOperation, ValueError, TypeError):
                    erros.append(f"Valor inválido para '{codigo}': {valor_raw!r}.")
                    continue

                # Nota: ResultadoItem.save interpreta/alerta automaticamente.
                item.resultado_valor = valor
                item.save(update_fields=["resultado_valor", "atualizado_em"])

                aplicados.append(
                    {
                        "codigo": codigo,
                        "exame_campo_id": exame_campo.id,
                        "exame_campo": exame_campo.nome,
                        "valor": str(valor),
                    }
                )

            # Anexos/documentos (PDF, imagens, etc).
            for d in documentos if isinstance(documentos, list) else []:
                filename = str((d or {}).get("filename") or "").strip() or "documento.bin"
                ctype = str((d or {}).get("content_type") or "").strip() or "application/octet-stream"
                b64 = (d or {}).get("base64") or ""
                requisicao_item_id = (d or {}).get("requisicao_item_id")

                try:
                    raw = base64.b64decode(b64, validate=True)
                except (binascii.Error, ValueError):
                    erros.append(f"Documento '{filename}' com base64 inválido.")
                    continue

                ordem_item = None
                if requisicao_item_id:
                    ordem_item = IntegrationOrderItem.objects.filter(
                        ordem=ordem,
                        requisicao_item_id=requisicao_item_id,
                        deletado=False,
                    ).first()

                # Salva em FileField via ContentFile.
                from django.core.files.base import ContentFile

                doc = IntegrationDocument(
                    inquilino=equipamento.inquilino,
                    mensagem=msg,
                    ordem_item=ordem_item,
                    filename=filename,
                    content_type=ctype,
                    sha256=_sha256_bytes(raw),
                )
                doc.arquivo.save(filename, ContentFile(raw), save=True)

            # Atualiza estado da ordem de forma simples:
            # se houver erros, marca ERRO; senão, EXEC/DONE dependendo de completude.
            if erros:
                ordem.estado = IntegrationOrder.Estado.ERRO
                ordem.save(update_fields=["estado", "atualizado_em"])
                msg.estado = IntegrationMessage.Estado.ERRO
                msg.erro = "\n".join(erros)[:8000]
            else:
                # Completa se todos os campos dos exames (LAB) tiverem valor preenchido.
                completo = True
                for oi in ordem.itens.select_related("requisicao_item__exame").all():
                    ri = oi.requisicao_item
                    if not ri.exame_id:
                        continue
                    campos = list(getattr(ri.exame, "campos", []).all())
                    if not campos:
                        continue
                    for campo in campos:
                        if not ResultItem.objects.filter(
                            resultado=resultado,
                            exame_campo=campo,
                            resultado_valor__isnull=False,
                            deletado=False,
                        ).exists():
                            completo = False
                            break
                    if not completo:
                        break

                ordem.estado = IntegrationOrder.Estado.CONCLUIDA if completo else IntegrationOrder.Estado.EM_EXECUCAO
                ordem.save(update_fields=["estado", "atualizado_em"])

                msg.estado = IntegrationMessage.Estado.PROCESSADA

            msg.processado_em = timezone.now()
            msg.save(update_fields=["estado", "erro", "processado_em", "atualizado_em"])

        except ValidationError as e:
            msg.estado = IntegrationMessage.Estado.ERRO
            msg.erro = str(e)
            msg.processado_em = timezone.now()
            msg.save(update_fields=["estado", "erro", "processado_em", "atualizado_em"])
            raise

        return Response(
            {
                "mensagem": msg.id_custom,
                "ordem": ordem.id_custom,
                "ordem_estado": ordem.estado,
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
