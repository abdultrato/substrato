from datetime import timedelta

from django.db import transaction
from django.utils import timezone

from apps.tenants.models.subscription import TenantSubscription
from apps.tenants.models.subscription_plan import SubscriptionPlan
from apps.tenants.models.tenant import Tenant


class CreateTenantUseCase:
    """
    Onboarding oficial de tenant.

    ✔ Transacional
    ✔ Cria assinatura automaticamente
    ✔ Define trial
    ✔ Usa plano FREE padrão
    ✔ Idempotente por identificador
    """

    TRIAL_DAYS = 14

    @staticmethod
    @transaction.atomic
    def execute(nome: str, identificador: str, dominio: str | None = None):

        # Evita duplicação
        existente = Tenant.objects.filter(identificador=identificador).first()

        if existente:
            return existente

        # Obtém plano FREE global
        plano_free = SubscriptionPlan.objects.filter(
            tipo=SubscriptionPlan.TipoPlano.FREE,
            ativo=True,
        ).first()

        if not plano_free:
            raise Exception("Plano FREE não configurado.")

        hoje = timezone.now().date()

        # Criação do tenant
        inquilino = Tenant.objects.create(
            nome=nome,
            identificador=identificador,
            dominio=dominio,
            status_comercial=Tenant.StatusComercial.TRIAL,
            trial_ate=hoje + timedelta(days=CreateTenantUseCase.TRIAL_DAYS),
        )

        # Criação da assinatura inicial
        TenantSubscription.objects.create(
            inquilino=inquilino,
            plano=plano_free,
            data_inicio=hoje,
            status=TenantSubscription.Status.ATIVA,
            ciclo=TenantSubscription.Ciclo.MENSAL,
        )

        return inquilino


CriarInquilinoUseCase = CreateTenantUseCase
CreateTenantUseCase.TRIAL_DIAS = CreateTenantUseCase.TRIAL_DAYS
CreateTenantUseCase.executar = CreateTenantUseCase.execute
