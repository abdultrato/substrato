import logging
from django.db import IntegrityError, transaction
from django.utils import timezone

logger = logging.getLogger("ids")


def gerar_codigo(prefixo: str, modelo, tentativas: int = 5) -> str:
    """
    Geração robusta de código único.
    """

    hoje = timezone.now().strftime("%Y%m%d")

    for tentativa in range(tentativas):
        try:
            with transaction.atomic():
                ultimo = (
                    modelo.all_objects.select_for_update(skip_locked=True)
                    .filter(id_custom__startswith=f"{prefixo}{hoje}")
                    .order_by("-id_custom")
                    .first()
                )

                numero = 1

                if ultimo and ultimo.id_custom:
                    try:
                        numero = int(ultimo.id_custom[-4:]) + 1
                    except (ValueError, TypeError):
                        numero = 1

                codigo = f"{prefixo}{hoje}{numero:04d}"

                if not modelo.all_objects.filter(id_custom=codigo).exists():
                    return codigo

        except IntegrityError:
            logger.warning(
                "codigo_colisao",
                extra={"prefixo": prefixo, "tentativa": tentativa},
            )

    raise RuntimeError("Falha ao gerar código único")
