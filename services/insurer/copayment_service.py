from domain.insurer.copayment_rules import calcular_coparticipacao as calculate_copayment
from services.insurer.plan_resolution_service import PlanResolutionService


class CopaymentService:
    @staticmethod
    def calculate(tenant, global_plan, total_value):
        effective_plan = PlanResolutionService.get_effective_plan(tenant, global_plan)
        percentage = effective_plan.percentual_final()
        return calculate_copayment(total_value, percentage)


ServicoCoparticipacao = CopaymentService
CopaymentService.calcular = CopaymentService.calculate
