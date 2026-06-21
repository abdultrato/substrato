"""Endpoints públicos de onboarding: planos, signup, checkout e webhook."""

from django.conf import settings
from rest_framework import status
from rest_framework.generics import ListAPIView
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.tokens import RefreshToken

from apps.tenants.models.subscription_plan import SubscriptionPlan
from apps.tenants.services.billing import BillingService
from apps.tenants.services.onboarding import OnboardingService
from security.throttling import SignupRateThrottle, WebhookRateThrottle

from .serializers import CheckoutSerializer, PublicPlanSerializer, SignupSerializer


def _subscription_payload(subscription) -> dict:
    if subscription is None:
        return {}
    return {
        "id": subscription.pk,
        "custom_id": subscription.custom_id,
        "status": subscription.status,
        "cycle": subscription.cycle,
        "plan": subscription.plan_id,
        "current_period_end": subscription.current_period_end,
        "next_billing_at": subscription.next_billing_at,
    }


class PublicPlansView(ListAPIView):
    """Lista pública de planos ativos (página de preços)."""

    permission_classes = [AllowAny]
    authentication_classes = []
    serializer_class = PublicPlanSerializer

    def get_queryset(self):
        return SubscriptionPlan.objects.filter(active=True).order_by("order", "monthly_price", "id")


class SignupView(APIView):
    """Cadastro self-service: cria tenant + admin + assinatura (trial)."""

    permission_classes = [AllowAny]
    authentication_classes = []
    throttle_classes = [SignupRateThrottle]

    def post(self, request):
        serializer = SignupSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        result = OnboardingService.register(
            company_name=data["company_name"],
            admin_email=data["email"],
            admin_password=data["password"],
            admin_name=data.get("admin_name", ""),
            plan=data.get("plan"),
            plan_type=data.get("plan_type"),
            cycle=data.get("cycle"),
        )

        refresh = RefreshToken.for_user(result["user"])
        return Response(
            {
                "tenant": {
                    "id": result["tenant"].pk,
                    "identifier": result["tenant"].identifier,
                    "name": result["tenant"].name,
                },
                "subscription": _subscription_payload(result["subscription"]),
                "access": str(refresh.access_token),
                "refresh": str(refresh),
            },
            status=status.HTTP_201_CREATED,
        )


class CheckoutView(APIView):
    """Inicia a cobrança do período corrente (converte trial em pago)."""

    permission_classes = [IsAuthenticated]

    def post(self, request):
        tenant = getattr(request.user, "tenant", None)
        subscription = tenant.get_active_subscription() if tenant else None
        if subscription is None:
            return Response(
                {"detail": "Nenhuma assinatura ativa encontrada para o tenant."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        serializer = CheckoutSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        result = OnboardingService.checkout(
            subscription,
            gateway=data.get("gateway") or None,
            phone=data.get("phone") or None,
            idempotency_key=data.get("idempotency_key") or None,
        )
        charge = result["charge"]
        return Response(
            {
                "invoice": {
                    "id": result["invoice"].pk,
                    "amount": str(result["invoice"].amount),
                    "currency": result["invoice"].currency,
                    "status": result["invoice"].status,
                },
                "charge": {
                    "id": getattr(charge, "pk", None),
                    "status": getattr(charge, "status", None),
                    "external_reference": getattr(charge, "external_reference", ""),
                },
                "subscription": _subscription_payload(result["subscription"]),
            },
            status=status.HTTP_200_OK,
        )


class PaymentWebhookView(APIView):
    """Recebe callbacks de gateways e liquida cobranças (idempotente)."""

    permission_classes = [AllowAny]
    authentication_classes = []
    throttle_classes = [WebhookRateThrottle]

    def post(self, request):
        secret = getattr(settings, "PAYMENT_WEBHOOK_SECRET", "")
        if secret and request.headers.get("X-Webhook-Secret") != secret:
            return Response({"detail": "Assinatura de webhook inválida."},
                            status=status.HTTP_403_FORBIDDEN)

        charge = BillingService.apply_webhook(request.data or {})
        return Response(
            {"processed": charge is not None, "status": getattr(charge, "status", None)},
            status=status.HTTP_200_OK,
        )
