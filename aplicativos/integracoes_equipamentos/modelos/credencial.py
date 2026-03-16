import base64
from collections.abc import Iterable
import hashlib
import os

from django.conf import settings
from django.core.exceptions import ValidationError
from django.db import models
from django.utils import timezone

from nucleo.modelos.base import NoNameCoreModel


def _hash_key(raw_key: str) -> str:
    """
    Hash determinístico (para lookup) com "pepper" do servidor.
    Não é um hash de senha; é para identificar a credencial rapidamente.
    """

    pepper = getattr(settings, "SECRET_KEY", "") or ""
    data = (pepper + raw_key).encode("utf-8")
    return hashlib.sha256(data).hexdigest()


class IntegracaoCredencial(NoNameCoreModel):
    prefixo = "KEY"

    class Scope(models.TextChoices):
        WORKLIST_READ = "WORKLIST_READ", "Ler worklist"
        RESULT_WRITE = "RESULT_WRITE", "Enviar resultados"

    equipamento = models.ForeignKey(
        "integracoes_equipamentos.IntegracaoEquipamento",
        on_delete=models.CASCADE,
        related_name="credenciais",
        db_index=True,
    )

    label = models.CharField(max_length=120, blank=True, default="", db_index=True)

    # Ajuda a identificar sem expor chave.
    key_prefix = models.CharField(max_length=12, blank=True, default="", db_index=True)
    key_last4 = models.CharField(max_length=4, blank=True, default="")

    key_hash = models.CharField(max_length=64, unique=True, db_index=True, editable=False)

    scopes = models.JSONField(default=list, blank=True)

    ativo = models.BooleanField(default=True, db_index=True)
    revogada_em = models.DateTimeField(null=True, blank=True)

    class Meta:
        verbose_name = "Credencial (Equipamento)"
        verbose_name_plural = "Credenciais (Equipamentos)"
        ordering = ["-criado_em"]
        indexes = [
            models.Index(fields=["inquilino", "equipamento"]),
            models.Index(fields=["equipamento", "ativo"]),
        ]

    @classmethod
    def gerar(
        cls, *, equipamento, label: str = "", scopes: Iterable[str] | None = None
    ) -> tuple["IntegracaoCredencial", str]:
        """
        Cria credencial e retorna a chave em texto plano (somente uma vez).
        """

        raw = base64.urlsafe_b64encode(os.urandom(32)).decode("ascii").rstrip("=")
        key = f"int_{raw}"

        s = list(scopes) if scopes is not None else [cls.Scope.WORKLIST_READ, cls.Scope.RESULT_WRITE]

        obj = cls.objects.create(
            inquilino=equipamento.inquilino,
            equipamento=equipamento,
            label=label or "",
            key_prefix=key[:12],
            key_last4=key[-4:],
            key_hash=_hash_key(key),
            scopes=s,
            ativo=True,
        )
        return obj, key

    def clean(self):
        super().clean()

        if self.revogada_em and self.ativo:
            raise ValidationError({"ativo": "Credencial revogada não pode ficar ativa."})

        if self.scopes is None:
            self.scopes = []

    def revogar(self):
        if self.revogada_em:
            return
        self.ativo = False
        self.revogada_em = timezone.now()
        self.save(update_fields=["ativo", "revogada_em"])

    def possui_scope(self, scope: str) -> bool:
        return scope in (self.scopes or [])

    @classmethod
    def validar_chave(cls, raw_key: str) -> "IntegracaoCredencial | None":
        if not raw_key:
            return None
        h = _hash_key(raw_key)
        return cls.objects.filter(key_hash=h, ativo=True, deletado=False).select_related("equipamento").first()
