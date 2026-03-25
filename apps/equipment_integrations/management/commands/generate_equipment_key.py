from django.core.management.base import BaseCommand, CommandError

from apps.equipment_integrations.models import (
    IntegrationCredential,
    IntegrationEquipment,
)


class Command(BaseCommand):
    help = "Gera uma key (API key) para integração de um equipment (worklist/inbox)."

    def add_arguments(self, parser):
        parser.add_argument("--equipment", dest="equipment", required=False, help="ID custom do equipment (ex.: EQP-...)")
        parser.add_argument("--equipment", dest="equipment", required=False, help="Alias compatível para --equipment.")
        parser.add_argument("--label", default="", help="Rótulo (opcional) para a credencial.")

    def handle(self, *args, **options):
        equipment_custom_id = options["equipment"]
        label = options.get("label") or ""

        if not equipment_custom_id:
            raise CommandError("Informe --equipment.")

        equipment = IntegrationEquipment.objects.filter(custom_id=equipment_custom_id, deleted=False).first()
        if equipment is None:
            raise CommandError("Equipamento não encontrado.")

        cred, key = IntegrationCredential.generate(equipment=equipment, label=label)

        self.stdout.write("Credencial criada:")
        self.stdout.write(f"- credencial_custom_id: {cred.custom_id}")
        self.stdout.write(f"- equipment: {equipment.custom_id} ({equipment.name})")
        self.stdout.write("")
        self.stdout.write("CHAVE (guarde em local seguro; não será mostrada novamente):")
        self.stdout.write(key)
