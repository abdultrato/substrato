import hashlib
import hmac
import json
import logging

from django.conf import settings
from django.core.cache import cache
from rest_framework.decorators import action
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.viewsets import ViewSet

from .adapters import dispatch_webhook_event

logger = logging.getLogger("metrics")


class WebhookViewSet(ViewSet):
    """
    Endpoint universal para webhooks externos.

    URL:
        /api/integrations/webhooks/<provider>/
    """

    permission_classes = [AllowAny]
    authentication_classes = []

    # Restringe provedores para evitar superfície aberta.
    ALLOWED_PROVIDERS = {"stripe", "mpesa", "emola", "mkesh", "paypal"}

    # =====================================================
    # MAIN ENTRYPOINT
    # =====================================================

    @action(detail=False, methods=["post"], url_path=r"(?P<provider>[^/.]+)")
    def receive(self, request, provider=None):
        provider = (provider or "").lower().strip()

        if provider not in self.ALLOWED_PROVIDERS:
            logger.warning("Webhook provider não permitido: %s", provider)
            return Response({"detail": "provider not allowed"}, status=404)

        try:
            payload = request.data
        except Exception:
            payload = json.loads(request.body.decode("utf-8"))

        # -------------------------------------------------
        # 1️⃣ VALIDAR ASSINATURA (quando disponível)
        # -------------------------------------------------

        if not self._verify_signature(provider, request):
            logger.warning("Webhook assinatura inválida ou segredo ausente: %s", provider)
            return Response({"detail": "invalid signature"}, status=400)

        # -------------------------------------------------
        # 2️⃣ IDEMPOTÊNCIA (anti-duplicação)
        # -------------------------------------------------

        event_id = self._extract_event_id(provider, payload)

        if event_id:
            cache_key = f"webhook:{provider}:{event_id}"

            if cache.get(cache_key):
                logger.info("Evento duplicado ignorado: %s %s", provider, event_id)
                return Response({"status": "duplicate ignored"})

            cache.set(cache_key, True, timeout=60 * 60)

        # -------------------------------------------------
        # 3️⃣ DISPATCH EVENT
        # -------------------------------------------------

        logger.info("Webhook recebido: %s", provider)
        dispatch_webhook_event(provider, payload)

        return Response({"status": "received"})

    # =====================================================
    # SIGNATURE VALIDATION
    # =====================================================

    def _verify_signature(self, provider, request):
        """
        Verifica assinatura HMAC quando suportado.
        """

        secret_map = {
            "stripe": getattr(settings, "STRIPE_WEBHOOK_SECRET", None),
            "mpesa": getattr(settings, "MPESA_WEBHOOK_SECRET", None),
            "emola": getattr(settings, "MPESA_WEBHOOK_SECRET", None),
            "mkesh": getattr(settings, "MPESA_WEBHOOK_SECRET", None),
            "paypal": getattr(settings, "PAYPAL_WEBHOOK_SECRET", None),
        }

        secret = secret_map.get(provider)

        # Se o provedor exige segredo e não está configurado, rejeita.
        if secret is None or secret == "":
            return False

        signature = request.headers.get("X-Signature")

        if not signature:
            return False

        expected = hmac.new(
            secret.encode(),
            request.body,
            hashlib.sha256,
        ).hexdigest()

        return hmac.compare_digest(expected, signature)

    # =====================================================
    # EVENT ID EXTRACTION
    # =====================================================

    def _extract_event_id(self, provider, payload):
        """
        Extrai ID único do evento para evitar duplicação.
        """

        if provider == "stripe":
            return payload.get("id")

        if provider in ["mpesa", "emola", "mkesh"]:
            return payload.get("transaction_id")

        if provider == "paypal":
            return payload.get("resource", {}).get("id")

        return None
