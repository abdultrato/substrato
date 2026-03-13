from django.urls import re_path

from .views import LoginView, LogoutView, RefreshView, UserView

urlpatterns = [
	# Next.js normaliza URLs sem barra no final por padrao (trailingSlash=false).
	# Aceitar com/sem "/" evita RuntimeError do Django (APPEND_SLASH) em requests POST.
	re_path(r"^login/?$", LoginView.as_view(), name="auth-login"),
	re_path(r"^refresh/?$", RefreshView.as_view(), name="auth-refresh"),
	re_path(r"^logout/?$", LogoutView.as_view(), name="auth-logout"),
	re_path(r"^user/?$", UserView.as_view(), name="auth-user"),
]
