import logging
import time

logger = logging.getLogger("api")


class APILoggingMiddleware:
    """
    Logging de requisições API.

    ✔ tempo de resposta
    ✔ status code
    ✔ método e path
    """

    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        start = time.time()

        response = self.get_response(request)

        duration = round((time.time() - start) * 1000, 2)

        logger.info(
            "%s %s %s %sms",
            request.method,
            request.get_full_path(),
            response.status_code,
            duration,
        )

        return response


def enrich_log(record, request):
    record.tenant_id = getattr(request, "inquilino", None)
