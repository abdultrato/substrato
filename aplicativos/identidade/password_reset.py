import uuid
from datetime import timedelta

from django.conf import settings
from django.db import models
from django.utils.timezone import now


class PasswordResetToken(models.Model):
    """
    Token seguro para redefinição de senha.
    """

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="password_reset_tokens",
    )

    token = models.UUIDField(
        default=uuid.uuid4,
        unique=True,
        editable=False,
    )

    criado_em = models.DateTimeField(auto_now_add=True)
    usado = models.BooleanField(default=False)

    class Meta:
        indexes = [
            models.Index(fields=["token"]),
            models.Index(fields=["user", "usado"]),
        ]
        ordering = ["-criado_em"]

    def expirado(self):
        return now() > self.criado_em + timedelta(minutes=60)

    def __str__(self):
        return f"ResetToken({self.user_id})"
