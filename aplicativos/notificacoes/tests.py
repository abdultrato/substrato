from decimal import Decimal
from types import SimpleNamespace
from unittest.mock import patch

from django.core.exceptions import ValidationError
from django.test import SimpleTestCase, TestCase, override_settings

from dominio.clinico.estado_resultado import EstadoResultado
from .modelos.log_envio import LogEnvio
from .modelos.notificacao import Notificacao
from .servicos import ServicoNotificacao
from . import sinais


class CanalFalso:
    def enviar(self, destino, mensagem, assunto=None, **kwargs):
        return {
            "destino": destino,
            "mensagem": mensagem,
            "assunto": assunto,
        }


class NotificacoesDadosIncompletosTests(TestCase):
    def test_notificacao_com_apenas_destinatario_falha(self):
        notificacao = Notificacao(destinatario="user@example.com")

        with self.assertRaises(ValidationError):
            notificacao.full_clean()

    def test_notificacao_completa_salva_com_sucesso(self):
        notificacao = Notificacao(
            destinatario="user@example.com",
            canal=Notificacao.Canal.EMAIL,
            mensagem="Teste de notificação",
        )

        notificacao.full_clean()
        notificacao.save()

        self.assertIsNotNone(notificacao.pk)

    def test_log_envio_com_apenas_status_falha(self):
        log = LogEnvio(status="erro")

        with self.assertRaises(ValidationError):
            log.full_clean()


class ServicoNotificacaoTests(TestCase):
    @override_settings(
        NOTIFICACOES_EMAIL_ATIVAS=True,
        NOTIFICACOES_SMS_ATIVAS=True,
        SMS_API_URL="https://sms.exemplo.test/send",
        SMS_API_KEY="token-sms",
    )
    def test_enviar_para_paciente_email_e_sms(self):
        paciente = SimpleNamespace(
            email="paciente@example.com",
            contacto="+258840000001",
        )
        servico = ServicoNotificacao()

        with patch.dict(
            "aplicativos.notificacoes.servicos.CANAIS",
            {
                Notificacao.Canal.EMAIL: CanalFalso(),
                Notificacao.Canal.SMS: CanalFalso(),
            },
            clear=True,
        ):
            notificacoes = servico.enviar_para_paciente(
                paciente=paciente,
                assunto="Resultado disponível",
                mensagem="Seu resultado está pronto.",
                tipo_evento=Notificacao.TipoEvento.RESULTADO_DISPONIVEL,
                referencia_externa="resultado:1:validado",
            )

        self.assertEqual(len(notificacoes), 2)
        self.assertEqual(Notificacao.objects.count(), 2)
        self.assertSetEqual(
            set(Notificacao.objects.values_list("canal", flat=True)),
            {Notificacao.Canal.EMAIL, Notificacao.Canal.SMS},
        )

    def test_enviar_para_paciente_sem_contactos(self):
        paciente = SimpleNamespace(email="", contacto="")

        notificacoes = ServicoNotificacao().enviar_para_paciente(
            paciente=paciente,
            assunto="Aviso",
            mensagem="Mensagem",
        )

        self.assertEqual(notificacoes, [])
        self.assertEqual(Notificacao.objects.count(), 0)

    @override_settings(NOTIFICACOES_EMAIL_ATIVAS=True)
    def test_deduplicacao_por_referencia_externa(self):
        servico = ServicoNotificacao()

        with patch.dict(
            "aplicativos.notificacoes.servicos.CANAIS",
            {Notificacao.Canal.EMAIL: CanalFalso()},
            clear=True,
        ):
            primeira = servico.enviar(
                destino="paciente@example.com",
                mensagem="Fatura emitida",
                canal=Notificacao.Canal.EMAIL,
                assunto="Fatura",
                tipo_evento=Notificacao.TipoEvento.FATURA_EMITIDA,
                referencia_externa="fatura:10:emitida",
            )
            segunda = servico.enviar(
                destino="paciente@example.com",
                mensagem="Fatura emitida",
                canal=Notificacao.Canal.EMAIL,
                assunto="Fatura",
                tipo_evento=Notificacao.TipoEvento.FATURA_EMITIDA,
                referencia_externa="fatura:10:emitida",
            )

        self.assertEqual(primeira.pk, segunda.pk)
        self.assertEqual(Notificacao.objects.count(), 1)


