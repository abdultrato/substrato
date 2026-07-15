from __future__ import annotations

import unicodedata

from django.contrib.auth.models import Group, Permission
from django.core.management.base import BaseCommand
from django.db import transaction

from security.permissions.rbac import GROUPS as RBAC_GROUPS

CANONICAL_GROUP_KEYS: tuple[str, ...] = (
    "ADMIN",
    "RECEPCAO",
    "LABORATORIO",
    "ENFERMAGEM",
    "MEDICINA",
    "MEDICINA_OCUPACIONAL",
    "FARMACIA",
    "FARMACIA_CLINICA",
    "CONTABILIDADE",
    "RECURSOS_HUMANOS",
    "PROFESSOR",
    "DIRETOR_ESCOLA",
    "DIRETOR_ADJUNTO_PEDAGOGICO",
    "ENCARREGADO_EDUCACAO",
    "ESTUDANTE",
    "ODONTOLOGIA",
    "VETERINARIA",
    "FISIOTERAPIA",
    "RADIOLOGIA",
    "CARDIOLOGIA",
    "NEUROLOGIA",
    "OFTALMOLOGIA",
    "TERAPIA_OCUPACIONAL",
    "FONOAUDIOLOGIA",
    "TELEMEDICINA",
    "SAUDE_PUBLICA",
    "CREDITO_FINANCIAMENTO",
    "LOGISTICA",
    "MANUTENCAO",
)

CANONICAL_GROUPS: list[str] = [RBAC_GROUPS[key] for key in CANONICAL_GROUP_KEYS]

ALIASES: dict[str, list[str]] = {
    # Canonical -> aliases seen historically (sem/partial acentos).
    "Recepcionista": [
        "reception",
        "Recepção",
        "Recepcao",
    ],
    "Técnico de Laboratório": [
        "Tecnico de Laboratorio",
        "Tecnico de Laboratório",
        "Técnico de Laboratorio",
    ],
    "Técnico de Farmácia": [
        "Tecnico de Farmacia",
        "Tecnico de Farmácia",
        "Técnico de Farmacia",
    ],
    "Médico": [
        "Medico",
    ],
    "Farmácia Clínica": [
        "Farmacia Clinica",
    ],
    "Gestor de RH": [
        "RH",
        "Recursos Humanos",
        "Human Resources",
    ],
    "Diretor da Escola": [
        "Director da Escola",
        "Diretor da Escola",
        "Diretor de Escola",
        "Director de Escola",
    ],
    "Diretor Adjunto Pedagógico": [
        "Director Adjunto Pedagógico",
        "Director Adjunto Pedagogico",
        "Diretor Adjunto Pedagogico",
    ],
    "Encarregado de Educação": [
        "Encarregado de Educacao",
    ],
    "Estudante": [
        "Student",
    ],
    "Professor": [
        "Teacher",
    ],
    "Créditos e Financiamento": [
        "Creditos e Financiamento",
        "Crédito e Financiamento",
        "Credito e Financiamento",
    ],
    "Gestor de Logística": [
        "Gestor de Logistica",
        "Logística",
        "Logistica",
    ],
    "Saúde Pública": [
        "Saude Publica",
    ],
    "Medicina Veterinária": [
        "Medicina Veterinaria",
    ],
    "Terapia Ocupacional": [
        "Occupational Therapy",
    ],
}


def _normalize(value: str) -> str:
    value = (value or "").strip().lower()
    if not value:
        return ""
    value = unicodedata.normalize("NFD", value)
    return "".join(ch for ch in value if unicodedata.category(ch) != "Mn")


class Command(BaseCommand):
    help = "Cria/atualiza grupos base (RBAC). Administrador recebe todas as permissoes."

    def add_arguments(self, parser):
        parser.add_argument(
            "--admin-only",
            action="store_true",
            help="Atualiza o grupo Administrador (nao cria/atualiza os demais).",
        )
        parser.add_argument(
            "--dry-run",
            action="store_true",
            help="Mostra o que faria sem alterar o banco.",
        )

    @transaction.atomic
    def handle(self, *args, **options):
        admin_only: bool = bool(options.get("admin_only"))
        dry_run: bool = bool(options.get("dry_run"))

        targets = ["Administrador"] if admin_only else CANONICAL_GROUPS

        # Index existing groups by a normalized key to allow accent unification.
        existing_by_norm: dict[str, list[Group]] = {}
        for g in Group.objects.all():
            existing_by_norm.setdefault(_normalize(g.name), []).append(g)

        def ensure_group(canonical_name: str) -> Group:
            norm = _normalize(canonical_name)
            existing = existing_by_norm.get(norm, [])

            if not existing:
                if dry_run:
                    self.stdout.write(f"[dry-run] Grupo seria criado: {canonical_name}")
                    # Return a transient object; caller must avoid mutating it on dry-run.
                    return Group(name=canonical_name)

                group = Group.objects.create(name=canonical_name)
                existing_by_norm.setdefault(norm, []).append(group)
                self.stdout.write(f"Grupo criado: {canonical_name}")
                return group

            # If there are multiple variants (com/sem acento), choose/rename/merge.
            canonical = next((g for g in existing if g.name == canonical_name), None)
            if not canonical:
                # Reuse the first variant and rename it to the canonical name.
                canonical = existing[0]
                if canonical.name != canonical_name:
                    if dry_run:
                        self.stdout.write(f"[dry-run] Grupo seria renomeado: {canonical.name} -> {canonical_name}")
                    else:
                        old = canonical.name
                        canonical.name = canonical_name
                        canonical.save(update_fields=["name"])
                        self.stdout.write(f"Grupo renomeado: {old} -> {canonical_name}")

            # Merge any remaining variants into the canonical group.
            for other in list(existing):
                if other.id == getattr(canonical, "id", None):
                    continue
                if other.name == canonical_name:
                    continue

                if dry_run:
                    self.stdout.write(f"[dry-run] Grupo seria mesclado: {other.name} -> {canonical_name}")
                    continue

                # Merge perms/users, then drop the alias group.
                canonical.permissions.add(*other.permissions.all())
                canonical.user_set.add(*other.user_set.all())
                other.delete()
                self.stdout.write(f"Grupo mesclado e removido: {other.name} -> {canonical_name}")

            self.stdout.write(f"Grupo ok: {canonical_name}")
            return canonical

        for name in targets:
            # Bring groups that match explicit aliases into the canonical bucket.
            canonical_norm = _normalize(name)
            for alias in ALIASES.get(name, []):
                alias_norm = _normalize(alias)
                alias_groups = existing_by_norm.get(alias_norm, [])
                if not alias_groups:
                    continue
                bucket = existing_by_norm.setdefault(canonical_norm, [])
                for alias_group in alias_groups:
                    if alias_group not in bucket:
                        bucket.append(alias_group)
            group = ensure_group(name)

            if name == "Administrador":
                total = Permission.objects.count()
                current = 0 if dry_run or not getattr(group, "id", None) else group.permissions.count()

                if dry_run:
                    self.stdout.write(f"[dry-run] Administrador: {current}/{total} permissoes (nao alterado).")
                else:
                    group.permissions.set(Permission.objects.all())
                    self.stdout.write(self.style.SUCCESS(f"Administrador atualizado: {current} -> {total} permissoes."))
