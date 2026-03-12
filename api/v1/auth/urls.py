from django.urls import path

from .views import LoginView, LogoutView, RefreshView, UserView

urlpatterns = [
	path("login/", LoginView.as_view(), name="auth-login"),
	path("refresh/", RefreshView.as_view(), name="auth-refresh"),
	path("logout/", LogoutView.as_view(), name="auth-logout"),
	path("user/", UserView.as_view(), name="auth-user"),
]

