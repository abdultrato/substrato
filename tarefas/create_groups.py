# management/commands/create_groups.py
from django.contrib.auth.models import Group, Permission
from django.contrib.contenttypes.models import ContentType
from django.core.management.base import BaseCommand

from frontend.models import Fatura, Paciente, RequisicaoAnalise, ResultadoItem


class Command(BaseCommand):
    help = "Cria grupos iniciais e associa permissões básicas"

    def handle(self, *args, **options):
        grupos = [
            "Administrador",
            "Recepcionista",
            "Técnico de Laboratório",
            "Técnico de Farmácia",
            "Enfermeiro",
            "Técnico Administrativo",
        ]

        for g in grupos:
            group, created = Group.objects.get_or_create(name=g)
            if created:
                self.stdout.write(f"Grupo criado: {g}")

        # Permissões específicas
        # Exemplo: Recepcionista -> CRUD Paciente e Requisicao, visualizar/print Fatura
        paciente_ct = ContentType.objects.get_for_model(Paciente)
        requisicao_ct = ContentType.objects.get_for_model(RequisicaoAnalise)
        fatura_ct = ContentType.objects.get_for_model(Fatura)
        resultado_ct = ContentType.objects.get_for_model(ResultadoItem)

        recep_perms = Permission.objects.filter(content_type__in=[paciente_ct, requisicao_ct])
        print_fatura = Permission.objects.filter(content_type=fatura_ct, codename__in=["view_fatura"])
        Group.objects.get(name="Recepcionista").permissions.set(list(recep_perms) + list(print_fatura))

        lab_perms = Permission.objects.filter(
            content_type=resultado_ct,
            codename__in=[
                "add_resultadoitem",
                "change_resultadoitem",
                "view_resultadoitem",
            ],
        )
        Group.objects.get(name="Técnico de Laboratório").permissions.set(lab_perms)

        admin_perms = Permission.objects.all()
        Group.objects.get(name="Administrador").permissions.set(admin_perms)

        self.stdout.write(self.style.SUCCESS("Grupos e permissões configurados com sucesso."))
