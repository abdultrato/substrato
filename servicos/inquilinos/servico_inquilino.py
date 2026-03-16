from django.db import transaction

from aplicativos.inquilinos.modelos import (
    ConfiguracaoInquilino,
    Inquilino,
    PlanoAssinatura,
    UsoTenant,
)


class ServicoInquilino:
    """
    Serviço orquestrador de criação de tenant.

    ✔ Transação atômica
    ✔ Criação automática de estrutura base
    ✔ Pronto para onboarding automático
    """

    @transaction.atomic
    def criar(self, nome: str, dominio: str):

        dominio = dominio.lower().strip()

        inquilino = Inquilino.objects.create(
            nome=nome,
            identificador=dominio,
            dominio=dominio,
        )

        PlanoAssinatura.objects.create(inquilino=inquilino)
        ConfiguracaoInquilino.objects.create(inquilino=inquilino)
        UsoTenant.objects.create(inquilino=inquilino)

        return inquilino
