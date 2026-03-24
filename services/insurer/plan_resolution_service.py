from apps.insurer.models.tenant_coverage_plan import TenantCoveragePlan


class PlanResolutionService:
    @staticmethod
    def get_effective_plan(tenant, global_plan):
        custom_plan = TenantCoveragePlan.objects.filter(
            inquilino=tenant,
            plano_global=global_plan,
            ativo=True,
        ).first()

        if not custom_plan:
            return global_plan

        return custom_plan


ServicoResolucaoPlano = PlanResolutionService
PlanResolutionService.obter_plano_efetivo = PlanResolutionService.get_effective_plan
