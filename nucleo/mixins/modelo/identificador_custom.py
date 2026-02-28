from django.db import models


class IdentificadorCustomMixin(models.Model):
    """
    Gera id_custom automaticamente baseado em prefixo.

    ✔ único
    ✔ sequencial por data
    ✔ seguro para alta concorrência
    ✔ compatível com soft delete (usa all_objects)
    """

    id_custom = models.CharField(
        max_length=30,
        unique=True,
        db_index=True,
        blank=True,
        null=True,
        verbose_name="ordem",
    )

    prefixo = None  # deve ser definido no model concreto

    class Meta:
        abstract = True

    def save(self, *args, **kwargs):
        if not self.id_custom and self.prefixo:
            from django.db import transaction
            from django.utils.timezone import now

            with transaction.atomic():
                data_str = now().strftime("%Y%m%d")

                ultimo = (
                    self.__class__.all_objects.select_for_update()
                    .filter(id_custom__startswith=f"{self.prefixo}{data_str}")
                    .order_by("-id_custom")
                    .first()
                )

                sequencia = int(ultimo.id_custom[-4:]) + 1 if ultimo else 1

                self.id_custom = f"{self.prefixo}{data_str}{sequencia:04d}"

        super().save(*args, **kwargs)
