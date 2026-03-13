import hashlib
from typing import Any

from django.db import models

from nucleo.modelos.base import NoNameCoreModel


def _sha256_bytes(data: bytes) -> str:
    return hashlib.sha256(data or b"").hexdigest()


def _upload_path(instance: "IntegracaoDocumento", filename: str) -> str:
    tenant = getattr(instance, "inquilino_id", None) or "sem-tenant"
    msg = getattr(instance, "mensagem_id", None) or "sem-msg"
    return f"integracoes_equipamentos/{tenant}/{msg}/{filename}"


class IntegracaoMensagem(NoNameCoreModel):
    prefixo = "MSG"

    class Direcao(models.TextChoices):
        ENTRADA = "IN", "Entrada"
        SAIDA = "OUT", "Saída"

    class Estado(models.TextChoices):
        RECEBIDA = "RECV", "Recebida"
        PROCESSADA = "PROC", "Processada"
        ERRO = "ERRO", "Erro"

    equipamento = models.ForeignKey(
        "integracoes_equipamentos.IntegracaoEquipamento",
        on_delete=models.PROTECT,
        related_name="mensagens",
        db_index=True,
    )
    ordem = models.ForeignKey(
        "integracoes_equipamentos.IntegracaoOrdem",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="mensagens",
        db_index=True,
    )

    direcao = models.CharField(
        max_length=3,
        choices=Direcao.choices,
        default=Direcao.ENTRADA,
        db_index=True,
    )
    protocolo = models.CharField(max_length=20, blank=True, default="", db_index=True)
    message_id = models.CharField(max_length=120, blank=True, default="", db_index=True)
    content_type = models.CharField(max_length=120, blank=True, default="")

    sha256 = models.CharField(max_length=64, blank=True, default="", db_index=True)
    payload_json = models.JSONField(default=dict, blank=True)
    payload_raw = models.TextField(blank=True, default="")

    estado = models.CharField(
        max_length=4,
        choices=Estado.choices,
        default=Estado.RECEBIDA,
        db_index=True,
    )
    erro = models.TextField(blank=True, default="")

    processado_em = models.DateTimeField(null=True, blank=True)

    class Meta:
        verbose_name = "Mensagem (Integração)"
        verbose_name_plural = "Mensagens (Integração)"
        ordering = ["-criado_em"]
        indexes = [
            models.Index(fields=["inquilino", "equipamento", "estado"]),
            models.Index(fields=["equipamento", "direcao", "criado_em"]),
        ]

    @classmethod
    def criar_de_payload(
        cls,
        *,
        equipamento,
        ordem=None,
        direcao: str,
        protocolo: str,
        message_id: str,
        content_type: str,
        raw_body: bytes,
        payload_json: dict[str, Any] | None,
    ) -> "IntegracaoMensagem":
        raw_body = raw_body or b""
        return cls.objects.create(
            inquilino=equipamento.inquilino,
            equipamento=equipamento,
            ordem=ordem,
            direcao=direcao,
            protocolo=protocolo or "",
            message_id=message_id or "",
            content_type=content_type or "",
            sha256=_sha256_bytes(raw_body),
            payload_raw=raw_body.decode("utf-8", errors="replace"),
            payload_json=payload_json or {},
            estado=cls.Estado.RECEBIDA,
        )


class IntegracaoDocumento(NoNameCoreModel):
    prefixo = "DOC"

    mensagem = models.ForeignKey(
        IntegracaoMensagem,
        on_delete=models.CASCADE,
        related_name="documentos",
        db_index=True,
    )
    ordem_item = models.ForeignKey(
        "integracoes_equipamentos.IntegracaoOrdemItem",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="documentos",
        db_index=True,
    )

    arquivo = models.FileField(upload_to=_upload_path)
    filename = models.CharField(max_length=255, blank=True, default="")
    content_type = models.CharField(max_length=120, blank=True, default="")
    sha256 = models.CharField(max_length=64, blank=True, default="", db_index=True)

    class Meta:
        verbose_name = "Documento (Integração)"
        verbose_name_plural = "Documentos (Integração)"
        ordering = ["-criado_em"]

    def save(self, *args, **kwargs):
        if not self.inquilino_id and self.mensagem_id:
            self.inquilino_id = self.mensagem.inquilino_id

        if not self.filename and getattr(self.arquivo, "name", None):
            self.filename = self.arquivo.name.rsplit("/", 1)[-1]

        if self.arquivo and not self.sha256:
            try:
                self.arquivo.seek(0)
                data = self.arquivo.read()
                self.arquivo.seek(0)
                self.sha256 = _sha256_bytes(data or b"")
            except Exception:
                pass

        super().save(*args, **kwargs)

