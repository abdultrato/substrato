from django.db import models


class Notification(models.Model):
    class Channel(models.TextChoices):
        EMAIL = "email", "E-mail"
        SMS = "sms", "SMS"
        WHATSAPP = "whatsapp", "WhatsApp"

    class EventType(models.TextChoices):
        GENERICA = "GERAL", "Geral"
        PASSWORD_RESET = "RESET_SENHA", "Reposição de palavra-passe"
        RESULTADO_DISPONIVEL = "RESULTADO", "Resultado disponível"
        FATURA_EMITIDA = "FATURA", "Fatura emitida"
        RECIBO_GERADO = "RECIBO", "Recibo gerado"

    Canal = Channel
    TipoEvento = EventType

    patient = models.ForeignKey(

        "clinico.Patient",

        db_column="paciente_id",
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name="notificacoes",
    )

    recipient = models.CharField(

        db_column="destinatario",

        max_length=255)
    channel = models.CharField(
        db_column="canal",
        max_length=50,
        choices=Channel.choices,
    )
    subject = models.CharField(
        db_column="assunto",
        max_length=160, blank=True, default="")
    event_type = models.CharField(
        db_column="tipo_evento",
        max_length=40,
        choices=EventType.choices,
        default=EventType.GENERICA,
    )
    external_reference = models.CharField(
        db_column="referencia_externa",
        max_length=120, blank=True)

    message = models.TextField(

        db_column="mensagem",

        )

    sent = models.BooleanField(

        db_column="enviada",

        default=False)
    send_error = models.TextField(
        db_column="erro_envio",
        blank=True, default="")
    sent_at = models.DateTimeField(
        db_column="enviado_em",
        null=True, blank=True)

    created_at = models.DateTimeField(db_column="criado_em", auto_now_add=True)

    class Meta:
        db_table = "notificacoes_notificacao"
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["channel"]),
            models.Index(fields=["event_type"]),
            models.Index(fields=["sent"]),
            models.Index(fields=["external_reference"]),
        ]

    def __str__(self):
        return f"{self.get_channel_display()} → {self.recipient}"
