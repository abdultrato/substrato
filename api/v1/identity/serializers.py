from rest_framework import serializers

from apps.identity.models.password_reset_token import PasswordResetToken
from apps.identity.models.professional_profile import ProfessionalProfile
from apps.identity.models.user import User

CORE_READ_ONLY_FIELDS = (
    "id",
    "custom_id",
    "tenant",
    "created_by",
    "updated_by",
    "created_at",
    "updated_at",
    "deleted",
    "deleted_at",
    "deleted_by",
    "version",
)


class PasswordResetTokenSerializer(serializers.ModelSerializer):
    class Meta:
        model = PasswordResetToken
        fields = "__all__"


class ProfessionalProfileSerializer(serializers.ModelSerializer):
    class Meta:
        model = ProfessionalProfile
        fields = "__all__"


class UserSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, required=False, trim_whitespace=False)

    class Meta:
        model = User
        fields = "__all__"
        read_only_fields = CORE_READ_ONLY_FIELDS

    def create(self, validated_date):
        password = validated_date.pop("password", None)
        user = super().create(validated_date)
        if password:
            user.set_password(password)
        else:
            user.set_unusable_password()
        user.save(update_fields=["password"])
        return user

    def update(self, instance, validated_date):
        password = validated_date.pop("password", None)
        user = super().update(instance, validated_date)
        if password:
            user.set_password(password)
            user.save(update_fields=["password"])
        return user


SERIALIZER_MAP = {
    "passwordresettoken": PasswordResetTokenSerializer,
    "perfilprofissional": ProfessionalProfileSerializer,
    "user": UserSerializer,
}

