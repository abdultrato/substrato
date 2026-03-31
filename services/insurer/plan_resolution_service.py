from apps.insurer.models.tenant_coverage_plan import TenantCoveragePlan


class PlanResolutionService:
    @staticmethod
    def get_effective_plan(tenant, global_plan):
        custom_plan = TenantCoveragePlan.objects.filter(
            tenant=tenant,
            global_plan=global_plan,
            active=True,
        ).first()

        if not custom_plan:
            return global_plan

        return custom_plan


__all__ = ["PlanResolutionService"]
"""Resolve plano aplicável para paciente/procedimento."""
