import hashlib
from typing import Any

from django.db import models

from core.models.base import NoNameCoreModel


def _sha256_bytes(date: bytes) -> str:
    return hashlib.sha256(date or b"").hexdigest()


def _upload_path(instance: "IntegrationDocument", filename: str) -> str:
    tenant = getattr(instance, "tenant_id", None) or "sem-tenant"
    msg = getattr(instance, "message_id", None) or "sem-msg"
    return f"integracoes_equipamentos/{tenant}/{msg}/{filename}"


class IntegrationMessage(NoNameCoreModel):
    prefix = "MSG"

    class Direction(models.TextChoices):
        INBOUND = "IN", "Entrada"
        OUTBOUND = "OUT", "Saída"

    class Status(models.TextChoices):
        RECEIVED = "RECV", "Recebida"
        PROCESSED = "PROC", "Processada"
        ERROR = "ERRO", "Erro"

    equipment = models.ForeignKey(

        "integracoes_equipamentos.IntegrationEquipment",

        db_column="equipment_id",
        on_delete=models.PROTECT,
        related_name="mensagens",
        db_index=True,
    )
    order = models.ForeignKey(
        "integracoes_equipamentos.IntegrationOrder",
        db_column="order_id",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="mensagens",
        db_index=True,
    )

    direction = models.CharField(

        db_column="direction",

        max_length=3,
        choices=Direction.choices,
        default=Direction.INBOUND,
        db_index=True,
    )
    protocol = models.CharField(
        db_column="protocol",
        max_length=20, blank=True, default="", db_index=True)
    message_id = models.CharField(max_length=120, blank=True, default="", db_index=True)
    content_type = models.CharField(max_length=120, blank=True, default="")

    sha256 = models.CharField(max_length=64, blank=True, default="", db_index=True)
    payload_json = models.JSONField(default=dict, blank=True)
    payload_raw = models.TextField(blank=True, default="")

    status = models.CharField(

        db_column="status",

        max_length=4,
        choices=Status.choices,
        default=Status.RECEIVED,
        db_index=True,
    )
    error = models.TextField(
        db_column="error",
        blank=True, default="")

    processed_at = models.DateTimeField(

        db_column="processed_at",

        null=True, blank=True)

    class Meta:
        db_table = "integracoes_equipamentos_integracaomensagem"
        verbose_name = "Mensagem (Integração)"
        verbose_name_plural = "Mensagens (Integração)"
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["tenant", "equipment", "status"]),
            models.Index(fields=["equipment", "direction", "created_at"]),
        ]

    @classmethod
    def create_from_payload(
        cls,
        *,
        equipment,
        order=None,
        direction: str,
        protocol: str,
        message_id: str,
        content_type: str,
        raw_body: bytes,
        payload_json: dict[str, Any] | None,
    ) -> "IntegrationMessage":
        raw_body = raw_body or b""
        return cls.objects.create(
            tenant=equipment.tenant,
            equipment=equipment,
            order=order,
            direction=direction,
            protocol=protocol or "",
            message_id=message_id or "",
            content_type=content_type or "",
            sha256=_sha256_bytes(raw_body),
            payload_raw=raw_body.decode("utf-8", errors="replace"),
            payload_json=payload_json or {},
            status=cls.Status.RECEIVED,
        )


IntegrationMessage.criar_de_payload = IntegrationMessage.create_from_payload


class IntegrationDocument(NoNameCoreModel):
    prefix = "DOC"

    message = models.ForeignKey(

        IntegrationMessage,

        db_column="message_id",
        on_delete=models.CASCADE,
        related_name="documentos",
        db_index=True,
    )
    order_item = models.ForeignKey(
        "integracoes_equipamentos.IntegrationOrderItem",
        db_column="order_item_id",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="documentos",
        db_index=True,
    )

    file = models.FileField(

        db_column="file",

        upload_to=_upload_path)
    filename = models.CharField(max_length=255, blank=True, default="")
    content_type = models.CharField(max_length=120, blank=True, default="")
    sha256 = models.CharField(max_length=64, blank=True, default="", db_index=True)

    class Meta:
        db_table = "integracoes_equipamentos_integracaodocumento"
        verbose_name = "Documento (Integração)"
        verbose_name_plural = "Documentos (Integração)"
        ordering = ["-created_at"]

    def save(self, *args, **kwargs):
        if not self.tenant_id and self.message_id:
            self.tenant_id = self.message.tenant_id

        if not self.filename and getattr(self.file, "name", None):
            self.filename = self.file.name.rsplit("/", 1)[-1]

        if self.file and not self.sha256:
            try:
                self.file.seek(0)
                date = self.file.read()
                self.file.seek(0)
                self.sha256 = _sha256_bytes(date or b"")
            except Exception:
                pass

        super().save(*args, **kwargs)
