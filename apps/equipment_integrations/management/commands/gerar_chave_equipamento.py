from django.core.management.base import BaseCommand, CommandError

from apps.equipment_integrations.models import (
    IntegrationCredential,
    IntegrationEquipment,
)


class Command(BaseCommand):
    help = "Gera uma chave (API key) para integração de um equipamento (worklist/inbox)."

    def add_arguments(self, parser):
        parser.add_argument("--equipamento", required=True, help="ID custom do equipamento (ex.: EQP-...)")
        parser.add_argument("--label", default="", help="Rótulo (opcional) para a credencial.")

    def handle(self, *args, **options):
        equipamento_id_custom = options["equipamento"]
        label = options.get("label") or ""

        equipamento = IntegrationEquipment.objects.filter(id_custom=equipamento_id_custom, deletado=False).first()
        if equipamento is None:
            raise CommandError("Equipamento não encontrado.")

        cred, chave = IntegrationCredential.gerar(equipamento=equipamento, label=label)

        self.stdout.write("Credencial criada:")
        self.stdout.write(f"- credencial_id_custom: {cred.id_custom}")
        self.stdout.write(f"- equipamento: {equipamento.id_custom} ({equipamento.nome})")
        self.stdout.write("")
        self.stdout.write("CHAVE (guarde em local seguro; não será mostrada novamente):")
        self.stdout.write(chave)
