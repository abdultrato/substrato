from django.db import IntegrityError, models, transaction
from nucleo.identidade.gerar_codigo import gerar_codigo


class IdentificadorCustomMixin(models.Model):
    """
    Mixin para geração automática de id_custom.
    """

    prefixo: str | None = None

    id_custom = models.CharField(
        max_length=20,
        unique=True,
        editable=False,
        db_index=True,
    )

    class Meta:
        abstract = True

    def save(self, *args, **kwargs):
        if self.id_custom:
            return super().save(*args, **kwargs)

        if not self.prefixo:
            raise ValueError(f"{self.__class__.__name__} precisa definir prefixo")

        for tentativa in range(20):
            try:
                with transaction.atomic():
                    self.id_custom = gerar_codigo(
                        self.prefixo,
                        self.__class__,
                    )
                    return super().save(*args, **kwargs)

            except IntegrityError:
                self.id_custom = None

        raise IntegrityError(
            f"Falha ao gerar id_custom único para {self.__class__.__name__}"
        )
