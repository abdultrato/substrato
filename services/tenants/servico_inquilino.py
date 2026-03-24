from django.db import transaction

from apps.tenants.models import (
    TenantConfiguration,
    Tenant,
    SubscriptionPlan,
    TenantUsage,
)


class ServicoInquilino:
    """
    Serviço orquestrador de criação de tenant.
    """

    @transaction.atomic
    def criar(self, nome: str, dominio: str):

        dominio = domain.lower().strip()

        inquilino = Tenant.objects.create(
            nome=nome,
            identificador=dominio,
            dominio=dominio,
        )

        SubscriptionPlan.objects.create(inquilino=inquilino)
        TenantConfiguration.objects.create(inquilino=inquilino)
        TenantUsage.objects.create(inquilino=inquilino)

        return inquilino
