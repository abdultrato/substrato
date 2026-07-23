"""Remove dados e tenants, preservando apenas o tenant explicitamente indicado."""

from django.apps import apps
from django.core.management.base import BaseCommand, CommandError
from django.db import transaction
from django.db.models.deletion import ProtectedError

from apps.tenants.models.tenant import Tenant


class Command(BaseCommand):
    help = "Remove todos os tenants e respetivos dados, exceto o tenant indicado."

    def add_arguments(self, parser):
        parser.add_argument("--keep", required=True, help="Identificador do único tenant a preservar.")
        parser.add_argument("--execute", action="store_true", help="Confirma a execução destrutiva.")

    def handle(self, *args, **options):
        keep = Tenant.all_objects.filter(identifier=options["keep"]).first()
        if keep is None:
            raise CommandError(f"Tenant a preservar não encontrado: {options['keep']}")

        targets = Tenant.all_objects.exclude(pk=keep.pk)
        target_ids = list(targets.values_list("pk", flat=True))
        if not target_ids:
            self.stdout.write(self.style.SUCCESS(f"Apenas o tenant {keep.identifier} já está presente."))
            return

        scoped_models = []
        for model in apps.get_models():
            if model._meta.abstract or model._meta.proxy or model is Tenant:
                continue
            try:
                model._meta.get_field("tenant")
            except Exception:
                continue
            scoped_models.append(model)

        total = sum(self._queryset(model, target_ids).count() for model in scoped_models)
        self.stdout.write(
            f"Preservar: {keep.identifier}. Remover: {len(target_ids)} tenants e {total} registos associados."
        )
        if not options["execute"]:
            self.stdout.write(self.style.WARNING("Simulação concluída. Use --execute para confirmar a remoção."))
            return

        with transaction.atomic():
            remaining = {model: self._queryset(model, target_ids).count() for model in scoped_models}
            while any(remaining.values()):
                progress = False
                blocked = []
                for model, count in list(remaining.items()):
                    if not count:
                        continue
                    try:
                        self._queryset(model, target_ids).delete()
                    except ProtectedError:
                        blocked.append(model._meta.label)
                        continue
                    progress = True
                    remaining[model] = 0

                if not progress:
                    names = ", ".join(sorted(blocked)[:12])
                    raise CommandError(f"Não foi possível limpar dependências protegidas: {names}")

            Tenant.all_objects.filter(pk__in=target_ids).delete()

        final = list(Tenant.all_objects.values_list("identifier", flat=True))
        if final != [keep.identifier]:
            raise CommandError(f"Limpeza incompleta; tenants restantes: {', '.join(final)}")
        self.stdout.write(self.style.SUCCESS(f"Limpeza concluída. Tenant restante: {keep.identifier}."))

    @staticmethod
    def _queryset(model, target_ids):
        manager = getattr(model, "all_objects", model._default_manager)
        return manager.filter(tenant_id__in=target_ids)
