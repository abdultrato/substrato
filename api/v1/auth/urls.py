from django.urls import re_path

from .views import (
	LoginView,
	LogoutView,
	PasswordChangeView,
	PasswordResetConfirmView,
	PasswordResetRequestView,
	RefreshView,
	UserView,
	)

urlpatterns = [
	# Next.js normaliza URLs sem barra no final por padrao (trailingSlash=false).
	# Aceitar com/sem "/" evita RuntimeError do Django (APPEND_SLASH) em requests POST.
	re_path(r"^login/?$", LoginView.as_view(), name="auth-login"),
	re_path(r"^refresh/?$", RefreshView.as_view(), name="auth-refresh"),
	re_path(r"^logout/?$", LogoutView.as_view(), name="auth-logout"),
	re_path(r"^user/?$", UserView.as_view(), name="auth-user"),
	
	# Password reset (reposicao) + change (definicoes)
	re_path(r"^password-reset/request/?$", PasswordResetRequestView.as_view(), name="auth-password-reset-request"),
	re_path(r"^password-reset/confirm/?$", PasswordResetConfirmView.as_view(), name="auth-password-reset-confirm"),
	re_path(r"^password/change/?$", PasswordChangeView.as_view(), name="auth-password-change"),
]
