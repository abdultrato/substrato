from django.urls import path, include
from .rotas import router

urlpatterns = [
    path("", include(router.urls)),
    path("api/", include("api.saude")),
    path("api/v1/", include("api.v1.urls")),
]
from django.urls import path
from rest_framework_simplejwt.views import (
    TokenObtainPairView,
    TokenRefreshView,
)

urlpatterns = [
    path("login/", TokenObtainPairView.as_view(), name="login"),
    path("refresh/", TokenRefreshView.as_view(), name="token_refresh"),
]
from django.urls import include, path

from backend.frontend.api.viewsets.db import DatabaseStatusView
from backend.frontend.api.viewsets.docs import APIDocsView
from backend.frontend.api.viewsets.email_test import EmailTestView
from backend.frontend.api.viewsets.env import EnvironmentView
from backend.frontend.api.viewsets.notifications import NotificationsView
from backend.frontend.api.viewsets.routes import RoutesListView
from backend.frontend.api.viewsets.search import GlobalSearchView
from frontend.api.views.activity import RecentActivityView
from frontend.api.views.app_info import InstalledAppsView
from frontend.api.views.config import ConfigChoicesView
from frontend.api.views.dashboard import DashboardView
from frontend.api.views.export import ExportPacientesCSV, ExportRequisicoesCSV
from frontend.api.views.permissions import GroupsPermissionsView

urlpatterns = [
    path("apps/", InstalledAppsView.as_view()),
    path("email/test/", EmailTestView.as_view()),
    path("docs/", APIDocsView.as_view()),
    path("database/status/", DatabaseStatusView.as_view()),
    path("routes/", RoutesListView.as_view()),
    path("environment/", EnvironmentView.as_view()),
    path("dashboard/", DashboardView.as_view()),
    path("activity/recent/", RecentActivityView.as_view()),
    path("export/pacientes/", ExportPacientesCSV.as_view()),
    path("export/requisicoes/", ExportRequisicoesCSV.as_view()),
    path("config/choices/", ConfigChoicesView.as_view()),
    path("auth/", include("frontend.api.urls_auth")),
    path("v1/", include(("frontend.api.router", "api"), namespace="v1")),
    path("search/", GlobalSearchView.as_view()),
    path("notifications/", NotificationsView.as_view()),
    path("permissions/groups/", GroupsPermissionsView.as_view()),
]
