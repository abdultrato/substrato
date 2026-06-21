"""Geração de códigos incrementais únicos (custom_id) por prefixo."""

import logging

from django.db import IntegrityError, transaction

from core.identity.custom_id import generate_custom_id

logger = logging.getLogger("ids")


def generate_code(prefix: str, model, attempts: int = 5) -> str:
    """
    Generates a unique code using CONTEXT-AAAAMMDD/00000001.
    """

    for attempt in range(attempts):
        try:
            with transaction.atomic():
                code = generate_custom_id(prefix, model)

                manager = getattr(model, "all_objects", None) or model._default_manager
                if not manager.filter(custom_id=code).exists():
                    return code

        except IntegrityError:
            logger.warning(
                "code_colisao",
                extra={"prefix": prefix, "tentativa": attempt},
            )

    raise RuntimeError("Failed to generate a unique code.")


__all__ = ["generate_code"]
