from django.urls import path

from .views import (
    AiAssistantActionCancelView,
    AiAssistantActionConfirmView,
    AiAssistantChatView,
    AiAssistantSessionDetailView,
    AiAssistantSessionsView,
    AiAssistantToolsView,
)

urlpatterns = [
    path("assistant/chat/", AiAssistantChatView.as_view(), name="ai-assistant-chat"),
    path("assistant/sessions/", AiAssistantSessionsView.as_view(), name="ai-assistant-sessions"),
    path("assistant/sessions/<int:session_id>/", AiAssistantSessionDetailView.as_view(), name="ai-assistant-session-detail"),
    path("assistant/tools/", AiAssistantToolsView.as_view(), name="ai-assistant-tools"),
    path("assistant/actions/<int:action_id>/confirm/", AiAssistantActionConfirmView.as_view(), name="ai-assistant-action-confirm"),
    path("assistant/actions/<int:action_id>/cancel/", AiAssistantActionCancelView.as_view(), name="ai-assistant-action-cancel"),
]
