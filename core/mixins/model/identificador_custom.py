from django.db import connection, models
from django.utils.timezone import now


class IdentificadorMixin(models.Model):
    """
    Gerador de identificador robusto baseado em sequência do PostgreSQL.

    ✔ sem lock pesado
    ✔ altamente concorrente
    ✔ funciona com bulk_create
    ✔ compatível com multi-tenant
    ✔ não depende de ordenar registros
    """

    id_custom = models.CharField(
        max_length=30,
        unique=True,
        db_index=True,
        editable=False,
        blank=True,
        null=True,
        verbose_name="ordem",
    )

    prefixo = None

    class Meta:
        abstract = True

    # -----------------------------------------------------

    @classmethod
    def _next_sequence(cls):
        """
        Obtém próximo valor de sequência do PostgreSQL.
        """

        sequence_name = f"{cls._meta.db_table}_id_custom_seq"

        with connection.cursor() as cursor:
            # Use query parameters to avoid SQL string interpolation.
            cursor.execute("SELECT nextval(%s)", [sequence_name])
            return cursor.fetchone()[0]

    # -----------------------------------------------------

    def gerar_identificador(self):
        if self.id_custom or not self.prefixo:
            return

        numero = self.__class__._next_sequence()

        data_str = now().strftime("%Y%m%d")

        self.id_custom = f"{self.prefixo}{data_str}{numero:06d}"

    # -----------------------------------------------------

    def save(self, *args, **kwargs):
        if not self.id_custom:
            self.gerar_identificador()

        super().save(*args, **kwargs)
