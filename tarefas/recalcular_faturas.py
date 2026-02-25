from django.core.management.base import BaseCommand

from frontend.tasks.recalculo import RecalculoFaturasTask


class Command(BaseCommand):
    help = "Recalcula os totais de todas as faturas"

    def handle(self, *args, **options):
        RecalculoFaturasTask.run()
        self.stdout.write(self.style.SUCCESS("Recalculo concluído."))
