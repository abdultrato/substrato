import base64
from collections.abc import Iterable
import hashlib
import os

from django.conf import settings
from django.core.exceptions import ValidationError
from django.db import models
from django.utils import timezone

from core.models.base import NoNameCoreModel


def _hash_key(raw_key: str) -> str:
    """
    Deterministic lookup hash using the server pepper.
    This is not a password hash; it only helps identify the credential quickly.
    """

    pepper = getattr(settings, "SECRET_KEY", "") or ""
    date = (pepper + raw_key).encode("utf-8")
    return hashlib.sha256(date).hexdigest()


class IntegrationCredential(NoNameCoreModel):
    prefix = "KEY"

    class Scope(models.TextChoices):
        WORKLIST_READ = "WORKLIST_READ", "Ler worklist"
        RESULT_WRITE = "RESULT_WRITE", "Enviar resultados"

    equipment = models.ForeignKey(

        "integracoes_equipamentos.IntegrationEquipment",

        db_column="equipamento_id",
        on_delete=models.CASCADE,
        related_name="credenciais",
        db_index=True,
    )

    label = models.CharField(max_length=120, blank=True, default="", db_index=True)

    # Ajuda a identificar sem expor key.
    key_prefix = models.CharField(max_length=12, blank=True, default="", db_index=True)
    key_last4 = models.CharField(max_length=4, blank=True, default="")

    key_hash = models.CharField(max_length=64, unique=True, db_index=True, editable=False)

    scopes = models.JSONField(default=list, blank=True)

    active = models.BooleanField(

        db_column="ativo",

        default=True, db_index=True)
    revoked_at = models.DateTimeField(
        db_column="revogada_em",
        null=True, blank=True)

    class Meta:
        db_table = "integracoes_equipamentos_integracaocredencial"
        verbose_name = "Credencial (Equipamento)"
        verbose_name_plural = "Credenciais (Equipamentos)"
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["tenant", "equipment"]),
            models.Index(fields=["equipment", "active"]),
        ]

    @classmethod
    def generate(
        cls, *, equipment, label: str = "", scopes: Iterable[str] | None = None
    ) -> tuple["IntegrationCredential", str]:
        """
        Create a credential and return the raw key once.
        """

        raw = base64.urlsafe_b64encode(os.urandom(32)).decode("ascii").rstrip("=")
        key = f"int_{raw}"

        s = list(scopes) if scopes is not None else [cls.Scope.WORKLIST_READ, cls.Scope.RESULT_WRITE]

        obj = cls.objects.create(
            tenant=equipment.tenant,
            equipment=equipment,
            label=label or "",
            key_prefix=key[:12],
            key_last4=key[-4:],
            key_hash=_hash_key(key),
            scopes=s,
            active=True,
        )
        return obj, key

    def clean(self):
        super().clean()

        if self.revoked_at and self.active:
            raise ValidationError({"active": "Credencial revogada não pode ficar active."})

        if self.scopes is None:
            self.scopes = []

    def revoke(self):
        if self.revoked_at:
            return
        self.active = False
        self.revoked_at = timezone.now()
        self.save(update_fields=["active", "revoked_at"])

    def has_scope(self, scope: str) -> bool:
        return scope in (self.scopes or [])

    @classmethod
    def validate_key(cls, raw_key: str) -> "IntegrationCredential | None":
        if not raw_key:
            return None
        h = _hash_key(raw_key)
        return cls.objects.filter(key_hash=h, active=True, deleted=False).select_related("equipment").first()


IntegrationCredential.gerar = IntegrationCredential.generate
IntegrationCredential.revogar = IntegrationCredential.revoke
IntegrationCredential.possui_scope = IntegrationCredential.has_scope
IntegrationCredential.validar_key = IntegrationCredential.validate_key
