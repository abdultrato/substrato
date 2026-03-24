from django.urls import include, path, re_path
from rest_framework.routers import DefaultRouter

from api.v1.dashboard.views import DashboardStatsView
from api.v1.equipment_integrations.views import (
    EquipmentResultsInboxView,
    EquipmentWorklistView,
)
from api.v1.routing.routes import register_routes

router = DefaultRouter()
# Next.js remove a "/" final por padrao. Tornar a "/" opcional evita erros
# em POST/PUT/PATCH (Django nao consegue redirecionar mantendo o body).
router.trailing_slash = "/?"
register_routes(router)

urlpatterns = [
    path("auth/", include("api.v1.auth.urls")),
    re_path(r"^dashboard/stats/?$", DashboardStatsView.as_view(), name="dashboard-stats"),
    # Integrações de equipamentos (worklist + inbox HTTP).
    re_path(
        r"^equipment_integrations/equipment/(?P<equipment_id_custom>[^/]+)/worklist/?$",
        EquipmentWorklistView.as_view(),
        name="equipment-integrations-worklist",
    ),
    re_path(
        r"^equipment_integrations/equipment/(?P<equipment_id_custom>[^/]+)/results/?$",
        EquipmentResultsInboxView.as_view(),
        name="equipment-integrations-results",
    ),
    path("", include(router.urls)),
]
