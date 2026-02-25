from django.urls import path

from .models.password_reset import (
    PasswordResetConfirmView,
    PasswordResetRequestView,
)

urlpatterns = [
    path(
        "password-reset/",
        PasswordResetRequestView.as_view(),
        name="password-reset-request",
    ),
    path(
        "password-reset/confirm/",
        PasswordResetConfirmView.as_view(),
        name="password-reset-confirm",
    ),
]