class NotificacaoSinaisTests(SimpleTestCase):
    @patch("aplicativos.notificacoes.sinais.ServicoNotificacao")
    def test_notificar_resultado_quando_todos_itens_estao_validados(self, servico_cls):
        paciente = SimpleNamespace(email="paciente@example.com", contacto="+2588400")
        itens = SimpleNamespace()
        itens.exclude = lambda **kwargs: SimpleNamespace(exists=lambda: False)
        requisicao = SimpleNamespace(id_custom="REQ-1", paciente=paciente)
        resultado = SimpleNamespace(
            id=5,
            id_custom="RESG-5",
            requisicao=requisicao,
            requisicao_id=1,
            itens=itens,
        )
        instance = SimpleNamespace(
            estado=EstadoResultado.VALIDADO,
            resultado=resultado,
            resultado_id=5,
        )

        sinais.notificar_resultado(sender=None, instance=instance, created=False)

        servico_cls.return_value.enviar_para_paciente.assert_called_once()
        kwargs = servico_cls.return_value.enviar_para_paciente.call_args.kwargs
        self.assertEqual(
            kwargs["tipo_evento"],
            Notificacao.TipoEvento.RESULTADO_DISPONIVEL,
        )
        self.assertEqual(kwargs["referencia_externa"], "resultado:5:validado")

    @patch("aplicativos.notificacoes.sinais.ServicoNotificacao")
    def test_notificar_resultado_nao_envia_se_ainda_ha_itens_pendentes(self, servico_cls):
        paciente = SimpleNamespace(email="paciente@example.com", contacto="+2588400")
        itens = SimpleNamespace()
        itens.exclude = lambda **kwargs: SimpleNamespace(exists=lambda: True)
        requisicao = SimpleNamespace(id_custom="REQ-1", paciente=paciente)
        resultado = SimpleNamespace(
            id=5,
            id_custom="RESG-5",
            requisicao=requisicao,
            itens=itens,
        )
        instance = SimpleNamespace(
            estado=EstadoResultado.VALIDADO,
            resultado=resultado,
            resultado_id=5,
        )

        sinais.notificar_resultado(sender=None, instance=instance, created=False)
        servico_cls.return_value.enviar_para_paciente.assert_not_called()

    @patch("aplicativos.notificacoes.sinais.ServicoNotificacao")
    def test_notificar_fatura_emitida(self, servico_cls):
        paciente = SimpleNamespace(email="paciente@example.com", contacto="+2588400")
        fatura = SimpleNamespace(
            pk=3,
            id_custom="FAT-3",
            estado="EMIT",
            total=Decimal("1200.00"),
            paciente=paciente,
            origem="CLI",
            requisicao=None,
            procedimento=None,
        )

        sinais.notificar_fatura_emitida(sender=None, instance=fatura, created=False)

        servico_cls.return_value.enviar_para_paciente.assert_called_once()
        kwargs = servico_cls.return_value.enviar_para_paciente.call_args.kwargs
        self.assertEqual(kwargs["tipo_evento"], Notificacao.TipoEvento.FATURA_EMITIDA)
        self.assertEqual(kwargs["referencia_externa"], "fatura:3:emitida")

    @patch("aplicativos.notificacoes.sinais.ServicoNotificacao")
    def test_notificar_recibo_criado(self, servico_cls):
        paciente = SimpleNamespace(email="paciente@example.com", contacto="+2588400")
        fatura = SimpleNamespace(
            pk=11,
            id_custom="FAT-11",
            paciente=paciente,
            origem="CLI",
            requisicao=None,
            procedimento=None,
        )
        recibo = SimpleNamespace(
            pk=8,
            numero="REC-8",
            valor=Decimal("1200.00"),
            fatura=fatura,
            fatura_id=11,
        )

        sinais.notificar_recibo_gerado(sender=None, instance=recibo, created=True)

        servico_cls.return_value.enviar_para_paciente.assert_called_once()
        kwargs = servico_cls.return_value.enviar_para_paciente.call_args.kwargs
        self.assertEqual(kwargs["tipo_evento"], Notificacao.TipoEvento.RECIBO_GERADO)
        self.assertEqual(kwargs["referencia_externa"], "recibo:8:gerado")
