import logging

from django.db import IntegrityError, transaction
from django.utils import timezone

logger = logging.getLogger("ids")


def generate_code(prefix: str, model, attempts: int = 5) -> str:
    """
    Generates a unique code with a date suffix and collision retries.
    """

    today = timezone.now().strftime("%Y%m%d")

    for attempt in range(attempts):
        try:
            with transaction.atomic():
                last_object = (
                    model.all_objects.select_for_update(skip_locked=True)
                    .filter(id_custom__startswith=f"{prefix}{today}")
                    .order_by("-id_custom")
                    .first()
                )

                sequence_number = 1

                if last_object and last_object.id_custom:
                    try:
                        sequence_number = int(last_object.id_custom[-4:]) + 1
                    except (ValueError, TypeError):
                        sequence_number = 1

                code = f"{prefix}{today}{sequence_number:04d}"

                if not model.all_objects.filter(id_custom=code).exists():
                    return code

        except IntegrityError:
            logger.warning(
                "codigo_colisao",
                extra={"prefixo": prefix, "tentativa": attempt},
            )

    raise RuntimeError("Failed to generate a unique code.")


gerar_codigo = generate_code
