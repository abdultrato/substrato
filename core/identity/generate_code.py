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
                    .filter(custom_id__startswith=f"{prefix}{today}")
                    .order_by("-custom_id")
                    .first()
                )

                sequence_number = 1

                if last_object and last_object.custom_id:
                    try:
                        sequence_number = int(last_object.custom_id[-4:]) + 1
                    except (ValueError, TypeError):
                        sequence_number = 1

                code = f"{prefix}{today}{sequence_number:04d}"

                if not model.all_objects.filter(custom_id=code).exists():
                    return code

        except IntegrityError:
            logger.warning(
                "code_colisao",
                extra={"prefix": prefix, "tentativa": attempt},
            )

    raise RuntimeError("Failed to generate a unique code.")


gerar_code = generate_code
