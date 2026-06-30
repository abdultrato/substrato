"""Management command: garante estoque (lote + entrada) para todos os produtos da farmácia.

Uso:
    python manage.py seed_pharmacy_stock
    python manage.py seed_pharmacy_stock --quantidade 200
    python manage.py seed_pharmacy_stock --tenant-id <uuid>
"""

from datetime import date, timedelta

import django
from django.core.management.base import BaseCommand, CommandError
from django.db import transaction


class Command(BaseCommand):
    help = "Adiciona lote + movimento de entrada para todos os produtos da farmácia sem estoque."

    def add_arguments(self, parser):
        parser.add_argument(
            "--quantidade",
            type=int,
            default=500,
            help="Quantidade inicial por lote (padrão: 500)",
        )
        parser.add_argument(
            "--tenant-id",
            type=str,
            default=None,
            help="UUID do tenant. Omitir = primeiro tenant ativo.",
        )
        parser.add_argument(
            "--todos",
            action="store_true",
            default=False,
            help="Cria lote mesmo para produtos que já têm estoque.",
        )

    def handle(self, *args, **options):
        from apps.pharmacy.models.inventory_movement import (
            InventoryMovement,
            MovementOrigin,
            MovementType,
        )
        from apps.pharmacy.models.lot import Lot
        from apps.pharmacy.models.product import Product

        quantidade = options["quantidade"]
        tenant_id = options["tenant_id"]
        forcar_todos = options["todos"]

        # Resolve tenant
        if tenant_id:
            from apps.tenants.models import Tenant
            try:
                tenant = Tenant.objects.get(id=tenant_id)
            except Tenant.DoesNotExist:
                raise CommandError(f"Tenant {tenant_id} não encontrado.")
        else:
            from apps.tenants.models import Tenant
            tenant = Tenant.objects.filter(active=True).first()
            if not tenant:
                raise CommandError("Nenhum tenant ativo encontrado.")

        self.stdout.write(f"Tenant: {tenant.name} ({tenant.id})")

        produtos = Product.objects.filter(tenant=tenant, deleted=False)
        total = produtos.count()
        self.stdout.write(f"Produtos encontrados: {total}")

        validade = date.today() + timedelta(days=730)  # 2 anos
        criados = 0
        ignorados = 0

        with transaction.atomic():
            for produto in produtos:
                # Verifica se já tem estoque disponível
                if not forcar_todos:
                    lotes_disponiveis = Lot.available(produto)
                    if lotes_disponiveis.exists():
                        ignorados += 1
                        continue

                numero_lote = f"SEED-{date.today().strftime('%Y%m%d')}-{produto.pk}"

                # Evita duplicar lote com mesmo número
                if Lot.objects.filter(product=produto, lot_number=numero_lote, deleted=False).exists():
                    ignorados += 1
                    continue

                preco = produto.sale_price or 0

                lote = Lot(
                    tenant=tenant,
                    product=produto,
                    lot_number=numero_lote,
                    expiration_date=validade,
                    initial_quantity=quantidade,
                    sale_price=preco,
                )
                lote.save()

                movimento = InventoryMovement(
                    tenant=tenant,
                    lot=lote,
                    type=MovementType.ENTRADA,
                    origin=MovementOrigin.AJUSTE,
                    quantity=quantidade,
                )
                movimento.save()

                criados += 1
                self.stdout.write(
                    f"  ✓ {produto.name} — lote {numero_lote} ({quantidade} un.)"
                )

        # Cobrir também ProcedureMaterials pendentes cujo produto é de outro tenant
        self._seed_pending_procedure_materials(tenant, quantidade, validade)

        self.stdout.write(
            self.style.SUCCESS(
                f"\nConcluído: {criados} produtos com estoque adicionado, {ignorados} ignorados."
            )
        )

    def _seed_pending_procedure_materials(self, tenant, quantidade, validade):
        """Garante estoque para materiais de procedimento pendentes referenciando produtos de outros tenants."""
        from apps.nursing.models.procedure_material import ProcedureMaterial
        from apps.pharmacy.models.inventory_movement import (
            InventoryMovement,
            MovementOrigin,
            MovementType,
        )
        from apps.pharmacy.models.lot import Lot

        pendentes = (
            ProcedureMaterial.objects.filter(
                inventory_movement__isnull=True,
                deleted=False,
                product__isnull=False,
            )
            .exclude(product__tenant=tenant)
            .select_related("product")
            .distinct()
        )

        extras = 0
        for material in pendentes:
            produto = material.product
            lotes = Lot.available(produto).filter(tenant_id=tenant.pk)
            if lotes.exists():
                continue
            numero = f"SEED-{date.today().strftime('%Y%m%d')}-XTENANTE-{produto.pk}"
            if Lot.objects.filter(product=produto, lot_number=numero, deleted=False).exists():
                continue
            lote = Lot(
                tenant=tenant,
                product=produto,
                lot_number=numero,
                expiration_date=validade,
                initial_quantity=quantidade,
                sale_price=produto.sale_price or 0,
            )
            lote.save()
            mov = InventoryMovement(
                tenant=tenant,
                lot=lote,
                type=MovementType.ENTRADA,
                origin=MovementOrigin.AJUSTE,
                quantity=quantidade,
            )
            mov.save()
            self.stdout.write(f"  ✓ [cross-tenant] {produto.name} — lote {numero}")
            extras += 1

        if extras:
            self.stdout.write(f"  {extras} produto(s) cross-tenant com estoque adicionado.")
