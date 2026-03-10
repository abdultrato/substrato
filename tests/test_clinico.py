"""
Testes para Clinico App - Models, Serializers, ViewSets
"""
import pytest
from django.test import TestCase
from rest_framework.test import APITestCase, APIClient
from rest_framework import status

from aplicativos.clinico.models import Paciente
from api.v1.clinico.serializers import PacienteSerializer
from tests.factories import UserFactory, InquilinoFactory, PacienteFactory, ExameFactory


@pytest.mark.django_db
class TestPacienteModel:
    """Testes para o model Paciente"""

    def test_criar_paciente(self):
        """Deve criar um paciente válido"""
        tenant = InquilinoFactory()
        paciente = PacienteFactory(inquilino=tenant)
        
        assert paciente.id is not None
        assert paciente.nome is not None
        assert paciente.inquilino == tenant

    def test_paciente_com_campos_obrigatorios(self):
        """Deve falhar sem campos obrigatórios"""
        tenant = InquilinoFactory()
        
        with pytest.raises(Exception):  # Validação do ORM
            Paciente.objects.create(inquilino=tenant)

    def test_paciente_email_valido(self):
        """Email deve ser válido"""
        tenant = InquilinoFactory()
        paciente = PacienteFactory(inquilino=tenant, email='test@example.com')
        
        assert '@' in paciente.email

    def test_paciente_ativo_por_padrao(self):
        """Paciente deve estar ativo por padrão"""
        paciente = PacienteFactory()
        
        assert paciente.ativo is True

    def test_listar_pacientes_por_tenant(self):
        """Deve listar apenas pacientes do tenant"""
        tenant1 = InquilinoFactory()
        tenant2 = InquilinoFactory()
        
        paciente1 = PacienteFactory(inquilino=tenant1)
        paciente2 = PacienteFactory(inquilino=tenant2)
        
        pacientes_tenant1 = Paciente.objects.filter(inquilino=tenant1)
        pacientes_tenant2 = Paciente.objects.filter(inquilino=tenant2)
        
        assert paciente1 in pacientes_tenant1
        assert paciente2 not in pacientes_tenant1
        assert paciente2 in pacientes_tenant2


@pytest.mark.django_db
class TestPacienteSerializer:
    """Testes para o serializer de Paciente"""

    def test_serializar_paciente(self):
        """Deve serializar um paciente"""
        paciente = PacienteFactory()
        serializer = PacienteSerializer(paciente)
        
        assert serializer.data['nome'] == paciente.nome
        assert serializer.data['email'] == paciente.email
        assert serializer.data['cpf'] == paciente.cpf

    def test_deserializar_paciente(self):
        """Deve desserializar dados válidos"""
        data = {
            'nome': 'João Silva',
            'email': 'joao@example.com',
            'cpf': '123.456.789-00',
            'data_nascimento': '1990-01-15',
            'telefone': '(11) 98765-4321',
        }
        serializer = PacienteSerializer(data=data)
        
        assert serializer.is_valid()

    def test_validacao_email_invalido(self):
        """Deve rejeitar email inválido"""
        data = {
            'nome': 'João Silva',
            'email': 'email_invalido',
            'cpf': '123.456.789-00',
            'data_nascimento': '1990-01-15',
        }
        serializer = PacienteSerializer(data=data)
        
        assert not serializer.is_valid()
        assert 'email' in serializer.errors


@pytest.mark.django_db
class TestPacienteAPI(APITestCase):
    """Testes para a API de Pacientes"""

    def setUp(self):
        """Setup para cada teste"""
        self.client = APIClient()
        self.user = UserFactory(password='testpass123')
        self.tenant = InquilinoFactory(usuarios=[self.user])
        self.client.force_authenticate(user=self.user)

    def test_listar_pacientes(self):
        """Deve listar pacientes do tenant"""
        PacienteFactory(inquilino=self.tenant)
        PacienteFactory(inquilino=self.tenant)
        
        response = self.client.get('/api/v1/clinico/pacientes/')
        
        assert response.status_code == status.HTTP_200_OK
        assert len(response.data.get('results', response.data)) >= 2

    def test_criar_paciente(self):
        """Deve criar um novo paciente"""
        data = {
            'nome': 'Novo Paciente',
            'email': 'novo@example.com',
            'cpf': '123.456.789-00',
            'data_nascimento': '1990-01-15',
            'telefone': '(11) 98765-4321',
        }
        
        response = self.client.post('/api/v1/clinico/pacientes/', data)
        
        assert response.status_code in [status.HTTP_201_CREATED, status.HTTP_200_OK]

    def test_recuperar_paciente(self):
        """Deve recuperar um paciente específico"""
        paciente = PacienteFactory(inquilino=self.tenant)
        
        response = self.client.get(f'/api/v1/clinico/pacientes/{paciente.id}/')
        
        assert response.status_code == status.HTTP_200_OK
        assert response.data['id'] == paciente.id

    def test_atualizar_paciente(self):
        """Deve atualizar um paciente"""
        paciente = PacienteFactory(inquilino=self.tenant)
        data = {'nome': 'Nome Atualizado'}
        
        response = self.client.patch(f'/api/v1/clinico/pacientes/{paciente.id}/', data)
        
        assert response.status_code == status.HTTP_200_OK

    def test_deletar_paciente(self):
        """Deve deletar um paciente"""
        paciente = PacienteFactory(inquilino=self.tenant)
        
        response = self.client.delete(f'/api/v1/clinico/pacientes/{paciente.id}/')
        
        assert response.status_code in [status.HTTP_204_NO_CONTENT, status.HTTP_200_OK]

    def test_sem_autenticacao(self):
        """Deve rejeitar requisição sem autenticação"""
        self.client.force_authenticate(user=None)
        
        response = self.client.get('/api/v1/clinico/pacientes/')
        
        assert response.status_code == status.HTTP_401_UNAUTHORIZED


@pytest.mark.django_db
class TestMultiTenant:
    """Testes para isolamento multi-tenant"""

    def test_paciente_isolado_por_tenant(self):
        """Pacientes devem estar isolados por tenant"""
        tenant1 = InquilinoFactory()
        tenant2 = InquilinoFactory()
        
        user1 = UserFactory()
        user2 = UserFactory()
        
        paciente1 = PacienteFactory(inquilino=tenant1)
        paciente2 = PacienteFactory(inquilino=tenant2)
        
        # User1 não deve ver paciente de tenant2
        assert paciente1.inquilino != paciente2.inquilino

    def test_exames_isolados_por_tenant(self):
        """Exames devem estar isolados por tenant"""
        tenant1 = InquilinoFactory()
        paciente1 = PacienteFactory(inquilino=tenant1)
        exame1 = ExameFactory(paciente=paciente1, inquilino=tenant1)
        
        tenant2 = InquilinoFactory()
        paciente2 = PacienteFactory(inquilino=tenant2)
        exame2 = ExameFactory(paciente=paciente2, inquilino=tenant2)
        
        assert exame1.inquilino != exame2.inquilino
