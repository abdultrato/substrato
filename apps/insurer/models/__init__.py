from .coverage_plan import CoveragePlan
from .insurer import Insurer
from .procedure_authorization import ProcedureAuthorization
from .tenant_coverage_plan import TenantCoveragePlan

AutorizacaoProcedimento = ProcedureAuthorization
PlanoCobertura = CoveragePlan
Seguradora = Insurer
TenantPlanoCobertura = TenantCoveragePlan

__all__ = [
    "AutorizacaoProcedimento",
    "CoveragePlan",
    "Insurer",
    "PlanoCobertura",
    "ProcedureAuthorization",
    "Seguradora",
    "TenantCoveragePlan",
    "TenantPlanoCobertura",
]
