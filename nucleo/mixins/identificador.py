from django.db import IntegrityError, models, transaction
from nucleo.identidade.gerar_codigo import gerar_codigo


class IdentificadorMixin(models.Model):
    """
    Mixin para geração automática de id_custom.

    Requisitos:
    - Definir atributo `prefixo` na classe concreta.
    """

    prefixo: str | None = None

    id_custom = models.CharField(
        max_length=20,
        unique=True,
        editable=False,
        db_index=True,
        verbose_name="ordem",
    )

    MAX_TENTATIVAS = 20

    class Meta:
        abstract = True

    def _gerar_id(self) -> str:
        """
        Gera novo identificador baseado no prefixo.
        """
        return gerar_codigo(
            prefixo=self.prefixo,
            modelo=self.__class__,
        )

    def save(self, *args, **kwargs):
        # Se já existe PK e id_custom, apenas salva normalmente
        if self.pk and self.id_custom:
            return super().save(*args, **kwargs)

        if not self.prefixo:
            raise ValueError(
                f"{self.__class__.__name__} precisa definir atributo 'prefixo'."
            )

        for _ in range(self.MAX_TENTATIVAS):
            try:
                with transaction.atomic():
                    if not self.id_custom:
                        self.id_custom = self._gerar_id()

                    return super().save(*args, **kwargs)

            except IntegrityError:
                # colisão de código
                self.id_custom = None

        raise IntegrityError(
            f"Falha ao gerar id_custom único para {self.__class__.__name__}"
        )
