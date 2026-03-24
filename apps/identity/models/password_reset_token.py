import secrets

from django.db import models


class PasswordResetToken(models.Model):
    user = models.ForeignKey(
        "identidade.User",
        on_delete=models.CASCADE,
        related_name="password_reset_tokens",
        db_index=True,
    )

    token = models.CharField(max_length=128, unique=True, db_index=True, blank=True)
    usado = models.BooleanField(default=False, db_index=True)
    criado_em = models.DateTimeField(auto_now_add=True, db_index=True)

    class Meta:
        ordering = ["-criado_em"]
        verbose_name = "Token de Reset de Password"
        verbose_name_plural = "Tokens de Reset de Password"
        indexes = [
            models.Index(fields=["user", "criado_em"]),
            models.Index(fields=["usado"]),
        ]

    def save(self, *args, **kwargs):
        if not self.token:
            # 32 bytes -> ~43 chars base64url; cabe no campo e e seguro.
            self.token = secrets.token_urlsafe(32)
        return super().save(*args, **kwargs)

    def __str__(self) -> str:
        return f"{self.user_id} - {'usado' if self.usado else 'ativo'}"
