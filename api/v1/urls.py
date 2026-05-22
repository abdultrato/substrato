from django.urls import include, path, re_path
from rest_framework.routers import DefaultRouter

from api.v1.audit.views import ActivityReportPdfView, ModelActivityReportPdfView
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
    path("ai/", include("api.v1.ai.urls")),
    re_path(r"^dashboard/stats/?$", DashboardStatsView.as_view(), name="dashboard-stats"),
    re_path(
        r"^audit/atividade/relatorio/pdf/?$",
        ActivityReportPdfView.as_view(),
        name="audit-activity-report-pdf",
    ),
    re_path(
        r"^audit/modelo/relatorio/pdf/?$",
        ModelActivityReportPdfView.as_view(),
        name="audit-model-activity-report-pdf",
    ),
    # Integrações de equipamentos (worklist + inbox HTTP).
    re_path(
        r"^equipment_integrations/equipment/(?P<equipment_custom_id>[^/]+)/worklist/?$",
        EquipmentWorklistView.as_view(),
        name="equipment-integrations-worklist",
    ),
    re_path(
        r"^equipment_integrations/equipment/(?P<equipment_custom_id>[^/]+)/results/?$",
        EquipmentResultsInboxView.as_view(),
        name="equipment-integrations-results",
    ),
    path("", include(router.urls)),
]
