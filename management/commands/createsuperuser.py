from __future__ import annotations

from django.contrib.auth.management.commands.createsuperuser import Command as DjangoCreateSuperuserCommand
from django.core import exceptions

from apps.tenants.models.tenant import Tenant


class Command(DjangoCreateSuperuserCommand):
    help = "Cria superuser com escolha interativa de tenant por número."

    def get_input_data(self, field, message, default=None):
        if field.name != "tenant":
            return super().get_input_data(field, message, default)

        tenants = list(Tenant.objects.order_by("id"))
        if not tenants:
            self.stderr.write("Error: Nenhum tenant disponível. Crie um tenant antes do superuser.")
            return None

        self.stdout.write("")
        self.stdout.write("Tenants disponíveis:")
        for idx, tenant in enumerate(tenants, start=1):
            label = tenant.name or tenant.identifier
            self.stdout.write(f"  {idx}. {tenant.identifier} - {label}")

        while True:
            raw_value = input("Tenant (número): ").strip()
            if not raw_value and default:
                raw_value = str(default).strip()

            if not raw_value:
                self.stderr.write("Error: Tenant cannot be blank.")
                continue

            try:
                if raw_value.isdigit():
                    selected = tenants[int(raw_value) - 1]
                    return selected.pk

                tenant = Tenant.objects.get(pk=raw_value)
                return tenant.pk
            except (IndexError, Tenant.DoesNotExist):
                self.stderr.write("Error: Escolha inválida. Selecione um número da lista ou o ID do tenant.")
            except (ValueError, exceptions.ValidationError) as exc:
                self.stderr.write(f"Error: {exc}")
