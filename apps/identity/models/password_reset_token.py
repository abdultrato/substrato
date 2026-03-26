import secrets

from django.db import models


class PasswordResetToken(models.Model):
    user = models.ForeignKey(
        "identidade.User",
        verbose_name="Usuário",
        on_delete=models.CASCADE,
        related_name="password_reset_tokens",
        db_index=True,
    )

    token = models.CharField("Token", max_length=128, unique=True, db_index=True, blank=True)
    used = models.BooleanField(
        db_column="used",
        verbose_name="Utilizado",
        default=False, db_index=True)
    created_at = models.DateTimeField(
        db_column="created_at",
        verbose_name="Criado em",
        auto_now_add=True,
        db_index=True,
    )

    class Meta:
        ordering = ["-created_at"]
        verbose_name = "Token de Reset de Password"
        verbose_name_plural = "Tokens de Reset de Password"
        indexes = [
            models.Index(fields=["user", "created_at"]),
            models.Index(fields=["used"]),
        ]

    def save(self, *args, **kwargs):
        if not self.token:
            # 32 bytes -> ~43 chars base64url; cabe no campo e e seguro.
            self.token = secrets.token_urlsafe(32)
        return super().save(*args, **kwargs)

    def __str__(self) -> str:
        return f"{self.user_id} - {'used' if self.used else 'active'}"
