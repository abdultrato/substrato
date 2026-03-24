from .campos import ExameCampoViewSet, ExameMedicoCampoViewSet
from .exames import ExameMedicoViewSet, ExameViewSet
from .pacientes import PacienteViewSet
from .requisicoes import RequisicaoAnaliseViewSet, RequisicaoItemViewSet
from .resultados import ResultadoItemViewSet
from .resultados_medicos import ResultadoMedicoArquivoViewSet

VIEWSET_MAP = {
    "exame": ExameViewSet,
    "examemedico": ExameMedicoViewSet,
    "examecampo": ExameCampoViewSet,
    "examemedicocampo": ExameMedicoCampoViewSet,
    "paciente": PacienteViewSet,
    "requisicaoanalise": RequisicaoAnaliseViewSet,
    "requisicaoitem": RequisicaoItemViewSet,
    "resultadoitem": ResultadoItemViewSet,
    "resultadomedicoarquivo": ResultadoMedicoArquivoViewSet,
}

__all__ = [
    "VIEWSET_MAP",
    "ExameCampoViewSet",
    "ExameMedicoCampoViewSet",
    "ExameMedicoViewSet",
    "ExameViewSet",
    "PacienteViewSet",
    "RequisicaoAnaliseViewSet",
    "RequisicaoItemViewSet",
    "ResultadoItemViewSet",
    "ResultadoMedicoArquivoViewSet",
]
