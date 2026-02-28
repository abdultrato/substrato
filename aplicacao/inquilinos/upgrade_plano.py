from django.db import transaction
from django.utils import timezone

from aplicativos.inquilinos.modelos.plano_assinatura import PlanoAssinatura
from aplicativos.inquilinos.modelos.assinatura import AssinaturaTenant


class UpgradePlanoUseCase:
    """
    Upgrade / Downgrade de plano.

    ✔ Transacional
    ✔ Cancela assinatura anterior
    ✔ Cria nova assinatura
    ✔ Garante apenas uma ativa
    ✔ Compatível com billing
    """

    @staticmethod
    @transaction.atomic
    def executar(inquilino, novo_tipo_plano: str, imediato: bool = True):

        assinatura_atual = inquilino.obter_assinatura_ativa()

        if not assinatura_atual:
            raise Exception("Tenant não possui assinatura ativa.")

        if assinatura_atual.plano.tipo == novo_tipo_plano:
            return assinatura_atual

        novo_plano = PlanoAssinatura.objects.filter(
            tipo=novo_tipo_plano,
            ativo=True,
        ).first()

        if not novo_plano:
            raise Exception("Plano inválido ou inativo.")

        hoje = timezone.now().date()

        if imediato:
            # Cancela imediatamente
            assinatura_atual.cancelar(data_fim=hoje)

            nova_assinatura = AssinaturaTenant.objects.create(
                inquilino=inquilino,
                plano=novo_plano,
                data_inicio=hoje,
                status=AssinaturaTenant.Status.ATIVA,
                ciclo=assinatura_atual.ciclo,
            )

            return nova_assinatura

        # Upgrade programado no fim do ciclo
        data_fim_atual = assinatura_atual.data_fim or hoje

        assinatura_atual.cancelar(data_fim=data_fim_atual)

        nova_assinatura = AssinaturaTenant.objects.create(
            inquilino=inquilino,
            plano=novo_plano,
            data_inicio=data_fim_atual,
            status=AssinaturaTenant.Status.ATIVA,
            ciclo=assinatura_atual.ciclo,
        )

        return nova_assinatura
