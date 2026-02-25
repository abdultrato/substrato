from django.urls import include, path
from rest_framework.routers import DefaultRouter
from rest_framework_simplejwt.views import (
    TokenObtainPairView as top,
    TokenRefreshView as trv,
    TokenVerifyView as tvv,
)

from frontend.api.views.entidade import EntidadeViewSet as en
from frontend.api.views.exame import ExameViewSet as e
from frontend.api.views.fatura import FaturaViewSet as f
from frontend.api.views.health import HealthCheckView as h
from frontend.api.views.paciente import PacienteViewSet as pa
from frontend.api.views.requisicao import RequisicaoViewSet as rq
from frontend.api.views.resultado import ResultadoItemViewSet as rs

# Criação do router único
router = DefaultRouter()
router.register(r"entidades", en.as_view(), basename="entidades")
router.register(r"pacientes", pa.as_view(), basename="pacientes")
router.register(r"exames", e.as_view(), basename="exames")
router.register(r"requisicoes", rq.as_view(), basename="requisicoes")
router.register(r"resultados", rs.as_view(), basename="resultados")
router.register(r"faturas", f.as_view(), basename="faturas")


# URLs
urlpatterns = [
    path("api/", include(router.urls)),  # API principal
    path("api/auth/token/", top.as_view(), name="token_obtain_pair"),
    path("api/auth/token/refresh/", trv.as_view(), name="token_refresh"),
    path("api/auth/token/verify/", tvv.as_view(), name="token_verify"),
]


urlpatterns += [
    path("health/", h.as_view(), name="health"),
]
