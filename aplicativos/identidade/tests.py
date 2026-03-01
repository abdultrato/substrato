from django.core.exceptions import ValidationError
from django.test import TestCase

from aplicativos.identidade.modelos.perfil import PerfilProfissional
from aplicativos.identidade.modelos.usuario import Usuario


class IdentidadeDadosIncompletosTests(TestCase):
    def test_usuario_sem_email_falha(self):
        with self.assertRaises(ValueError):
            Usuario.objects.create_user(email="", password="123456")

    def test_usuario_completo_cria_com_sucesso(self):
        usuario = Usuario.objects.create_user(
            email="user@example.com",
            password="senha-forte-123",
            first_name="Ana",
            last_name="Silva",
        )

        self.assertIsNotNone(usuario.pk)
        self.assertTrue(usuario.check_password("senha-forte-123"))

    def test_perfil_com_apenas_cargo_falha_na_validacao(self):
        perfil = PerfilProfissional(cargo="Analista")

        with self.assertRaises(ValidationError):
            perfil.full_clean()
