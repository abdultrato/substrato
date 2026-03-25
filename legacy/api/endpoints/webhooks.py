import hashlib
import hmac
import json
import logging

from django.conf import settings
from django.core.cache import cache
from events.publicador import publicar_evento
from rest_framework.decorators import action
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.viewsets import ViewSet

logger = logging.getLogger("webhooks")


class WebhookViewSet(ViewSet):
    permission_classes = [AllowAny]
    authentication_classes = []

    @action(detail=False, methods=["post"], url_path=r"(?P<provider>[^/.]+)")
    def receive(self, request, provider=None):

        provider = provider.lower()

        payload = request.data or json.loads(request.body.decode())

        if not self._verify_signature(provider, request):
            return Response({"detail": "invalid signature"}, status=400)

        event_id = self._extract_event_id(provider, payload)

        if event_id:
            cache_key = f"webhook:{provider}:{event_id}"

            if cache.get(cache_key):
                return Response({"status": "duplicate ignored"})

            cache.set(cache_key, True, timeout=3600)

        publicar_evento("PAYMENT_RECEIVED", payload)

        return Response({"status": "received"})

    def _verify_signature(self, provider, request):

        secret_map = {
            "stripe": getattr(settings, "STRIPE_WEBHOOK_SECRET", None),
            "mpesa": getattr(settings, "MPESA_WEBHOOK_SECRET", None),
        }

        secret = secret_map.get(provider)

        if not secret:
            return True

        signature = request.headers.get("X-Signature")

        if not signature:
            return False

        expected = hmac.new(
            secret.encode(),
            request.body,
            hashlib.sha256,
        ).hexdigest()

        return hmac.compare_digest(expected, signature)

    def _extract_event_id(self, provider, payload):

        if provider == "stripe":
            return payload.get("id")

        if provider in ["mpesa", "emola", "mkesh"]:
            return payload.get("transaction_id")

        if provider == "paypal":
            return payload.get("resource", {}).get("id")

        return None
