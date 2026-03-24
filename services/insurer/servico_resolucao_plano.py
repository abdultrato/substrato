from apps.insurer.models.tenant_coverage_plan import TenantCoveragePlan


class ServicoResolucaoPlano:
    @staticmethod
    def obter_plano_efetivo(inquilino, plano_global):

        custom = TenantCoveragePlan.objects.filter(
            inquilino=inquilino,
            plano_global=plano_global,
            ativo=True,
        ).first()

        if not custom:
            return plano_global

        return custom
