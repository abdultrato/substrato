from django.urls import path, include
from rest_framework.routers import DefaultRouter
from api.v1.roteamento.rotas import registrar_rotas

from api.v1.dashboard.views import DashboardStatsView

router = DefaultRouter()
registrar_rotas(router)

urlpatterns = [
		path("auth/", include("api.v1.auth.urls")),
		path("dashboard/stats/", DashboardStatsView.as_view(), name="dashboard-stats"),
		path("", include(router.urls)),
		]
