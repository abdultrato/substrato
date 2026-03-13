from django.urls import path, include
from rest_framework.routers import DefaultRouter
from api.v1.roteamento.rotas import registrar_rotas

from api.v1.dashboard.views import DashboardStatsView
from api.v1.integracoes_equipamentos.views import (
	EquipamentoResultadosInboxView,
	EquipamentoWorklistView,
)

router = DefaultRouter()
registrar_rotas(router)

urlpatterns = [
		path("auth/", include("api.v1.auth.urls")),
		path("dashboard/stats/", DashboardStatsView.as_view(), name="dashboard-stats"),
		# Integrações de equipamentos (worklist + inbox HTTP).
		path(
				"integracoes/equipamentos/<str:equipamento_id_custom>/worklist/",
				EquipamentoWorklistView.as_view(),
				name="integracoes-equipamentos-worklist",
				),
		path(
				"integracoes/equipamentos/<str:equipamento_id_custom>/resultados/",
				EquipamentoResultadosInboxView.as_view(),
				name="integracoes-equipamentos-resultados",
				),
		path("", include(router.urls)),
		]
