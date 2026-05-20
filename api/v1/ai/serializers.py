from __future__ import annotations

from rest_framework import serializers

from apps.ai_assistant.models import AiMessage, AiSession, AiSuggestedAction


class AiChatRequestSerializer(serializers.Serializer):
    session_id = serializers.IntegerField(required=False, allow_null=True)
    message = serializers.CharField(max_length=8000, trim_whitespace=True)
    active_module = serializers.CharField(max_length=80, required=False, allow_blank=True, default="")
    language = serializers.ChoiceField(choices=("pt", "en"), required=False, default="pt")
    context = serializers.JSONField(required=False, default=dict)

    def validate_context(self, value):
        if value in (None, ""):
            return {}
        if not isinstance(value, dict):
            raise serializers.ValidationError("context deve ser um objecto JSON.")
        return value


class AiSessionSerializer(serializers.ModelSerializer):
    message_count = serializers.IntegerField(read_only=True)

    class Meta:
        model = AiSession
        fields = [
            "id",
            "custom_id",
            "title",
            "language",
            "active_module",
            "status",
            "last_message_at",
            "created_at",
            "updated_at",
            "message_count",
        ]


class AiMessageSerializer(serializers.ModelSerializer):
    class Meta:
        model = AiMessage
        fields = [
            "id",
            "custom_id",
            "role",
            "content_redacted",
            "metadata",
            "created_at",
        ]


class AiSessionDetailSerializer(AiSessionSerializer):
    messages = AiMessageSerializer(many=True, read_only=True)

    class Meta(AiSessionSerializer.Meta):
        fields = AiSessionSerializer.Meta.fields + ["messages"]


class AiActionConfirmSerializer(serializers.Serializer):
    confirmation_text = serializers.CharField(max_length=500, required=False, allow_blank=True, default="")


class AiSuggestedActionSerializer(serializers.ModelSerializer):
    href = serializers.SerializerMethodField()

    class Meta:
        model = AiSuggestedAction
        fields = [
            "id",
            "custom_id",
            "action_type",
            "status",
            "requires_confirmation",
            "confirmation_summary",
            "result_summary",
            "result_href",
            "href",
            "created_at",
            "confirmed_at",
            "executed_at",
        ]

    def get_href(self, obj: AiSuggestedAction) -> str:
        payload = obj.payload or {}
        return str(payload.get("href") or obj.result_href or "")
