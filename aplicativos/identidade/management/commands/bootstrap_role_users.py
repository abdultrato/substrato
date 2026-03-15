from __future__ import annotations

from dataclasses import dataclass

from django.conf import settings
from django.contrib.auth import get_user_model
from django.contrib.auth.models import Group, Permission
from django.contrib.contenttypes.models import ContentType
from django.core.management.base import BaseCommand
from django.core.exceptions import ObjectDoesNotExist
from django.db import transaction

from aplicativos.inquilinos.modelos.inquilino import Inquilino
from seguranca.permissoes.rbac import GROUPS as RBAC_GROUPS


@dataclass(frozen=True)
class _RoleUser:
    username: str
    email: str
    nome: str
    group_name: str


def _ensure_tenant() -> Inquilino:
    tenant = Inquilino.objects.order_by("id").first()
    if tenant:
        return tenant

    # Mirror the DEBUG middleware fallback for a smooth dev bootstrap.
    return Inquilino.objects.create(
        nome="Tenant Local",
        identificador="local",
        dominio="localhost",
        ativo=True,
        status_comercial=Inquilino.StatusComercial.TRIAL,
    )


def _ensure_group(name: str) -> Group:
    group, _ = Group.objects.get_or_create(name=name)
    return group


def _permission_codenames(model: str, actions: list[str]) -> list[str]:
    return [f"{action}_{model}" for action in actions]


def _grant_group_model_perms(group: Group, *, app_label: str, model: str, actions: list[str]) -> None:
    try:
        ct = ContentType.objects.get(app_label=app_label, model=model)
    except ObjectDoesNotExist:
        # If migrations weren't applied yet for an app/model, just skip it.
        return
    codenames = _permission_codenames(model, actions)
    perms = list(Permission.objects.filter(content_type=ct, codename__in=codenames))
    if perms:
        group.permissions.add(*perms)


def _ensure_admin_group_full_access() -> None:
    admin_group = _ensure_group(RBAC_GROUPS["ADMIN"])
    admin_group.permissions.set(Permission.objects.all())


