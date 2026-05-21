from django.contrib import admin

from .models import (
    AiInvestigation,
    AiKnowledgeEntry,
    AiMessage,
    AiOperationalTask,
    AiPolicyEvent,
    AiSession,
    AiSuggestedAction,
    AiToolCall,
)


class AiBaseAdmin(admin.ModelAdmin):
    readonly_fields = ("custom_id", "created_at", "updated_at", "created_by", "updated_by")
    list_filter = ("deleted",)
    search_fields = ("custom_id",)
    ordering = ("-created_at", "-id")


@admin.register(AiSession)
class AiSessionAdmin(AiBaseAdmin):
    list_display = ("created_at", "custom_id", "user", "language", "active_module", "status", "last_message_at")
    list_filter = ("language", "status", "active_module", "deleted")
    search_fields = ("custom_id", "title", "user__username", "user__email")


@admin.register(AiMessage)
class AiMessageAdmin(AiBaseAdmin):
    list_display = ("created_at", "custom_id", "session", "role", "user")
    list_filter = ("role", "deleted")
    search_fields = ("custom_id", "content_redacted", "session__custom_id", "user__username")


@admin.register(AiToolCall)
class AiToolCallAdmin(AiBaseAdmin):
    list_display = ("created_at", "custom_id", "tool_name", "mode", "status", "duration_ms", "session")
    list_filter = ("tool_name", "mode", "status", "deleted")
    search_fields = ("custom_id", "tool_name", "output_summary", "error_message", "session__custom_id")


@admin.register(AiSuggestedAction)
class AiSuggestedActionAdmin(AiBaseAdmin):
    list_display = (
        "created_at",
        "custom_id",
        "action_type",
        "status",
        "requires_confirmation",
        "created_by",
        "confirmed_by",
    )
    list_filter = ("action_type", "status", "requires_confirmation", "deleted")
    search_fields = ("custom_id", "action_type", "confirmation_summary", "result_summary", "session__custom_id")


@admin.register(AiOperationalTask)
class AiOperationalTaskAdmin(AiBaseAdmin):
    list_display = (
        "created_at",
        "custom_id",
        "title",
        "module_key",
        "assigned_group",
        "priority",
        "status",
        "created_by",
    )
    list_filter = ("module_key", "assigned_group", "priority", "status", "deleted")
    search_fields = ("custom_id", "title", "description", "source_reference", "session__custom_id")


@admin.register(AiInvestigation)
class AiInvestigationAdmin(AiBaseAdmin):
    list_display = (
        "created_at",
        "custom_id",
        "title",
        "intent",
        "status",
        "confidence_score",
        "created_by",
    )
    list_filter = ("intent", "status", "deleted")
    search_fields = ("custom_id", "title", "question", "result_summary", "session__custom_id", "created_by__username")


@admin.register(AiKnowledgeEntry)
class AiKnowledgeEntryAdmin(AiBaseAdmin):
    list_display = (
        "created_at",
        "custom_id",
        "title",
        "category",
        "module_key",
        "status",
        "source",
        "priority",
    )
    list_filter = ("status", "source", "category", "module_key", "deleted")
    search_fields = ("custom_id", "slug", "title", "answer_pt", "answer_en")
    readonly_fields = (*AiBaseAdmin.readonly_fields,)
    fieldsets = (
        (
            "Identificação",
            {
                "fields": (
                    "custom_id",
                    "tenant",
                    "slug",
                    "title",
                    "category",
                    "module_key",
                    "status",
                    "source",
                    "priority",
                )
            },
        ),
        (
            "Perguntas e resposta",
            {
                "fields": (
                    "questions_pt",
                    "questions_en",
                    "aliases_pt",
                    "aliases_en",
                    "semantic_terms",
                    "answer_pt",
                    "answer_en",
                    "follow_ups_pt",
                    "follow_ups_en",
                )
            },
        ),
        ("Classificação", {"fields": ("tags", "metadata")}),
        ("Auditoria", {"fields": ("created_at", "updated_at", "created_by", "updated_by")}),
    )


@admin.register(AiPolicyEvent)
class AiPolicyEventAdmin(AiBaseAdmin):
    list_display = ("created_at", "custom_id", "severity", "policy_key", "blocked", "user", "session")
    list_filter = ("severity", "policy_key", "blocked", "deleted")
    search_fields = ("custom_id", "policy_key", "reason", "user__username", "session__custom_id")
