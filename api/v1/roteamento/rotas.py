from rest_framework.routers import DefaultRouter

from .clinico.pacientes_viewset import PacientesViewSet
from .clinico.resultados_viewset import ResultadosViewSet

router = DefaultRouter()
router.register("pacientes", PacientesViewSet)
router.register("resultados", ResultadosViewSet)
from rest_framework.routers import DefaultRouter as dr

from frontend.api.views.entidade import EntidadeViewSet as evs
from frontend.api.views.fatura import FaturaViewSet as fvs
from frontend.api.views.paciente import PacienteViewSet as pvs
from frontend.api.views.requisicao import RequisicaoViewSet as rvs
from frontend.api.views.resultado import ResultadoItemViewSet as rivs
from frontend.api.viewsets.users import UserViewSet as uvs

router = dr()

router.register(r"entidades", evs, basename="entidade")
router.register(r"pacientes", pvs, basename="paciente")
router.register(r"exames", evs, basename="exame")
router.register(r"requisicoes", rvs, basename="requisicao")
router.register(r"resultados", rivs, basename="resultado")
router.register(r"faturas", fvs, basename="fatura")
router.register(r"users", uvs, basename="users")
router.register(r"groups", uvs, basename="groups")
urlpatterns = router.urls
