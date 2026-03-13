from api.v1.auditoria.viewsets import VIEWSET_MAP as AUDITORIA_VIEWSET_MAP
from api.v1.dashboard.viewsets import VIEWSET_MAP as DASHBOARD_VIEWSET_MAP
from api.v1.clinico.viewsets import VIEWSET_MAP as CLINICO_VIEWSET_MAP
from api.v1.consultas.viewsets import VIEWSET_MAP as CONSULTAS_VIEWSET_MAP
from api.v1.contabilidade.viewsets import VIEWSET_MAP as CONTABILIDADE_VIEWSET_MAP
from api.v1.enfermagem.viewsets import VIEWSET_MAP as ENFERMAGEM_VIEWSET_MAP
from api.v1.farmacia.viewsets import VIEWSET_MAP as FARMACIA_VIEWSET_MAP
from api.v1.faturamento.viewsets import VIEWSET_MAP as FATURAMENTO_VIEWSET_MAP
from api.v1.identidade.viewsets import VIEWSET_MAP as IDENTIDADE_VIEWSET_MAP
from api.v1.inquilinos.viewsets import VIEWSET_MAP as INQUILINOS_VIEWSET_MAP
from api.v1.notificacoes.viewsets import VIEWSET_MAP as NOTIFICACOES_VIEWSET_MAP
from api.v1.pagamentos.viewsets import VIEWSET_MAP as PAGAMENTOS_VIEWSET_MAP
from api.v1.recepcao.viewsets import VIEWSET_MAP as RECEPCAO_VIEWSET_MAP
from api.v1.seguradora.viewsets import VIEWSET_MAP as SEGURADORA_VIEWSET_MAP
from seguranca.permissoes.rbac import RBACPermission


VIEWSET_GROUPS = {
    "auditoria": AUDITORIA_VIEWSET_MAP,
    "dashboard": DASHBOARD_VIEWSET_MAP,
    "clinico": CLINICO_VIEWSET_MAP,
    "consultas": CONSULTAS_VIEWSET_MAP,
    "contabilidade": CONTABILIDADE_VIEWSET_MAP,
    "enfermagem": ENFERMAGEM_VIEWSET_MAP,
    "farmacia": FARMACIA_VIEWSET_MAP,
    "faturamento": FATURAMENTO_VIEWSET_MAP,
    "identidade": IDENTIDADE_VIEWSET_MAP,
    "inquilinos": INQUILINOS_VIEWSET_MAP,
    "notificacoes": NOTIFICACOES_VIEWSET_MAP,
    "pagamentos": PAGAMENTOS_VIEWSET_MAP,
    "recepcao": RECEPCAO_VIEWSET_MAP,
    "seguradora": SEGURADORA_VIEWSET_MAP,
}


def registrar_rotas(router):
    for prefixo, viewsets in VIEWSET_GROUPS.items():
        for nome_modelo, viewset in sorted(viewsets.items()):
            rota = f"{prefixo}/{nome_modelo}"
            basename = f"{prefixo}-{nome_modelo}"
            # Enforce RBAC uniformly for all registered ViewSets.
            viewset.permission_classes = [RBACPermission]
            router.register(rota, viewset, basename=basename)
    return router
