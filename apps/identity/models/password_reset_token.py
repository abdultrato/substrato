import secrets

from django.contrib.auth.hashers import check_password, identify_hasher, make_password
from django.db import models


class PasswordResetToken(models.Model):
    user = models.ForeignKey(  # Dono do token
        "identidade.User",
        verbose_name="Usuário",
        on_delete=models.CASCADE,
        related_name="password_reset_tokens",
        db_index=True,
    )

    token = models.CharField("Hash do token", max_length=128, unique=True, db_index=True, blank=True)
    used = models.BooleanField(  # Evita reuso
        db_column="used",
        verbose_name="Utilizado",
        default=False,
        db_index=True,
    )
    created_at = models.DateTimeField(  # Controle de expiração/ordenação
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

    @staticmethod
    def generate_token() -> str:
        # 32 bytes -> ~43 chars base64url; cabe no campo e e seguro.
        return secrets.token_urlsafe(32)

    @staticmethod
    def is_hashed_token(value: str | None) -> bool:
        if not value:
            return False
        try:
            identify_hasher(value)
        except ValueError:
            return False
        return True

    @property
    def raw_token(self) -> str | None:
        return getattr(self, "_raw_token", None)

    def set_token(self, raw_token: str) -> None:
        self._raw_token = raw_token
        self.token = make_password(raw_token)

    def matches(self, raw_token: str) -> bool:
        return bool(raw_token and self.token and check_password(raw_token, self.token))

    def save(self, *args, **kwargs):
        if not self.token:
            self.set_token(self.generate_token())
        elif not self.is_hashed_token(self.token):
            self.set_token(self.token)
        return super().save(*args, **kwargs)

    def __str__(self) -> str:
        return f"{self.user_id} - {'used' if self.used else 'active'}"
