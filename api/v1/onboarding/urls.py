from django.urls import re_path

from .views import CheckoutView, PaymentWebhookView, PublicPlansView, SignupView

urlpatterns = [
    re_path(r"^plans/?$", PublicPlansView.as_view(), name="onboarding-plans"),
    re_path(r"^signup/?$", SignupView.as_view(), name="onboarding-signup"),
    re_path(r"^checkout/?$", CheckoutView.as_view(), name="onboarding-checkout"),
    re_path(r"^webhooks/payments/?$", PaymentWebhookView.as_view(), name="payments-webhook"),
]
