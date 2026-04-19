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

    Canal = Channel  # Aliases legados
    TipoEvento = EventType

    patient = models.ForeignKey(  # Paciente relacionado (opcional)
        "clinical.Patient",
        verbose_name="Paciente",
        db_column="patient_id",
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name="notificacoes",
    )

    recipient = models.CharField(  # Destinatário final (e-mail, telefone, etc.)
        db_column="recipient",
        verbose_name="Destinatário",
        max_length=255,
    )
    channel = models.CharField(  # Meio de entrega
        db_column="channel",
        verbose_name="Canal",
        max_length=50,
        choices=Channel.choices,
    )
    subject = models.CharField(  # Assunto (quando aplicável)
        db_column="subject",
        verbose_name="Assunto",
        max_length=160,
        blank=True,
        default="",
    )
    event_type = models.CharField(  # Tipo de evento acionador
        db_column="event_type",
        verbose_name="Tipo de evento",
        max_length=40,
        choices=EventType.choices,
        default=EventType.GENERICA,
    )
    external_reference = models.CharField(  # ID externo (mensageria/gateway)
        db_column="external_reference",
        verbose_name="Referência externa",
        max_length=120,
        blank=True,
    )

    message = models.TextField(  # Corpo da mensagem
        db_column="message",
        verbose_name="Mensagem",
    )

    sent = models.BooleanField(  # Flag de envio concluído
        db_column="sent",
        verbose_name="Enviada",
        default=False,
    )
    send_error = models.TextField(  # Erro retornado pelo provedor
        db_column="send_error",
        verbose_name="Erro de envio",
        blank=True,
        default="",
    )
    sent_at = models.DateTimeField(  # Momento do envio
        db_column="sent_at",
        verbose_name="Enviado em",
        null=True,
        blank=True,
    )

    created_at = models.DateTimeField(
        db_column="created_at",
        verbose_name="Criado em",
        auto_now_add=True,
    )

    class Meta:
        db_table = "notificacoes_notificacao"  # Nome legado
        verbose_name = "Notificação"
        verbose_name_plural = "Notificações"
        ordering = ["-created_at"]  # Mais recentes primeiro
        indexes = [
            models.Index(fields=["channel"]),
            models.Index(fields=["event_type"]),
            models.Index(fields=["sent"]),
            models.Index(fields=["external_reference"]),
        ]

    def __str__(self):
        return f"{self.get_channel_display()} → {self.recipient}"
