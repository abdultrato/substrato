from django.urls import path, include, re_path
from rest_framework.routers import DefaultRouter
from api.v1.roteamento.rotas import registrar_rotas

from api.v1.dashboard.views import DashboardStatsView
from api.v1.integracoes_equipamentos.views import (
	EquipamentoResultadosInboxView,
	EquipamentoWorklistView,
)

router = DefaultRouter()
# Next.js remove a "/" final por padrao. Tornar a "/" opcional evita erros
# em POST/PUT/PATCH (Django nao consegue redirecionar mantendo o body).
router.trailing_slash = "/?"
registrar_rotas(router)

urlpatterns = [
		path("auth/", include("api.v1.auth.urls")),
		re_path(r"^dashboard/stats/?$", DashboardStatsView.as_view(), name="dashboard-stats"),
		# Integrações de equipamentos (worklist + inbox HTTP).
		re_path(
				r"^integracoes/equipamentos/(?P<equipamento_id_custom>[^/]+)/worklist/?$",
				EquipamentoWorklistView.as_view(),
				name="integracoes-equipamentos-worklist",
				),
		re_path(
				r"^integracoes/equipamentos/(?P<equipamento_id_custom>[^/]+)/resultados/?$",
				EquipamentoResultadosInboxView.as_view(),
				name="integracoes-equipamentos-resultados",
				),
		path("", include(router.urls)),
		]
