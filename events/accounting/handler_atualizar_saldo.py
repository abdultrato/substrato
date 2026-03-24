from decimal import Decimal

from django.db import transaction
from django.db.models import F

from apps.accounting.models.account_balance import AccountBalance
from events.accounting.ledger_entry_criado import LedgerEntryCriado


@transaction.atomic
def handle(
    evento: LedgerEntryCriado,
):

    # Agrupar valores por conta para reduzir queries
    agregados = {}

    for linha in evento.linhas:
        conta_id = linha.conta_id
        valor = Decimal(
            linha.valor,
        )

        if conta_id not in agregados:
            agregados[conta_id] = {
                "debito": Decimal(
                    "0.00",
                ),
                "credito": Decimal(
                    "0.00",
                ),
            }

        if linha.natureza == "D":
            agregados[conta_id]["debito"] += valor
        else:
            agregados[conta_id]["credito"] += valor

    # Lock pessimista apenas das contas envolvidas
    saldos = AccountBalance.objects.select_for_update().filter(
        conta_id__in=agregados.keys(),
    )

    saldos_dict = {s.conta_id: s for s in saldos}

    # Criar saldo se não existir
    for conta_id in agregados:
        if conta_id not in saldos_dict:
            AccountBalance.objects.create(
                conta_id=conta_id,
                saldo_atual=0,
                total_debitos=0,
                total_creditos=0,
            )

    # Atualização atômica real
    for conta_id, valores in agregados.items():
        AccountBalance.objects.filter(
            conta_id=conta_id,
        ).update(
            total_debitos=F(
                "total_debitos",
            )
            + valores["debito"],
            total_creditos=F(
                "total_creditos",
            )
            + valores["credito"],
            saldo_atual=(
                F(
                    "saldo_atual",
                )
                + valores["debito"]
                - valores["credito"]
            ),
        )
