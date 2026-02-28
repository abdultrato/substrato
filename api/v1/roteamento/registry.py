def registrar_rotas(router):
	from api.v1.clinico.viewsets import PacienteViewSet
	from api.v1.faturamento.viewsets import FaturaViewSet
	
	router.register("pacientes", PacienteViewSet)
	router.register("faturas", FaturaViewSet)


from .clinico.routes import register as register_clinico
from .faturamento.routes import register as register_faturamento


def registrar_rotas(router):
	register_clinico(router)
	register_faturamento(router)
