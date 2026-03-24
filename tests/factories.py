"""
Factories para testes usando factory-boy
"""

from django.contrib.auth import get_user_model
import factory
from faker import Faker
import pytest

from apps.clinical.models.lab_exam import LabExam
from apps.clinical.models.patient import Patient
from apps.tenants.models.tenant import Tenant

User = get_user_model()

fake = Faker(["pt_BR"])


# ============================================================================
# AUTH & PERMISSIONS
# ============================================================================


class UserFactory(factory.django.DjangoModelFactory):
    """Factory para criar usuários de teste"""

    class Meta:
        model = User

    username = factory.Sequence(lambda n: f"user_{n}")
    email = factory.Faker("email")
    first_name = factory.Faker("first_name")
    last_name = factory.Faker("last_name")
    nome = factory.Faker("name")
    is_active = True
    is_staff = False
    is_superuser = False

    @factory.post_generation
    def password(obj, create, extracted, **kwargs):
        """Define a senha após criação"""
        if not create:
            return
        obj.set_password(extracted or "testpass123")
        obj.save()


class AdminUserFactory(UserFactory):
    """Factory para criar usuários admin"""

    is_staff = True
    is_superuser = True
    username = factory.Sequence(lambda n: f"admin_{n}")

    @factory.post_generation
    def groups(obj, create, extracted, **kwargs):
        """
        O projeto trata superuser como exceção controlada por allowlist/grupo.
        Para garantir que o usuário de teste permaneça admin, colocamos no grupo
        RBAC "Administrador" (isso também exercita os sinais de promoção).
        """
        if not create:
            return
        from django.contrib.auth.models import Group

        group, _ = Group.objects.get_or_create(name="Administrador")
        obj.groups.add(group)


# ============================================================================
# MULTI-TENANT
# ============================================================================


class TenantFactory(factory.django.DjangoModelFactory):
    """Factory para criar tenants"""

    class Meta:
        model = Tenant

    nome = factory.Faker("company")
    identificador = factory.Faker("slug")
    dominio = factory.Faker("domain_name")
    ativo = True


# ============================================================================
# CLINICAL
# ============================================================================


class PatientFactory(factory.django.DjangoModelFactory):
    """Factory para criar pacientes"""

    class Meta:
        model = Patient

    nome = factory.Faker("name")
    email = factory.Faker("email")
    data_nascimento = factory.Faker("date_of_birth")
    contacto = factory.LazyFunction(lambda: fake.phone_number())
    genero = factory.Faker("word", word_list=["Masculino", "Femenino"])
    endereco_rua = factory.LazyFunction(lambda: fake.street_name())
    endereco_cidade = factory.LazyFunction(lambda: fake.city())
    ativo = True

    @classmethod
    def _create(cls, model_class, *args, **kwargs):
        """Override para adicionar tenant automaticamente"""
        if "inquilino" not in kwargs:
            kwargs["inquilino"] = TenantFactory()
        return super()._create(model_class, *args, **kwargs)


class ExamFactory(factory.django.DjangoModelFactory):
    """Factory para criar exames"""

    class Meta:
        model = LabExam

    nome = factory.Faker("word")
    preco = factory.Faker("pyfloat", left_digits=3, right_digits=2, positive=True)
    metodo = factory.Faker("word", word_list=["ELISA", "PCR", "Colorimetrico"])
    setor = factory.Faker("word")
    paciente = factory.SubFactory(PatientFactory)

    @classmethod
    def _create(cls, model_class, *args, **kwargs):
        """Override para adicionar tenant automaticamente"""
        if "inquilino" not in kwargs:
            kwargs["inquilino"] = kwargs.get("paciente").inquilino
        return super()._create(model_class, *args, **kwargs)


# ============================================================================
# BATCH FACTORIES (para criar múltiplos objetos)
# ============================================================================


class BatchFactory:
    """Cria múltiplos objetos para testes"""

    @staticmethod
    def create_tenant_with_users(num_usuarios=3):
        """Cria um tenant com N usuários"""
        tenant = TenantFactory()
        usuarios = [UserFactory(password="test123") for _ in range(num_usuarios)]
        tenant.users.set(usuarios)
        return tenant, usuarios

    @staticmethod
    def create_patients_with_exams(num_pacientes=5, exames_por_paciente=3):
        """Cria pacientes com exames"""
        tenant = TenantFactory()
        pacientes = []
        exames = []

        for _ in range(num_pacientes):
            paciente = PatientFactory(inquilino=tenant)
            pacientes.append(paciente)

            for _ in range(exames_por_paciente):
                exame = ExamFactory(paciente=paciente, inquilino=tenant)
                exames.append(exame)

        return tenant, pacientes, exames


InquilinoFactory = TenantFactory
PacienteFactory = PatientFactory
ExameFactory = ExamFactory
BatchFactory.criar_tenant_com_usuarios = staticmethod(BatchFactory.create_tenant_with_users)
BatchFactory.criar_pacientes_com_exames = staticmethod(BatchFactory.create_patients_with_exams)


# ============================================================================
# PYTEST FIXTURES (integração com pytest)
# ============================================================================


@pytest.fixture
def user():
    """Cria um usuário de teste"""
    return UserFactory(password="testpass123")


@pytest.fixture
def admin_user():
    """Cria um usuário admin"""
    return AdminUserFactory(password="adminpass123")


@pytest.fixture
def tenant():
    """Cria um tenant"""
    return TenantFactory()


@pytest.fixture
def tenant_with_users(tenant):
    """Cria um tenant com usuários"""
    users = [UserFactory() for _ in range(3)]
    tenant.users.set(users)
    return tenant, users


@pytest.fixture(name="patient")
def patient_fixture(tenant):
    """Cria um paciente"""
    return PatientFactory(inquilino=tenant)


@pytest.fixture(name="paciente")
def legacy_patient_fixture(tenant):
    return PatientFactory(inquilino=tenant)


@pytest.fixture(name="exam")
def exam_fixture(patient):
    """Cria um exame"""
    return ExamFactory(paciente=patient, inquilino=patient.inquilino)


@pytest.fixture(name="exame")
def legacy_exam_fixture(paciente):
    return ExamFactory(paciente=paciente, inquilino=paciente.inquilino)


@pytest.fixture(name="patients_batch")
def patients_batch_fixture(tenant):
    """Cria múltiplos pacientes"""
    return [PatientFactory(inquilino=tenant) for _ in range(5)]


@pytest.fixture(name="pacientes_batch")
def legacy_patients_batch_fixture(tenant):
    return [PatientFactory(inquilino=tenant) for _ in range(5)]
