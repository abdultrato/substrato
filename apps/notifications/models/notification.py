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

    paciente = models.ForeignKey(
        "clinico.Patient",
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name="notificacoes",
    )

    destinatario = models.CharField(max_length=255)
    canal = models.CharField(
        max_length=50,
        choices=Channel.choices,
    )
    assunto = models.CharField(max_length=160, blank=True, default="")
    tipo_evento = models.CharField(
        max_length=40,
        choices=EventType.choices,
        default=EventType.GENERICA,
    )
    referencia_externa = models.CharField(max_length=120, blank=True)

    mensagem = models.TextField()

    enviada = models.BooleanField(default=False)
    erro_envio = models.TextField(blank=True, default="")
    enviado_em = models.DateTimeField(null=True, blank=True)

    criado_em = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-criado_em"]
        indexes = [
            models.Index(fields=["canal"]),
            models.Index(fields=["tipo_evento"]),
            models.Index(fields=["enviada"]),
            models.Index(fields=["referencia_externa"]),
        ]

    def __str__(self):
        return f"{self.get_canal_display()} → {self.destinatario}"
