from datetime import timedelta

from django.db import transaction
from django.utils import timezone

from aplicativos.inquilinos.modelos.inquilino import Inquilino
from aplicativos.inquilinos.modelos.plano_assinatura import PlanoAssinatura
from aplicativos.inquilinos.modelos.assinatura import AssinaturaTenant


class CriarInquilinoUseCase:
    """
    Onboarding oficial de tenant.

    ✔ Transacional
    ✔ Cria assinatura automaticamente
    ✔ Define trial
    ✔ Usa plano FREE padrão
    ✔ Idempotente por identificador
    """

    TRIAL_DIAS = 14

    @staticmethod
    @transaction.atomic
    def executar(nome: str, identificador: str, dominio: str | None = None):

        # Evita duplicação
        existente = Inquilino.objects.filter(
            identificador=identificador
        ).first()

        if existente:
            return existente

        # Obtém plano FREE global
        plano_free = PlanoAssinatura.objects.filter(
            tipo=PlanoAssinatura.TipoPlano.FREE,
            ativo=True,
        ).first()

        if not plano_free:
            raise Exception("Plano FREE não configurado.")

        hoje = timezone.now().date()

        # Criação do tenant
        inquilino = Inquilino.objects.create(
            nome=nome,
            identificador=identificador,
            dominio=dominio,
            status_comercial=Inquilino.StatusComercial.TRIAL,
            trial_ate=hoje + timedelta(days=CriarInquilinoUseCase.TRIAL_DIAS),
        )

        # Criação da assinatura inicial
        AssinaturaTenant.objects.create(
            inquilino=inquilino,
            plano=plano_free,
            data_inicio=hoje,
            status=AssinaturaTenant.Status.ATIVA,
            ciclo=AssinaturaTenant.Ciclo.MENSAL,
        )

        return inquilino