def _ensure_groups_permissions() -> None:
    """
    Django Admin permissions (not API RBAC).

    Keep this minimal: enough for each role to login to /admin and see/use the
    core screens that the frontend links to.
    """

    _ensure_admin_group_full_access()

    # Recepcao: atendimento + faturamento + cadastro basico
    recepcao = _ensure_group(RBAC_GROUPS["RECEPCAO"])
    for app_label, model, actions in [
        ("clinico", "paciente", ["view", "add", "change"]),
        ("clinico", "requisicaoanalise", ["view", "add", "change"]),
        ("clinico", "requisicaoitem", ["view", "add", "change"]),
        ("recepcao", "checkinrecepcao", ["view", "add", "change"]),
        ("faturamento", "fatura", ["view", "add", "change"]),
        ("faturamento", "faturaitem", ["view", "add", "change"]),
        ("pagamentos", "pagamento", ["view", "add", "change"]),
        ("pagamentos", "recibo", ["view"]),
    ]:
        _grant_group_model_perms(recepcao, app_label=app_label, model=model, actions=actions)

    # Laboratorio: lancamento/validacao de resultados + consulta de requisicoes
    laboratorio = _ensure_group(RBAC_GROUPS["LABORATORIO"])
    for app_label, model, actions in [
        ("clinico", "requisicaoanalise", ["view"]),
        ("clinico", "requisicaoitem", ["view"]),
        ("clinico", "resultado", ["view", "change"]),
        ("clinico", "resultadoitem", ["view", "change"]),
    ]:
        _grant_group_model_perms(laboratorio, app_label=app_label, model=model, actions=actions)

    # Enfermagem: execucao de procedimentos e registos
    enfermagem = _ensure_group(RBAC_GROUPS["ENFERMAGEM"])
    for app_label, model, actions in [
        ("clinico", "paciente", ["view"]),
        ("clinico", "requisicaoanalise", ["view"]),
        ("clinico", "requisicaoitem", ["view"]),
        ("enfermagem", "procedimento", ["view", "add", "change"]),
        ("enfermagem", "procedimentoitem", ["view", "add", "change"]),
        ("enfermagem", "procedimentomaterial", ["view", "add", "change"]),
        ("enfermagem", "registroenfermagem", ["view", "add", "change"]),
        ("enfermagem", "sinalvitalenfermagem", ["view", "add", "change"]),
    ]:
        _grant_group_model_perms(enfermagem, app_label=app_label, model=model, actions=actions)

    # Medicina: jornada clinica + requisicoes
    medicina = _ensure_group(RBAC_GROUPS["MEDICINA"])
    for app_label, model, actions in [
        ("clinico", "paciente", ["view"]),
        ("clinico", "requisicaoanalise", ["view", "add", "change"]),
        ("clinico", "requisicaoitem", ["view", "add", "change"]),
        ("clinico", "exame", ["view"]),
        ("clinico", "examemedico", ["view"]),
        ("consultas", "consultamedica", ["view", "add", "change"]),
    ]:
        _grant_group_model_perms(medicina, app_label=app_label, model=model, actions=actions)

    # Farmacia: estoque + vendas
    farmacia = _ensure_group(RBAC_GROUPS["FARMACIA"])
    for app_label, model, actions in [
        ("farmacia", "produto", ["view", "add", "change"]),
        ("farmacia", "lote", ["view", "add", "change"]),
        ("farmacia", "movimentoestoque", ["view", "add", "change"]),
        ("farmacia", "venda", ["view", "add", "change"]),
        ("farmacia", "itemvenda", ["view", "add", "change"]),
        ("clinico", "paciente", ["view"]),
    ]:
        _grant_group_model_perms(farmacia, app_label=app_label, model=model, actions=actions)

    # Medicina Ocupacional: semelhante a medicina + pode criar paciente
    ocupacional = _ensure_group(RBAC_GROUPS["MEDICINA_OCUPACIONAL"])
    for app_label, model, actions in [
        ("clinico", "paciente", ["view", "add", "change"]),
        ("clinico", "requisicaoanalise", ["view", "add", "change"]),
        ("clinico", "requisicaoitem", ["view", "add", "change"]),
        ("clinico", "exame", ["view"]),
        ("clinico", "examemedico", ["view"]),
        ("consultas", "consultamedica", ["view", "add", "change"]),
    ]:
        _grant_group_model_perms(ocupacional, app_label=app_label, model=model, actions=actions)

    # Contabilidade: lancamentos + leitura financeira
    contab = _ensure_group(RBAC_GROUPS["CONTABILIDADE"])
    for app_label, model, actions in [
        ("contabilidade", "conta", ["view", "add", "change"]),
        ("contabilidade", "lancamento", ["view", "add", "change"]),
        ("contabilidade", "movimento", ["view", "add", "change"]),
        ("contabilidade", "conciliacaofinanceira", ["view", "add", "change"]),
        ("faturamento", "fatura", ["view"]),
        ("pagamentos", "pagamento", ["view"]),
        ("pagamentos", "recibo", ["view"]),
    ]:
        _grant_group_model_perms(contab, app_label=app_label, model=model, actions=actions)

    # Recursos Humanos: gestão interna (funcionários, cargos, horários, etc.)
    rh = _ensure_group(RBAC_GROUPS["RECURSOS_HUMANOS"])
    for app_label, model, actions in [
        ("recursos_humanos", "cargo", ["view", "add", "change"]),
        ("recursos_humanos", "funcionario", ["view", "add", "change"]),
        ("recursos_humanos", "horariotrabalho", ["view", "add", "change"]),
        ("recursos_humanos", "falta", ["view", "add", "change"]),
        ("recursos_humanos", "ferias", ["view", "add", "change"]),
        ("recursos_humanos", "dispensa", ["view", "add", "change"]),
        ("recursos_humanos", "horaextra", ["view", "add", "change"]),
        ("recursos_humanos", "folhapagamento", ["view", "add", "change"]),
        # Necessário para vincular Usuario <-> Funcionario no admin.
        ("identidade", "usuario", ["view", "change"]),
    ]:
        _grant_group_model_perms(rh, app_label=app_label, model=model, actions=actions)


