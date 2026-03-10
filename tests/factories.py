"""
Factories para testes usando factory-boy
"""
import factory
from faker import Faker
from django.contrib.auth.models import User
from django.utils import timezone

from aplicativos.inquilinos.models import Inquilino
from aplicativos.identidade.models import Permissao, Papel
from aplicativos.clinico.models import Paciente, Exame

fake = Faker(['pt_BR'])


# ============================================================================
# AUTH & PERMISSIONS
# ============================================================================

class UserFactory(factory.django.DjangoModelFactory):
    """Factory para criar usuários de teste"""
    class Meta:
        model = User

    username = factory.Sequence(lambda n: f'user_{n}')
    email = factory.Faker('email')
    first_name = factory.Faker('first_name')
    last_name = factory.Faker('last_name')
    is_active = True
    is_staff = False
    is_superuser = False

    @factory.post_generation
    def password(obj, create, extracted, **kwargs):
        """Define a senha após criação"""
        if not create:
            return
        obj.set_password(extracted or 'testpass123')
        obj.save()


class AdminUserFactory(UserFactory):
    """Factory para criar usuários admin"""
    is_staff = True
    is_superuser = True
    username = factory.Sequence(lambda n: f'admin_{n}')


# ============================================================================
# MULTI-TENANT
# ============================================================================

class InquilinoFactory(factory.django.DjangoModelFactory):
    """Factory para criar tenants"""
    class Meta:
        model = Inquilino

    nome = factory.Faker('company')
    slug = factory.Faker('slug')
    ativo = True
    data_criacao = factory.LazyFunction(timezone.now)

    @factory.post_generation
    def usuarios(obj, create, extracted, **kwargs):
        """Associar usuários após criação"""
        if not create:
            return
        if extracted:
            for user in extracted:
                obj.usuarios.add(user)


# ============================================================================
# CLINICAL
# ============================================================================

class PacienteFactory(factory.django.DjangoModelFactory):
    """Factory para criar pacientes"""
    class Meta:
        model = Paciente

    nome = factory.Faker('name')
    email = factory.Faker('email')
    cpf = factory.LazyFunction(lambda: fake.cpf())
    data_nascimento = factory.Faker('date_of_birth')
    telefone = factory.LazyFunction(lambda: fake.phone_number())
    genero = factory.Faker('word', word_list=['M', 'F', 'O'])
    ativo = True

    @classmethod
    def _create(cls, model_class, *args, **kwargs):
        """Override para adicionar tenant automaticamente"""
        if 'inquilino' not in kwargs:
            kwargs['inquilino'] = InquilinoFactory()
        return super()._create(model_class, *args, **kwargs)


class ExameFactory(factory.django.DjangoModelFactory):
    """Factory para criar exames"""
    class Meta:
        model = Exame

    paciente = factory.SubFactory(PacienteFactory)
    tipo = factory.Faker('word', word_list=['Sangue', 'Urina', 'Raio-X'])
    descricao = factory.Faker('text', max_nb_chars=200)
    data_solicitacao = factory.LazyFunction(timezone.now)
    status = factory.Faker('word', word_list=['Pendente', 'Realizado', 'Cancelado'])

    @classmethod
    def _create(cls, model_class, *args, **kwargs):
        """Override para adicionar tenant automaticamente"""
        if 'inquilino' not in kwargs:
            kwargs['inquilino'] = kwargs.get('paciente').inquilino
        return super()._create(model_class, *args, **kwargs)


# ============================================================================
# BATCH FACTORIES (para criar múltiplos objetos)
# ============================================================================

class BatchFactory:
    """Cria múltiplos objetos para testes"""

    @staticmethod
    def criar_tenant_com_usuarios(num_usuarios=3):
        """Cria um tenant com N usuários"""
        tenant = InquilinoFactory()
        usuarios = [UserFactory(password='test123') for _ in range(num_usuarios)]
        tenant.usuarios.set(usuarios)
        return tenant, usuarios

    @staticmethod
    def criar_pacientes_com_exames(num_pacientes=5, exames_por_paciente=3):
        """Cria pacientes com exames"""
        tenant = InquilinoFactory()
        pacientes = []
        exames = []

        for _ in range(num_pacientes):
            paciente = PacienteFactory(inquilino=tenant)
            pacientes.append(paciente)

            for _ in range(exames_por_paciente):
                exame = ExameFactory(paciente=paciente, inquilino=tenant)
                exames.append(exame)

        return tenant, pacientes, exames


# ============================================================================
# PYTEST FIXTURES (integração com pytest)
# ============================================================================

import pytest


@pytest.fixture
def user():
    """Cria um usuário de teste"""
    return UserFactory(password='testpass123')


@pytest.fixture
def admin_user():
    """Cria um usuário admin"""
    return AdminUserFactory(password='adminpass123')


@pytest.fixture
def tenant():
    """Cria um tenant"""
    return InquilinoFactory()


@pytest.fixture
def tenant_with_users(tenant):
    """Cria um tenant com usuários"""
    users = [UserFactory() for _ in range(3)]
    tenant.usuarios.set(users)
    return tenant, users


@pytest.fixture
def paciente(tenant):
    """Cria um paciente"""
    return PacienteFactory(inquilino=tenant)


@pytest.fixture
def exame(paciente):
    """Cria um exame"""
    return ExameFactory(paciente=paciente, inquilino=paciente.inquilino)


@pytest.fixture
def pacientes_batch(tenant):
    """Cria múltiplos pacientes"""
    return [PacienteFactory(inquilino=tenant) for _ in range(5)]
