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
            help="UUID do tenant. Omitir = todos os tenants ativos.",
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

        from apps.tenants.models import Tenant

        # Resolve lista de tenants a processar
        if tenant_id:
            try:
                tenants = [Tenant.all_objects.get(id=tenant_id)]
            except Tenant.DoesNotExist:
                raise CommandError(f"Tenant {tenant_id} não encontrado.")
        else:
            tenants = list(Tenant.all_objects.filter(active=True))
            if not tenants:
                raise CommandError("Nenhum tenant ativo encontrado.")

        validade = date.today() + timedelta(days=730)
        total_criados = 0
        total_ignorados = 0

        for tenant in tenants:
            self.stdout.write(f"\nTenant: {tenant.name} ({tenant.id})")
            criados, ignorados = self._seed_tenant(tenant, quantidade, validade, forcar_todos)
            self._seed_pending_procedure_materials(tenant, quantidade, validade)
            total_criados += criados
            total_ignorados += ignorados

        self.stdout.write(
            self.style.SUCCESS(
                f"\nConcluído: {total_criados} produtos com estoque adicionado, {total_ignorados} ignorados."
            )
        )

    def _seed_tenant(self, tenant, quantidade, validade, forcar_todos):
        from apps.pharmacy.models.inventory_movement import InventoryMovement, MovementOrigin, MovementType
        from apps.pharmacy.models.lot import Lot
        from apps.pharmacy.models.product import Product

        produtos = Product.objects.filter(tenant=tenant, deleted=False)
        self.stdout.write(f"  Produtos: {produtos.count()}")
        criados = 0
        ignorados = 0

        from django.db import transaction
        with transaction.atomic():
            for produto in produtos:
                if not forcar_todos:
                    if Lot.available(produto).exists():
                        ignorados += 1
                        continue

                numero_lote = f"SEED-{date.today().strftime('%Y%m%d')}-{produto.pk}"
                if Lot.objects.filter(product=produto, lot_number=numero_lote, deleted=False).exists():
                    ignorados += 1
                    continue

                lote = Lot(tenant=tenant, product=produto, lot_number=numero_lote,
                           expiration_date=validade, initial_quantity=quantidade,
                           sale_price=produto.sale_price or 0)
                lote.save()
                InventoryMovement(tenant=tenant, lot=lote, type=MovementType.ENTRADA,
                                  origin=MovementOrigin.AJUSTE, quantity=quantidade).save()
                criados += 1
                self.stdout.write(f"  ✓ {produto.name} — lote {numero_lote} ({quantidade} un.)")

        return criados, ignorados

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
