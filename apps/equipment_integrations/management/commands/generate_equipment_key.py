from django.core.management.base import BaseCommand, CommandError

from apps.equipment_integrations.models import (
    IntegrationCredential,
    IntegrationEquipment,
)


class Command(BaseCommand):
    help = "Gera uma chave (API key) para integração de um equipamento (worklist/inbox)."

    def add_arguments(self, parser):
        parser.add_argument("--equipment", dest="equipment", required=False, help="ID custom do equipamento (ex.: EQP-...)")
        parser.add_argument("--equipamento", dest="equipment", required=False, help="Alias compatível para --equipment.")
        parser.add_argument("--label", default="", help="Rótulo (opcional) para a credencial.")

    def handle(self, *args, **options):
        equipment_id_custom = options["equipment"]
        label = options.get("label") or ""

        if not equipment_id_custom:
            raise CommandError("Informe --equipment.")

        equipment = IntegrationEquipment.objects.filter(id_custom=equipment_id_custom, deletado=False).first()
        if equipment is None:
            raise CommandError("Equipamento não encontrado.")

        cred, key = IntegrationCredential.generate(equipment=equipment, label=label)

        self.stdout.write("Credencial criada:")
        self.stdout.write(f"- credencial_id_custom: {cred.id_custom}")
        self.stdout.write(f"- equipamento: {equipment.id_custom} ({equipment.nome})")
        self.stdout.write("")
        self.stdout.write("CHAVE (guarde em local seguro; não será mostrada novamente):")
        self.stdout.write(key)
