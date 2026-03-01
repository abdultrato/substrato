from django.core.exceptions import ValidationError
from django.test import TestCase

from aplicativos.notificacoes.modelos.log_envio import LogEnvio
from aplicativos.notificacoes.modelos.notificacao import Notificacao


class NotificacoesDadosIncompletosTests(TestCase):
    def test_notificacao_com_apenas_destinatario_falha(self):
        notificacao = Notificacao(destinatario="user@example.com")

        with self.assertRaises(ValidationError):
            notificacao.full_clean()

    def test_notificacao_completa_salva_com_sucesso(self):
        notificacao = Notificacao(
            destinatario="user@example.com",
            canal="email",
            mensagem="Teste de notificação",
        )

        notificacao.full_clean()
        notificacao.save()

        self.assertIsNotNone(notificacao.pk)

    def test_log_envio_com_apenas_status_falha(self):
        log = LogEnvio(status="erro")

        with self.assertRaises(ValidationError):
            log.full_clean()
