"""Serializers do onboarding self-service (signup/checkout/planos públicos)."""

from django.contrib.auth import get_user_model
from rest_framework import serializers

from apps.tenants.models.subscription import TenantSubscription
from apps.tenants.models.subscription_plan import SubscriptionPlan

User = get_user_model()


class PublicPlanSerializer(serializers.ModelSerializer):
    """Plano exposto publicamente na página de preços (sem dados internos)."""

    class Meta:
        model = SubscriptionPlan
        fields = [
            "id", "custom_id", "name", "description", "type", "monthly_price",
            "user_limit", "monthly_request_limit", "priority_support", "allows_multi_unit",
        ]


class SignupSerializer(serializers.Serializer):
    company_name = serializers.CharField(max_length=255)
    admin_name = serializers.CharField(max_length=150, required=False, allow_blank=True, default="")
    email = serializers.EmailField()
    password = serializers.CharField(min_length=8, write_only=True)
    plan_id = serializers.IntegerField(required=False)
    plan_type = serializers.ChoiceField(choices=SubscriptionPlan.PlanType.choices, required=False)
    cycle = serializers.ChoiceField(
        choices=TenantSubscription.BillingCycle.choices,
        required=False, default=TenantSubscription.BillingCycle.MONTHLY)

    def validate_email(self, value):
        if User.all_objects.filter(email__iexact=value).exists():
            raise serializers.ValidationError("Já existe uma conta com este e-mail.")
        return value

    def validate(self, attrs):
        plan = None
        if attrs.get("plan_id"):
            plan = SubscriptionPlan.objects.filter(id=attrs["plan_id"], active=True).first()
            if plan is None:
                raise serializers.ValidationError({"plan_id": "Plano inválido ou inativo."})
        attrs["plan"] = plan
        return attrs


class CheckoutSerializer(serializers.Serializer):
    gateway = serializers.CharField(required=False, allow_blank=True)
    phone = serializers.CharField(required=False, allow_blank=True)
    idempotency_key = serializers.CharField(required=False, allow_blank=True)
