from __future__ import annotations

import base64
import binascii
import hashlib
from decimal import Decimal, InvalidOperation

from django.core.exceptions import ValidationError
from django.db import transaction
from django.utils import timezone
from rest_framework import status
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView

from aplicativos.clinico.modelos.resultado import Resultado
from aplicativos.clinico.modelos.resultado_analise import ResultadoItem
from aplicativos.integracoes_equipamentos.modelos import (
    IntegracaoCredencial,
    IntegracaoDocumento,
    IntegracaoEquipamento,
    IntegracaoMapeamentoAnalito,
    IntegracaoMensagem,
    IntegracaoOrdem,
    IntegracaoOrdemItem,
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


def _auth_credencial(request) -> tuple[IntegracaoCredencial | None, Response | None]:
    raw_key = _get_integration_key(request)
    cred = IntegracaoCredencial.validar_chave(raw_key)
    if cred is None:
        return None, Response(
            {"detail": "Credencial de integração inválida."},
            status=status.HTTP_401_UNAUTHORIZED,
        )
    if not cred.ativo or cred.revogada_em:
        return None, Response(
            {"detail": "Credencial de integração revogada."},
            status=status.HTTP_401_UNAUTHORIZED,
        )
    return cred, None


class EquipamentoWorklistView(APIView):
    """
    Worklist para equipamentos (HTTP JSON).

    Autenticação: header `X-Integration-Key`.
    """

    permission_classes = [AllowAny]
    authentication_classes: list = []

    def get(self, request, equipamento_id_custom: str):
        cred, resp = _auth_credencial(request)
        if resp is not None:
            return resp

        if not cred.possui_scope(IntegracaoCredencial.Scope.WORKLIST_READ):
            return Response(
                {"detail": "Sem permissão para ler worklist."},
                status=status.HTTP_403_FORBIDDEN,
            )

        equipamento = (
            IntegracaoEquipamento.objects.filter(
                id_custom=equipamento_id_custom,
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
            estados = [IntegracaoOrdem.Estado.PENDENTE, IntegracaoOrdem.Estado.EM_EXECUCAO]

        ordens = (
            IntegracaoOrdem.objects.filter(
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


class EquipamentoResultadosInboxView(APIView):
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

    permission_classes = [AllowAny]
    authentication_classes: list = []

    @transaction.atomic
    def post(self, request, equipamento_id_custom: str):
        cred, resp = _auth_credencial(request)
        if resp is not None:
            return resp

        if not cred.possui_scope(IntegracaoCredencial.Scope.RESULT_WRITE):
            return Response(
                {"detail": "Sem permissão para enviar resultados."},
                status=status.HTTP_403_FORBIDDEN,
            )

        equipamento = (
            IntegracaoEquipamento.objects.filter(
                id_custom=equipamento_id_custom,
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
            IntegracaoOrdem.objects.filter(
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
            dup = IntegracaoMensagem.objects.filter(
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

        msg = IntegracaoMensagem.criar_de_payload(
            equipamento=equipamento,
            ordem=ordem,
            direcao=IntegracaoMensagem.Direcao.ENTRADA,
            protocolo=equipamento.protocolo,
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
            resultado, _ = Resultado.objects.get_or_create(
                requisicao=requisicao,
                defaults={"inquilino": requisicao.inquilino},
            )

            # Garante que os itens de resultado existam para cada item do pedido.
            for oi in ordem.itens.select_related("requisicao_item").all():
                try:
                    oi.requisicao_item._criar_resultados()
                except Exception:
                    # Não falha a integração por isso; apenas registra.
                    pass

            # Aplica resultados numéricos via mapeamento de analitos.
            for r in results if isinstance(results, list) else []:
                codigo = str((r or {}).get("codigo") or "").strip()
                valor_raw = (r or {}).get("valor", None)

                if not codigo:
                    erros.append("Resultado sem 'codigo'.")
                    continue

                mapping = (
                    IntegracaoMapeamentoAnalito.objects.filter(
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

                item = ResultadoItem.objects.filter(
                    resultado=resultado,
                    exame_campo=exame_campo,
                    deletado=False,
                ).first()

                if item is None:
                    erros.append(
                        f"Campo '{exame_campo.nome}' não pertence à requisição desta ordem."
                    )
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
                    ordem_item = IntegracaoOrdemItem.objects.filter(
                        ordem=ordem,
                        requisicao_item_id=requisicao_item_id,
                        deletado=False,
                    ).first()

                # Salva em FileField via ContentFile.
                from django.core.files.base import ContentFile

                doc = IntegracaoDocumento(
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
                ordem.estado = IntegracaoOrdem.Estado.ERRO
                ordem.save(update_fields=["estado", "atualizado_em"])
                msg.estado = IntegracaoMensagem.Estado.ERRO
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
                        if not ResultadoItem.objects.filter(
                            resultado=resultado,
                            exame_campo=campo,
                            resultado_valor__isnull=False,
                            deletado=False,
                        ).exists():
                            completo = False
                            break
                    if not completo:
                        break

                ordem.estado = IntegracaoOrdem.Estado.CONCLUIDA if completo else IntegracaoOrdem.Estado.EM_EXECUCAO
                ordem.save(update_fields=["estado", "atualizado_em"])

                msg.estado = IntegracaoMensagem.Estado.PROCESSADA

            msg.processado_em = timezone.now()
            msg.save(update_fields=["estado", "erro", "processado_em", "atualizado_em"])

        except ValidationError as e:
            msg.estado = IntegracaoMensagem.Estado.ERRO
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

