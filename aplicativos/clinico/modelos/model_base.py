import logging

from django.db import IntegrityError, models, transaction
from django.utils import timezone

from .nucleo import TimeStampedModel

logger = logging.getLogger("ids")

# =========================================================
# GERADOR DE CÓDIGO (ID CUSTOM)
# =========================================================


def gerar_codigo(prefixo: str, modelo, tentativas: int = 5) -> str:
    """
    Geração robusta de código único.

    Formato:
        PREFIXO + YYYYMMDD + contador incremental

    Garantias:
    ✔ seguro contra concorrência
    ✔ tolerante a falhas
    ✔ evita colisões
    ✔ pronto para múltiplos workers
    """

    hoje = timezone.now().strftime("%Y%m%d")

    for tentativa in range(tentativas):
        try:
            with transaction.atomic():
                ultimo = (
                    modelo.objects.select_for_update(skip_locked=True)
                    .filter(id_custom__startswith=f"{prefixo}{hoje}")
                    .order_by("-id_custom")
                    .first()
                )

                if ultimo and ultimo.id_custom:
                    try:
                        numero = int(ultimo.id_custom[-4:]) + 1
                    except (ValueError, TypeError):
                        numero = 1
                else:
                    numero = 1

                codigo = f"{prefixo}{hoje}{numero:04d}"

                # verificação adicional
                if not modelo.objects.filter(id_custom=codigo).exists():
                    return codigo

        except IntegrityError:
            logger.warning(
                "codigo_colisao",
                extra={"prefixo": prefixo, "tentativa": tentativa},
            )

    raise RuntimeError("Falha ao gerar código único")


# =========================================================
# MIXIN: ID CUSTOM
# =========================================================


class CustomIDMixin(models.Model):
    """
    Mixin abstrato para gerar id_custom automaticamente.

    Regras:
    - A classe filha define: prefixo = "PAC" / "REQ" / "FAT"
    - id_custom é gerado apenas na criação
    """

    prefixo: str | None = None

    id_custom = models.CharField(
        "Código",
        max_length=20,
        unique=True,
        editable=False,
        db_index=True,
    )

    class Meta:
        abstract = True

    def save(self, *args, **kwargs):
        """
        Gera id_custom automaticamente no primeiro save.
        Seguro contra concorrência.
        """
        if self.id_custom:
            return super().save(*args, **kwargs)

        if not self.prefixo:
            raise ValueError(f"{self.__class__.__name__} precisa definir prefixo")

        for tentativa in range(20):
            try:
                with transaction.atomic():
                    self.id_custom = gerar_codigo(self.prefixo, self.__class__)
                    return super().save(*args, **kwargs)

            except IntegrityError:
                logger.warning(
                    "id_collision_retry",
                    extra={
                        "model": self.__class__.__name__,
                        "tentativa": tentativa,
                    },
                )
                self.id_custom = None

        raise IntegrityError(
            f"Falha ao gerar id_custom único para {self.__class__.__name__}"
        )


# =========================================================
# MIXIN: ATIVO / INATIVO
# =========================================================


class AtivoModel(models.Model):
    """
    Mixin de status ativo/inativo.
    """

    ativo = models.BooleanField("Ativo", default=True)

    class Meta:
        abstract = True


# =========================================================
# BASE MODEL ENTERPRISE
# =========================================================


class BaseModel(TimeStampedModel):
    """
    Base genérica para padronização dos modelos.

    Benefícios:
    ✔ timestamps automáticos
    ✔ consistência do domínio
    ✔ ponto central para auditoria futura
    ✔ extensível para multi-tenant / soft delete
    """

    class Meta:
        abstract = True
