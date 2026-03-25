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
    name = factory.Faker("name")
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

    name = factory.Faker("company")
    identifier = factory.Faker("slug")
    domain = factory.Faker("domain_name")
    active = True


# ============================================================================
# CLINICAL
# ============================================================================


class PatientFactory(factory.django.DjangoModelFactory):
    """Factory para criar pacientes"""

    class Meta:
        model = Patient

    name = factory.Faker("name")
    email = factory.Faker("email")
    birth_date = factory.Faker("date_of_birth")
    contact = factory.LazyFunction(lambda: fake.phone_number())
    gender = factory.Faker("word", word_list=["Masculino", "Femenino"])
    address_street = factory.LazyFunction(lambda: fake.street_name())
    address_city = factory.LazyFunction(lambda: fake.city())
    active = True

    @classmethod
    def _create(cls, model_class, *args, **kwargs):
        """Override para adicionar tenant automaticamente"""
        if "tenant" not in kwargs:
            kwargs["tenant"] = TenantFactory()
        return super()._create(model_class, *args, **kwargs)


class ExamFactory(factory.django.DjangoModelFactory):
    """Factory para criar exams"""

    class Meta:
        model = LabExam

    name = factory.Faker("word")
    price = factory.Faker("pyfloat", left_digits=3, right_digits=2, positive=True)
    method = factory.Faker("word", word_list=["ELISA", "PCR", "Colorimetrico"])
    sector = factory.Faker("word")
    patient = factory.SubFactory(PatientFactory)

    @classmethod
    def _create(cls, model_class, *args, **kwargs):
        """Override para adicionar tenant automaticamente"""
        if "tenant" not in kwargs:
            kwargs["tenant"] = kwargs.get("patient").tenant
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
    def create_patients_with_exams(num_pacientes=5, exams_por_patient=3):
        """Cria pacientes com exams"""
        tenant = TenantFactory()
        pacientes = []
        exams = []

        for _ in range(num_pacientes):
            patient = PatientFactory(tenant=tenant)
            pacientes.append(patient)

            for _ in range(exams_por_patient):
                exam = ExamFactory(patient=patient, tenant=tenant)
                exams.append(exam)

        return tenant, pacientes, exams


InquilinoFactory = TenantFactory
PacienteFactory = PatientFactory
ExameFactory = ExamFactory
BatchFactory.criar_tenant_com_usuarios = staticmethod(BatchFactory.create_tenant_with_users)
BatchFactory.criar_pacientes_com_exams = staticmethod(BatchFactory.create_patients_with_exams)


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
    """Cria um patient"""
    return PatientFactory(tenant=tenant)


@pytest.fixture(name="patient")
def legacy_patient_fixture(tenant):
    return PatientFactory(tenant=tenant)


@pytest.fixture(name="exam")
def exam_fixture(patient):
    """Cria um exam"""
    return ExamFactory(patient=patient, tenant=patient.tenant)


@pytest.fixture(name="exam")
def legacy_exam_fixture(patient):
    return ExamFactory(patient=patient, tenant=patient.tenant)


@pytest.fixture(name="patients_batch")
def patients_batch_fixture(tenant):
    """Cria múltiplos pacientes"""
    return [PatientFactory(tenant=tenant) for _ in range(5)]


@pytest.fixture(name="pacientes_batch")
def legacy_patients_batch_fixture(tenant):
    return [PatientFactory(tenant=tenant) for _ in range(5)]
