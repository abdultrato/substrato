from aplicativos.seguradora.modelos.tenant_plano import (
    TenantPlanoCobertura
)


class ServicoResolucaoPlano:

    @staticmethod
    def obter_plano_efetivo(inquilino, plano_global):

        custom = TenantPlanoCobertura.objects.filter(
            inquilino=inquilino,
            plano_global=plano_global,
            ativo=True,
        ).first()

        if not custom:
            return plano_global

        return custom
