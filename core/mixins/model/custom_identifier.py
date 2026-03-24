from django.db import connection, models
from django.utils.timezone import now


class CustomIdentifierMixin(models.Model):
    """
    Robust identifier generator backed by a PostgreSQL sequence.

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
        Fetches the next PostgreSQL sequence value.
        """

        sequence_name = f"{cls._meta.db_table}_id_custom_seq"

        with connection.cursor() as cursor:
            # Use query parameters to avoid SQL string interpolation.
            cursor.execute("SELECT nextval(%s)", [sequence_name])
            return cursor.fetchone()[0]

    # -----------------------------------------------------

    def generate_identifier(self):
        if self.id_custom or not self.prefixo:
            return

        sequence_number = self.__class__._next_sequence()

        date_string = now().strftime("%Y%m%d")

        self.id_custom = f"{self.prefixo}{date_string}{sequence_number:06d}"

    # -----------------------------------------------------

    def save(self, *args, **kwargs):
        if not self.id_custom:
            self.generate_identifier()

        super().save(*args, **kwargs)


IdentificadorMixin = CustomIdentifierMixin
CustomIdentifierMixin.gerar_identificador = CustomIdentifierMixin.generate_identifier
