from django.core.management.base import BaseCommand
from frontend.tasks.cleanup import CleanupTask


class Command(BaseCommand):
    help = "Executa limpeza e manutenção do sistema"

    def handle(self, *args, **options):
        CleanupTask.run()
        self.stdout.write(self.style.SUCCESS("Limpeza concluída."))