class Command(BaseCommand):
    help = "Cria 1 usuario por grupo (RBAC), com senha padrao, para testes e demos."

    def add_arguments(self, parser):
        # Keep consistent with other dev bootstrap flows (entrypoint/bootstrap_dev)
        # and docs which use admin/admin123.
        parser.add_argument("--password", default="admin123")
        parser.add_argument(
            "--reset-password",
            action="store_true",
            help="Se informado, redefine a senha dos usuarios-alvo.",
        )
        parser.add_argument(
            "--no-staff",
            action="store_true",
            help="Nao marca os usuarios como staff (impede login no /admin).",
        )

    @transaction.atomic
    def handle(self, *args, **options):
        password: str = str(options["password"])
        reset_password: bool = bool(options["reset_password"])
        no_staff: bool = bool(options["no_staff"])

        if not settings.DEBUG:
            self.stderr.write(
                "Aviso: este comando e recomendado para desenvolvimento/demos. "
                "Em producao, use credenciais e processos apropriados."
            )

        tenant = _ensure_tenant()

        # Configuração mínima para o agendamento de consultas (choices de especialidade).
        try:
            from decimal import Decimal

            from aplicativos.consultas.modelos.especialidade_consulta import EspecialidadeConsulta

            EspecialidadeConsulta.objects.get_or_create(
                inquilino=tenant,
                nome="Consulta Geral",
                defaults={"preco_base": Decimal("0.00"), "ativo": True},
            )
        except Exception:
            # Não falha bootstrap por causa de app opcional/config.
            pass

        # Ensure groups exist + sane Django admin permissions.
        for name in RBAC_GROUPS.values():
            _ensure_group(name)
        _ensure_groups_permissions()

        role_users: list[_RoleUser] = [
            _RoleUser("admin", "admin@local", "Administrador", RBAC_GROUPS["ADMIN"]),
            _RoleUser("recepcao", "recepcao@local", "Recepcionista", RBAC_GROUPS["RECEPCAO"]),
            _RoleUser("laboratorio", "laboratorio@local", "Tecnico de Laboratorio", RBAC_GROUPS["LABORATORIO"]),
            _RoleUser("enfermagem", "enfermagem@local", "Enfermeiro", RBAC_GROUPS["ENFERMAGEM"]),
            _RoleUser("medico", "medico@local", "Medico", RBAC_GROUPS["MEDICINA"]),
            _RoleUser("farmacia", "farmacia@local", "Tecnico de Farmacia", RBAC_GROUPS["FARMACIA"]),
            _RoleUser("ocupacional", "ocupacional@local", "Medicina Ocupacional", RBAC_GROUPS["MEDICINA_OCUPACIONAL"]),
            _RoleUser("contabilidade", "contabilidade@local", "Contabilidade", RBAC_GROUPS["CONTABILIDADE"]),
            _RoleUser("rh", "rh@local", "Gestor de RH", RBAC_GROUPS["RECURSOS_HUMANOS"]),
        ]

        User = get_user_model()

        created = 0
        updated = 0
        created_usernames: set[str] = set()
        password_reset_usernames: set[str] = set()

        for spec in role_users:
            group = Group.objects.get(name=spec.group_name)
            is_admin_user = spec.group_name == RBAC_GROUPS["ADMIN"]

            user = User.objects.filter(username=spec.username).first()
            if not user:
                user = User.objects.create_user(
                    username=spec.username,
                    email=spec.email,
                    password=password,
                    nome=spec.nome,
                    is_active=True,
                    # Apenas Administrador deve ter acesso ao Django Admin.
                    is_staff=(is_admin_user and not no_staff),
                    inquilino=tenant,
                )
                created += 1
                created_usernames.add(spec.username)
            else:
                # Keep existing email/nome unless empty; avoid breaking real users.
                fields_to_update = []
                if not getattr(user, "email", ""):
                    user.email = spec.email
                    fields_to_update.append("email")
                if not getattr(user, "nome", ""):
                    user.nome = spec.nome
                    fields_to_update.append("nome")

                # Ensure tenant + staff flag for admin login.
                if not getattr(user, "inquilino_id", None):
                    user.inquilino = tenant
                    fields_to_update.append("inquilino")
                # Apenas Administrador deve permanecer staff (acesso /admin).
                desired_staff = is_admin_user and not no_staff
                if getattr(user, "is_staff", False) != desired_staff:
                    user.is_staff = desired_staff
                    fields_to_update.append("is_staff")
                if getattr(user, "is_active", True) is False:
                    user.is_active = True
                    fields_to_update.append("is_active")
                # Evita superuser em contas operacionais/gestores de setor.
                # Administrador mantém (ou vira) superuser para administração completa.
                desired_superuser = is_admin_user
                if getattr(user, "is_superuser", False) != desired_superuser:
                    user.is_superuser = desired_superuser
                    fields_to_update.append("is_superuser")

                if reset_password:
                    user.set_password(password)
                    fields_to_update.append("password")
                    password_reset_usernames.add(spec.username)

                if fields_to_update:
                    user.save(update_fields=fields_to_update)
                    updated += 1

            user.groups.add(group)

        self.stdout.write(f"Tenant: {tenant.id} {tenant.identificador} ({tenant.nome})")
        self.stdout.write(f"Usuarios criados: {created}, atualizados: {updated}")
        self.stdout.write("Credenciais (frontend; /admin apenas Administrador):")
        for spec in role_users:
            if spec.username in created_usernames or spec.username in password_reset_usernames:
                pwd_display = password
            else:
                pwd_display = "(senha nao alterada)"
            self.stdout.write(f"- {spec.group_name}: {spec.username} / {pwd_display}")
