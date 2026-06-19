from __future__ import annotations

from django.contrib.auth.management.commands.createsuperuser import Command as DjangoCreateSuperuserCommand
from django.core import exceptions

from apps.tenants.models.tenant import Tenant


class Command(DjangoCreateSuperuserCommand):
    help = "Cria superuser com escolha interativa de unidade (tenant) por número."

    def get_input_data(self, field, message, default=None):
        if field.name != "tenant":
            return super().get_input_data(field, message, default)

        tenants = list(Tenant.objects.order_by("id"))
        if not tenants:
            self.stderr.write("Error: Nenhum tenant disponível. Crie um tenant antes do superuser.")
            return None

        self.stdout.write("")
        self.stdout.write("Unidades disponíveis:")
        for idx, tenant in enumerate(tenants, start=1):
            label = tenant.name or tenant.identifier
            self.stdout.write(f"  {idx}. {tenant.identifier} — {label}")

        while True:
            raw_value = input("Unidade (número da lista): ").strip()

            if not raw_value and default:
                raw_value = str(default).strip()

            if not raw_value:
                self.stderr.write("Error: Unidade não pode ser vazia.")
                continue

            try:
                choice = int(raw_value)
                return tenants[choice - 1]
            except (ValueError, IndexError):
                pass

            try:
                return Tenant.objects.get(identifier=raw_value)
            except Tenant.DoesNotExist:
                pass

            self.stderr.write(
                f'Error: Escolha inválida "{raw_value}". '
                "Digite o número da lista ou o identificador do tenant."
            )
